const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");
const Notification = require("../models/Notification");
const requireVerified = require("../middleware/requireVerified");

const router = express.Router();

/*
SEND FRIEND REQUEST
/send-request?toEmail=EMAIL
*/
router.get("/send-request", auth, requireVerified, async (req, res) => {
  const { toEmail } = req.query;
  if (!toEmail) return res.send("Missing toEmail");

  const fromId = req.user.id;
  const toUser = await User.findOne({ email: toEmail });

  if (!toUser) return res.send("User not found");
  if (toUser._id.equals(fromId)) return res.send("Cannot add yourself");

  const fromUser = await User.findById(fromId);

  // 🚫 BLOCK CHECK
  if (
    fromUser.blockedUsers?.includes(toUser._id) ||
    toUser.blockedUsers?.includes(fromId)
  ) {
    return res.send("User is blocked");
  }

  // 🚫 ALREADY FRIENDS
  if (fromUser.friends.includes(toUser._id)) {
    return res.send("Already friends");
  }

  // 🚫 REQUEST ALREADY SENT
  if (fromUser.friendRequestsSent.includes(toUser._id)) {
    return res.send("Request already sent");
  }

  // 🚫 REQUEST ALREADY RECEIVED
  if (fromUser.friendRequestsReceived.includes(toUser._id)) {
    return res.send("User already sent you a request");
  }

  await User.updateOne(
    { _id: fromId },
    { $addToSet: { friendRequestsSent: toUser._id } }
  );

  await User.updateOne(
    { _id: toUser._id },
    { $addToSet: { friendRequestsReceived: fromId } }
  );

  await Notification.create({
    user: toUser._id,
    type: "friend",
    text: `Friend request from ${req.user.email}`,
    link: `/friends.html#requests`
  });

  res.send("REQUEST SENT");
});

/*
ACCEPT FRIEND REQUEST
/accept-request?fromEmail=EMAIL
*/
router.get("/accept-request", auth, async (req, res) => {
  const { fromEmail } = req.query;

  const me = await User.findById(req.user.id);
  const other = await User.findOne({ email: fromEmail });

  if (!other) return res.send("User not found");

  // ✅ REMOVE REQUEST (CORRECT ARRAYS)
  me.friendRequestsReceived = me.friendRequestsReceived.filter(
    id => !id.equals(other._id)
  );

  other.friendRequestsSent = other.friendRequestsSent.filter(
    id => !id.equals(me._id)
  );

  // ✅ ADD FRIEND BOTH SIDES
  if (!me.friends.some(id => id.equals(other._id))) {
    me.friends.push(other._id);
  }

  if (!other.friends.some(id => id.equals(me._id))) {
    other.friends.push(me._id);
  }

  await me.save();
  await other.save();

  res.send("FRIEND REQUEST ACCEPTED");
});
/*
DECLINE FRIEND REQUEST
/decline-request?fromEmail=EMAIL
*/
router.get("/decline-request", auth, async (req, res) => {
  const { fromEmail } = req.query;
  if (!fromEmail) return res.send("Missing fromEmail");

  const fromUser = await User.findOne({ email: fromEmail });
  if (!fromUser) return res.send("User not found");

  await User.updateOne(
    { _id: req.user.id },
    { $pull: { friendRequestsReceived: fromUser._id } }
  );

  await User.updateOne(
    { _id: fromUser._id },
    { $pull: { friendRequestsSent: req.user.id } }
  );

  res.send("REQUEST DECLINED");
});

/*
UNFRIEND
/unfriend?email=EMAIL
*/
router.get("/unfriend", auth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.send("Missing email");

  const other = await User.findOne({ email });
  if (!other) return res.send("User not found");

  await User.updateOne(
    { _id: req.user.id },
    { $pull: { friends: other._id } }
  );

  await User.updateOne(
    { _id: other._id },
    { $pull: { friends: req.user.id } }
  );

  res.send("UNFRIENDED");
});

/*
BLOCK USER
/block?email=EMAIL
*/
router.get("/block", auth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.send("Missing email");

  const other = await User.findOne({ email });
  if (!other) return res.send("User not found");

  // remove friendship + requests
  await User.updateOne(
    { _id: req.user.id },
    {
      $addToSet: { blockedUsers: other._id },
      $pull: {
        friends: other._id,
        friendRequestsSent: other._id,
        friendRequestsReceived: other._id
      }
    }
  );

  await User.updateOne(
    { _id: other._id },
    {
      $pull: {
        friends: req.user.id,
        friendRequestsSent: req.user.id,
        friendRequestsReceived: req.user.id
      }
    }
  );

  res.send("USER BLOCKED");
});

/*
UNBLOCK USER
/unblock?email=EMAIL
*/
router.get("/unblock", auth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.send("Missing email");

  const other = await User.findOne({ email });
  if (!other) return res.send("User not found");

  await User.updateOne(
    { _id: req.user.id },
    { $pull: { blockedUsers: other._id } }
  );

  res.send("USER UNBLOCKED");
});

/*
LIST FRIENDS
/friends
*/
router.get("/friends", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "name email college profilePic");

  res.json(user.friends);
});

/*
LIST BLOCKED USERS
/blocked
*/
router.get("/blocked", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("blockedUsers", "name email profilePic");

  res.json(user.blockedUsers || []);
});

/*
LIST RECEIVED REQUESTS
/requests
*/
router.get("/requests", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friendRequestsReceived", "name email profilePic");

  res.json(user.friendRequestsReceived);
});

/*
LIST PENDING REQUESTS (ALIAS)
/pending-requests
*/
router.get("/pending-requests", auth, async (req, res) => {
  await Notification.updateMany(
    {
      user: req.user.id,
      type: "friend",
      isRead: false
    },
    { $set: { isRead: true } }
  );

  const user = await User.findById(req.user.id)
    .populate("friendRequestsReceived", "name email profilePic");

  res.json(user.friendRequestsReceived);
});

module.exports = router;


