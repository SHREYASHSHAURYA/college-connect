const express = require("express");
const Report = require("../models/Report");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Post = require("../models/Post");
const Item = require("../models/Item");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* CREATE REPORT */
router.post("/report", auth, async (req, res) => {
  const { targetType, targetId, reason } = req.body;

  // ❌ Prevent self-reporting
  const mongoose = require("mongoose");

  if (
    targetType === "user" &&
    mongoose.Types.ObjectId.isValid(targetId) &&
    targetId.toString() === req.user.id.toString()
  ) {
    return res.status(400).send("You cannot report yourself");
  }

  if (!targetType || !targetId || !reason) {
    return res.status(400).send("Missing fields");
  }

  // 🚫 Prevent reporting moderators/admins
if (targetType === "user") {
  const targetUser = await User.findById(targetId).select("role");
  if (!targetUser) {
    return res.status(404).send("User not found");
  }

  if (
    ["moderator", "admin"].includes(targetUser.role) &&
    req.user.role === "user"
  ) {
    return res.status(403).send("You cannot report moderators");
  }
}

  await Report.create({
    reporter: req.user.id,
    targetType,
    targetId,
    reason
  });

  res.send("REPORTED");
});

/* VIEW REPORTS (MODERATOR / ADMIN) */
router.get("/reports", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const reports = await Report.find()
    .populate("reporter", "email")
    .populate("reviewedBy", "email")
    .sort({ createdAt: -1 })
    .lean();

  // 🔧 attach user info ONLY for user reports
  for (const r of reports) {
    if (r.targetType === "user") {
      r.targetUser = await User.findById(r.targetId)
        .select("_id email isBanned");
    }
  }

  res.json(reports);
});

/* RESOLVE REPORT */
router.post("/reports/resolve", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const { reportId } = req.body;

  await Report.findByIdAndUpdate(reportId, {
    status: "reviewed",
    reviewedBy: req.user.id
  });

  res.send("REPORT RESOLVED");
});

router.post("/moderator/ban-user", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).send("Missing userId");

  /* ================= BAN USER ================= */
  const user = await User.findByIdAndUpdate(
    userId,
    { isBanned: true },
    { new: true }
  );

  if (!user) return res.status(404).send("User not found");

  /* ========== DELETE FORUM POSTS ========== */
  const posts = await Post.find({ user: userId });

  posts.forEach(post => {
    post.images.forEach(img => {
      const imgPath = path.join(__dirname, "..", "uploads", img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
  });

  await Post.deleteMany({ user: userId });

  /* ========== DELETE MARKETPLACE ITEMS ========== */
  const items = await Item.find({ seller: userId });

  items.forEach(item => {
    item.images.forEach(img => {
      const imgPath = path.join(__dirname, "..", "uploads", img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
  });

  await Item.deleteMany({ seller: userId });

  /* ========== MARK REPORTS ACTIONED ========== */
  await require("../models/Report").updateMany(
    { targetType: "user", targetId: userId },
    {
      status: "action_taken",
      reviewedBy: req.user.id
    }
  );

  res.send("USER BANNED AND CONTENT REMOVED");
});

router.delete("/moderator/forum/:postId", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) return res.status(404).send("Post not found");

  post.images.forEach(img => {
    const imgPath = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  });

  await post.deleteOne();

  await Report.updateMany(
    { targetType: "forum", targetId: postId },
    { status: "action_taken", reviewedBy: req.user.id }
  );

  res.send("FORUM POST DELETED");
});

router.delete("/moderator/item/:itemId", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const { itemId } = req.params;

  const item = await Item.findById(itemId);
  if (!item) return res.status(404).send("Item not found");

  item.images.forEach(img => {
    const imgPath = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  });

  await item.deleteOne();

  await Report.updateMany(
    { targetType: "marketplace", targetId: itemId },
    { status: "action_taken", reviewedBy: req.user.id }
  );

  res.send("ITEM DELETED");
});

router.post("/moderator/unban-user", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role)) {
    return res.status(403).send("Forbidden");
  }

  const { userId } = req.body;

  if (!userId) return res.status(400).send("Missing userId");

  const mongoose = require("mongoose");

if (!mongoose.Types.ObjectId.isValid(userId)) {
  return res.status(400).send("Invalid userId");
}

await User.findByIdAndUpdate(userId, { isBanned: false });

// 🔧 ALSO reset related user reports (CRITICAL)
await Report.updateMany(
  { targetType: "user", targetId: userId },
  { status: "reviewed", reviewedBy: req.user.id }
);

res.send("USER UNBANNED");
});

module.exports = router;