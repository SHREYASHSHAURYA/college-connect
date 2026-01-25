const express = require("express");
const Post = require("../models/Post");
const Item = require("../models/Item");
const User = require("../models/User");
const Report = require("../models/Report");
const auth = require("../middleware/auth");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* 🔐 MODERATOR / ADMIN GUARD */
function modOnly(req, res, next) {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }
  next();
}

/* ===================== USER BAN / UNBAN ===================== */

/* BAN USER */
router.post("/moderator/ban-user", auth, modOnly, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).send("Missing userId");

  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  user.isBanned = true;
  await user.save();

  res.send("USER BANNED");
});

/* UNBAN USER */
router.post("/moderator/unban-user", auth, modOnly, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).send("Missing userId");

  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  user.isBanned = false;
  await user.save();

  res.send("USER UNBANNED");
});

/* ===================== BANNED USERS LIST ===================== */

router.get("/moderator/banned-users", auth, modOnly, async (req, res) => {
  const bannedUsers = await User.find({ isBanned: true })
    .select("name email college createdAt");

  res.json(bannedUsers);
});

/* ===================== FORUM ===================== */
/* DELETE POST (MODERATOR) */
router.delete("/moderator/forum/:id", auth, modOnly, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send("Post not found");

  // delete images
  post.images.forEach(img => {
    const p = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  await post.deleteOne();
  res.send("POST REMOVED");
});

/* ===================== MARKETPLACE ===================== */
/* DELETE ITEM (MODERATOR) */
router.delete("/moderator/item/:id", auth, modOnly, async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).send("Item not found");

  item.images.forEach(img => {
    const p = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  await item.deleteOne();
  res.send("ITEM REMOVED");
});

module.exports = router;