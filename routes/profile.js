const express = require("express");
const User = require("../models/User");
const Item = require("../models/Item");
const Post = require("../models/Post");
const auth = require("../middleware/auth");
const validateUpload = require("../middleware/validateUpload");

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }
    cb(null, true);
  }
});

const router = express.Router();

/*
GET BASIC PROFILE INFO
Supports:
- /profile/me
- /profile/email/:email
*/
router.get("/profile/:identifier", auth, async (req, res) => {
  const { identifier } = req.params;

  const mongoose = require("mongoose");

  let user;

  if (identifier === "me") {
    user = await User.findById(req.user.id)
      .select("name email college friends blockedUsers profilePic isBanned role verification");
  }
  else if (mongoose.Types.ObjectId.isValid(identifier)) {
    user = await User.findById(identifier)
      .select("name email college friends blockedUsers profilePic isBanned role verification");
  }
  else {
    user = await User.findOne({ email: identifier })
      .select("name email college friends blockedUsers profilePic isBanned role verification");
  }

  if (!user) return res.status(404).send("User not found");

  const me = await User.findById(req.user.id)
    .select("friends blockedUsers");

  const isSelf = user._id.equals(req.user.id);
  const isFriend = me.friends.some(id => id.equals(user._id));
  const isBlocked = me.blockedUsers.some(id => id.equals(user._id));
  const blockedYou = user.blockedUsers.some(id => id.equals(req.user.id));
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    college: user.college,
    profilePic: user.profilePic || null,
    verificationStatus: user.verification?.status ?? "unverified",
    isBanned: user.isBanned,
    isSelf,
    isFriend,
    isBlocked,
    blockedYou
  });
});

/*
GET USER MARKETPLACE ITEMS
Supports:
- /profile/me/items
- /profile/email/:email/items
*/
router.get("/profile/:identifier/items", auth, async (req, res) => {
  const { identifier } = req.params;

  const mongoose = require("mongoose");

  let user;

  if (identifier === "me") {
    user = await User.findById(req.user.id);
  }
  else if (mongoose.Types.ObjectId.isValid(identifier)) {
    user = await User.findById(identifier);
  }
  else {
    user = await User.findOne({ email: identifier });
  }

  if (!user) return res.status(404).send("User not found");

  const me = await User.findById(req.user.id).select("friends");

  const isSelf = user._id.equals(req.user.id);
  const isFriend = me.friends.some(id => id.equals(user._id));

  if (!isSelf && !isFriend) {
    return res.json([]);
  }

  const items = await Item.find({ seller: user._id })
    .sort({ createdAt: -1 });

  res.json(items);

});

/*
GET USER FORUM POSTS
Supports:
- /profile/me/posts
- /profile/email/:email/posts
*/
router.get("/profile/:identifier/posts", auth, async (req, res) => {
  const { identifier } = req.params;

  const mongoose = require("mongoose");

  let user;

  if (identifier === "me") {
    user = await User.findById(req.user.id);
  }
  else if (mongoose.Types.ObjectId.isValid(identifier)) {
    user = await User.findById(identifier);
  }
  else {
    user = await User.findOne({ email: identifier });
  }

  if (!user) return res.status(404).send("User not found");

  const me = await User.findById(req.user.id).select("friends");

  const isSelf = user._id.equals(req.user.id);
  const isFriend = me.friends.some(id => id.equals(user._id));

  if (!isSelf && !isFriend) {
    return res.json([]);
  }

  const posts = await Post.find({ user: user._id })
    .sort({ createdAt: -1 });

  res.json(posts);
});

// UPLOAD / UPDATE PROFILE PICTURE
router.post(
  "/profile/upload-pic",
  auth,
  upload.single("image"),
  validateUpload(),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).send("No image uploaded");
    }

    await User.findByIdAndUpdate(req.user.id, {
      profilePic: req.file.filename
    });

    res.json({ filename: req.file.filename });
  }
);

module.exports = router;