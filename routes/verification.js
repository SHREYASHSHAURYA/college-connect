const express = require("express");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

/* ================= USER SUBMIT PROOF ================= */
router.post(
  "/submit",
  auth,
  upload.array("proof", 3),
  async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).send("User not found");

  if (user.verification.status === "verified") {
  return res.status(400).send("Already verified");
}

    const files = (req.files || []).map(f => f.filename);
    if (!files.length) {
      return res.status(400).send("No proof uploaded");
    }

    user.verification.status = "pending";
    user.verification.method = "id_upload";
    user.verification.proof = files;
    user.verification.reviewedByModerator = false;

    await user.save();

    const mods = await User.find({
      role: { $in: ["moderator", "admin"] }
    }).select("_id");


    res.send("VERIFICATION SUBMITTED");
  }
);

/* ================= MODERATOR VIEW PENDING ================= */
router.get("/pending", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

 const users = await User.find({
  "verification.status": "pending",
  "verification.proof.0": { $exists: true }
})
  .sort({ updatedAt: 1 }) // OLDEST → NEWEST
  .select("name email college verification");

  res.json(users);
});
// 🔢 COUNT ONLY UNREAD PENDING (FOR DASHBOARD)
router.get("/pending/count", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const count = await User.countDocuments({
    "verification.status": "pending",
    "verification.proof.0": { $exists: true },
    "verification.reviewedByModerator": false
  });

  res.json({ count });
});
router.post("/mark-reviewed", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const user = await User.findById(req.query.userId);
  if (!user) return res.status(404).send("User not found");

  if (user.verification.status !== "pending") {
    return res.status(400).send("Already handled");
  }

  user.verification.reviewedByModerator = true;
  await user.save();

  res.send("MARKED REVIEWED");
});

/* ================= MODERATOR APPROVE ================= */
router.post("/approve", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const user = await User.findById(req.query.userId);
  if (!user) return res.status(404).send("User not found");

  // 🔒 DB-level lock — prevent double action
if (user.verification.status !== "pending") {
  return res.status(400).send("Verification already handled");
}

  user.verification.status = "verified";
  user.verification.verifiedAt = new Date();
  user.verification.proof = [];
  user.verification.reviewedByModerator = true;

  await user.save();

  await Notification.create({
    user: user._id,
    type: "verification",
    text: "Your account has been verified",
    link: "/profile.html"
  });

  res.send("VERIFIED");
});

/* ================= MODERATOR REJECT ================= */
router.post("/reject", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const user = await User.findById(req.query.userId);
  if (!user) return res.status(404).send("User not found");

  // 🔒 DB-level lock — prevent double action
if (user.verification.status !== "pending") {
  return res.status(400).send("Verification already handled");
}

  user.verification.status = "unverified";
  user.verification.method = "legacy";
  user.verification.proof = [];
  user.verification.reviewedByModerator = true;

  await user.save();

  await Notification.create({
    user: user._id,
    type: "verification",
    text: "Verification rejected. Please re-submit proof.",
    link: "/verify.html"
  });

  res.send("REJECTED");
});

/* ================= USER VERIFICATION STATUS ================= */
router.get("/status", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "verification.status verification.method verification.verifiedAt"
  );

  if (!user) return res.status(404).send("User not found");

  res.json(user.verification);
});

module.exports = router;