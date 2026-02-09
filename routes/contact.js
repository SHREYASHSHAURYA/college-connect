const express = require("express");
const ContactMessage = require("../models/ContactMessage");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/submit", async (req, res) => {
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).send("Missing fields");
  }

  await ContactMessage.create({
  user: null,
  email: "anonymous",
  subject,
  message,
  status: "pending"
});

  res.send("MESSAGE SENT");
});

/* USER VIEW REPLIES */
/*router.get("/mine", auth, async (req, res) => {
  const msgs = await ContactMessage.find({
    user: req.user.id,
    reply: { $ne: "" }
  }).sort({ repliedAt: -1 });

  res.json(msgs);
});*/


/* MODERATOR VIEW PENDING */
router.get("/pending", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const msgs = await ContactMessage.find({ status: "pending" })
  .sort({ createdAt: 1 })
  .lean();

msgs.forEach(m => {
  if (!m.user) {
    m.user = { email: "Anonymous user" };
  }
});
res.json(msgs);
});

/* MODERATOR REPLY */
router.post("/reply", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const { id, reply } = req.body;
  if (!id || !reply)
    return res.status(400).send("Missing fields");

  const msg = await ContactMessage.findById(id);
  if (!msg) return res.status(404).send("Not found");

  msg.reply = reply;
  msg.repliedAt = new Date();
  msg.status = "handled";

  await msg.save();
  res.send("REPLIED");
});

/* MODERATOR MARK HANDLED */
router.post("/handle", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const { id } = req.body;
  if (!id) return res.status(400).send("Missing id");

  await ContactMessage.findByIdAndUpdate(id, {
    status: "handled"
  });

  res.send("HANDLED");
});

/* ================= MODERATOR DELETE CONTACT ================= */
router.delete("/delete", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const { id } = req.body;
  if (!id) return res.status(400).send("Missing id");

  const msg = await ContactMessage.findById(id);
  if (!msg) return res.status(404).send("Message not found");

  await msg.deleteOne();
  res.send("DELETED");
});

module.exports = router;