const express = require("express");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

const router = express.Router();

/* GET MY NOTIFICATIONS */
router.get("/notifications", auth, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 });

  res.json(notifications);
});

/* MARK AS READ */
router.get("/read-notification", auth, async (req, res) => {
  const { id } = req.query;
  if (!id) return res.send("Missing id");

  await Notification.updateOne(
    { _id: id, user: req.user.id },
    { isRead: true }
  );

  res.send("OK");
});

/* MARK ALL AS READ */
router.get("/read-all-notifications", auth, async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true }
  );

  res.send("OK");
});

module.exports = router;