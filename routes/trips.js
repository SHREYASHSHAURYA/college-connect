const express = require("express");
const Trip = require("../models/Trip");
const User = require("../models/User");
const Notification = require("../models/Notification"); // 🔔 ADDED
const auth = require("../middleware/auth");
const requireVerified = require("../middleware/requireVerified");

const router = express.Router();

/* CREATE TRIP */
router.get("/create-trip", auth, requireVerified, async (req, res) => {
  const { from, to, dateTime, validTill, passengerLimit } = req.query;
  if (!from || !to || !dateTime || !passengerLimit)
    return res.send("Missing params");

  const tripTime = new Date(dateTime);

  // ❌ Block past trips
  if (tripTime < new Date()) {
    return res.send("Cannot create trip in the past");
  }

  // ⏳ Default validity = +24h
  const vt = validTill
    ? new Date(validTill)
    : new Date(tripTime.getTime() + 24 * 60 * 60 * 1000);

  const user = await User.findById(req.user.id);
  if (!user) return res.send("User not found");

  if (Number(passengerLimit) < 1)
    return res.send("Invalid passenger limit");

  const trip = new Trip({
    from,
    to,
    dateTime: tripTime,
    validTill: vt,
    passengerLimit: Number(passengerLimit),
    creator: user._id,
    college: user.college,
    passengers: [user._id],
    pendingRequests: []
  });

  await trip.save();

  /* 🔔 NOTIFICATION — TRIP CREATED (OPTIONAL BUT SAFE) 
  await Notification.create({
    user: user._id,
    type: "trip",
    text: `Trip created: ${from} → ${to}`,
    link: "/trips.html"
  });*/

  res.send("TRIP CREATED");
});

/* LIST TRIPS */
/* LIST TRIPS (FRIENDS FIRST) */
router.get("/trips", auth, async (req, res) => {
  // 🧹 HARD DELETE trips created by banned users
  const bannedUsers = await User.find({ isBanned: true }).select("_id");
  const bannedIds = bannedUsers.map(u => u._id);

  await Trip.deleteMany({
    creator: { $in: bannedIds }
  });
  const { from, to } = req.query;
  const now = new Date();

  const me = await User.findById(req.user.id)
    .select("friends college blockedUsers");

  if (!me) return res.json([]);

  const blockedIds = me.blockedUsers.map(id => id.toString());
  const friendIds = me.friends.map(id => id.toString());

  const filter = {
  validTill: { $gt: now },
  creator: { $nin: blockedIds }
};

if (!["moderator", "admin"].includes(req.user.role)) {
  filter.college = me.college;
}


  if (from) filter.from = new RegExp(from, "i");
  if (to) filter.to = new RegExp(to, "i");

  const trips = await Trip.find(filter)
  .populate("creator", "name email profilePic blockedUsers isBanned")
  .populate("passengers", "name email isBanned")
  .populate("pendingRequests", "name email isBanned")
  .sort({ dateTime: -1 });

  const DAY = 24 * 60 * 60 * 1000;
  const nowTs = Date.now();

  const recentFriendTrips = [];
  const remainingTrips = [];

  trips.forEach(trip => {
    // ❌ Skip if creator is banned (extra safety)
    if (trip.creator?.isBanned) {
      return;
    }

    // ❌ Remove banned users from trip
    trip.passengers = trip.passengers.filter(p => !p.isBanned);
    trip.pendingRequests = trip.pendingRequests.filter(p => !p.isBanned);
    trip.markModified("passengers");
trip.markModified("pendingRequests");
    // ❌ creator blocked me
    if (
      trip.creator.blockedUsers &&
      trip.creator.blockedUsers.some(id =>
        id.toString() === me._id.toString()
      )
    ) {
      return;
    }

    const isFriend = friendIds.includes(trip.creator._id.toString());
    const isRecent =
      nowTs - new Date(trip.createdAt || trip.dateTime).getTime() <= DAY;

    if (isFriend && isRecent) {
      recentFriendTrips.push(trip);
    } else {
      remainingTrips.push(trip);
    }
  });
await Promise.all(trips.map(t => t.save()));
  res.json([...recentFriendTrips, ...remainingTrips]);
});
/* REQUEST TO JOIN */
router.get("/request-join-trip", auth, requireVerified, async (req, res) => {
  const { tripId } = req.query;
  const trip = await Trip.findById(tripId);
  if (!trip) return res.send("Trip not found");

  // ❌ Full trip
  if (trip.passengers.length >= trip.passengerLimit)
    return res.send("Trip full");

  if (
    trip.passengers.some(id => id.equals(req.user.id)) ||
    trip.pendingRequests.some(id => id.equals(req.user.id))
  ) return res.send("Already requested or joined");

  trip.pendingRequests.push(req.user.id);
  await trip.save();

  /* 🔔 NOTIFICATION — JOIN REQUEST */
  await Notification.create({
    user: trip.creator,
    type: "trip",
    text: `New join request for ${trip.from} → ${trip.to}`,
    link: `/trips.html#trip=${trip._id}`
  });

  res.send("REQUEST SENT");
});

/* APPROVE REQUEST */
router.get("/approve-trip-request", auth, requireVerified, async (req, res) => {
  const { tripId, userId } = req.query;

  const trip = await Trip.findById(tripId);
  if (!trip) return res.send("Trip not found");

  if (!trip.creator.equals(req.user.id))
    return res.send("Not authorized");

  // ❌ Full trip
  if (trip.passengers.length >= trip.passengerLimit)
    return res.send("Trip full");

  trip.pendingRequests = trip.pendingRequests.filter(
    id => !id.equals(userId)
  );

  trip.passengers.push(userId);
  await trip.save();

  /* 🔔 NOTIFICATION — REQUEST APPROVED */
  await Notification.create({
    user: userId,
    type: "trip",
    text: `Your request for ${trip.from} → ${trip.to} was approved`,
    link: `/trips.html#trip=${trip._id}`
  });

  res.send("REQUEST APPROVED");
});

/* DELETE TRIP */
router.get("/delete-trip", auth, async (req, res) => {
  const { tripId } = req.query;

  const trip = await Trip.findById(tripId);
  if (!trip) return res.send("Trip not found");

  if (!trip.creator.equals(req.user.id))
    return res.send("Not authorized");

  await Trip.deleteOne({ _id: tripId });

  /* 🔔 NOTIFICATION — TRIP DELETED 
  await Notification.create({
    user: req.user.id,
    type: "trip",
    text: `Trip ${trip.from} → ${trip.to} deleted`,
    link: "/trips.html"
  });*/

  res.send("TRIP DELETED");
});

module.exports = router;



