const express = require("express");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");
const requireVerified = require("../middleware/requireVerified");
const upload = require("../middleware/upload");
const validateUpload = require("../middleware/validateUpload");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* CREATE POST */
router.post(
  "/create-post",
   auth,
   requireVerified,
  upload.array("images", 3),
  validateUpload(),
  async (req, res) => {
    const { title, content } = req.body;
    if (!title || !content)
      return res.status(400).send("Missing params");

    const images = (req.files || []).map(f => f.filename);

    const post = new Post({
      title,
      content,
      images,
      user: req.user.id,
      college: req.user.college
    });

    await post.save();
    res.send("POST CREATED");
  }
);

/* LIST POSTS + SEARCH */
router.get("/posts", auth, async (req, res) => {
  const { q } = req.query;

  const me = await require("../models/User")
    .findById(req.user.id)
    .select("friends blockedUsers college");

  const blockedIds = me.blockedUsers.map(id => id.toString());

  const filter = {
  user: { $nin: blockedIds }
};

if (!["moderator", "admin"].includes(req.user.role)) {
  filter.college = me.college;
}


  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } }
    ];
  }

  const posts = await Post.find(filter)
    .populate("user", "name email profilePic role blockedUsers")
    .populate("replies.user", "name email profilePic")
    .sort({ createdAt: -1 });

  const friendSet = new Set(me.friends.map(id => id.toString()));
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const recentFriendPosts = [];
  const remainingPosts = [];

  posts.forEach(p => {
    // ❌ author blocked me
    if (p.user.blockedUsers?.some(id => id.equals(me._id))) return;

    const isFriend = friendSet.has(p.user._id.toString());
    const isRecent = now - new Date(p.createdAt).getTime() <= DAY;

    if (isFriend && isRecent) {
      recentFriendPosts.push(p);
    } else {
      remainingPosts.push(p);
    }
  });

  res.json([...recentFriendPosts, ...remainingPosts]);
});

/* EDIT POST */
router.get("/edit-post", auth, requireVerified, async (req, res) => {
  const { postId, title, content } = req.query;
  if (!postId || !title || !content) return res.send("Missing params");

  const post = await Post.findById(postId);
  if (!post) return res.send("Post not found");
  if (post.user.toString() !== req.user.id) return res.send("Not allowed");

  post.title = title;
  post.content = content;
  await post.save();

  res.send("POST UPDATED");
});

/* DELETE POST */
router.get("/delete-post", auth, requireVerified, async (req, res) => {
  const { postId } = req.query;
  if (!postId) return res.send("Missing postId");

  const post = await Post.findById(postId);
  if (!post) return res.send("Post not found");
  if (post.user.toString() !== req.user.id) return res.send("Not allowed");

/* 🔥 DELETE UPLOADED IMAGES FROM DISK */
  post.images.forEach(img => {
    const filePath = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

/* 🔥 THEN DELETE DB RECORD */
  await post.deleteOne();

  res.send("POST DELETED");
});

/* REPLY */
router.get("/reply-post", auth, requireVerified, async (req, res) => {
  const { postId, text } = req.query;
  if (!postId || !text) return res.send("Missing params");

  const post = await Post.findById(postId);
  if (!post) return res.send("Post not found");

  post.replies.push({ user: req.user.id, text });
  await post.save();

  /* 🔔 NOTIFY POST OWNER */
  if (!post.user.equals(req.user.id)) {
    await Notification.create({
      user: post.user,
      type: "forum",
      text: `${req.user.email} replied to your post: "${post.title}"`,
      link: `/forum.html#post=${post._id}`
    });
  }

  /* 🔔 ADDED: NOTIFY OTHER REPLY AUTHORS (reply-on-reply) */
  const repliedUserIds = new Set();

  post.replies.forEach(r => {
    const uid = r.user.toString();
    if (
      uid !== req.user.id &&
      uid !== post.user.toString()
    ) {
      repliedUserIds.add(uid);
    }
  });

  for (const uid of repliedUserIds) {
    await Notification.create({
      user: uid,
      type: "forum",
      text: `${req.user.email} replied to a comment on "${post.title}"`,
      link: `/forum.html#post=${post._id}`
    });
  }

  res.send("REPLY ADDED");
});

/* EDIT REPLY */
router.get("/edit-reply", auth, async (req, res) => {
  const { postId, replyId, text } = req.query;
  if (!postId || !replyId || !text) return res.send("Missing params");

  const post = await Post.findById(postId);
  if (!post) return res.send("Post not found");

  const reply = post.replies.id(replyId);
  if (!reply) return res.send("Reply not found");
  if (reply.user.toString() !== req.user.id) return res.send("Not allowed");

  reply.text = text;
  await post.save();

  res.send("REPLY UPDATED");
});

/* DELETE REPLY */
router.get("/delete-reply", auth, async (req, res) => {
  const { postId, replyId } = req.query;
  if (!postId || !replyId) return res.send("Missing params");

  const post = await Post.findById(postId);
  if (!post) return res.send("Post not found");

  const reply = post.replies.id(replyId);
  if (!reply) return res.send("Reply not found");
  if (reply.user.toString() !== req.user.id) return res.send("Not allowed");

  reply.deleteOne();
  await post.save();

  res.send("REPLY DELETED");
});

// ===== MODERATOR FORUM DELETE =====

router.delete("/moderator/forum/post/:postId", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).send("Post not found");

  post.images.forEach(img => {
    const p = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  await post.deleteOne();
  res.send("POST DELETED");
});

router.delete("/moderator/forum/comment/:postId/:replyId", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const post = await Post.findById(req.params.postId);
  if (!post) return res.status(404).send("Post not found");

  const reply = post.replies.id(req.params.replyId);
  if (!reply) return res.status(404).send("Reply not found");

  reply.deleteOne();
  await post.save();
  res.send("COMMENT DELETED");
});

module.exports = router;

