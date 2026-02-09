const express = require("express");
const Item = require("../models/Item");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const validateUpload = require("../middleware/validateUpload");
const requireVerified = require("../middleware/requireVerified");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/*
ADD ITEM
GET /add-item?title=&type=&price=&description=
*/
router.post(
   "/add-item",
   auth,
   requireVerified,
  upload.array("images", 3),
  validateUpload(),
  async (req, res) => {
    const { title, type, price, description } = req.body;

    if (!title || !type || !price)
      return res.status(400).send("Missing fields");

    const images = (req.files || []).map(f => f.filename);

    const item = new Item({
      title,
      type,
      price,
      description,
      images,
      seller: req.user.id,
      college: req.user.college
    });

    await item.save();
    return res.send("ITEM ADDED");
  }
);

/*
VIEW ITEMS (college only)
GET /items
*/
/*
VIEW ITEMS (FRIENDS FIRST)
GET /items
*/
router.get("/items", auth, async (req, res) => {
  const me = await User.findById(req.user.id)
    .select("friends college blockedUsers");

  const blockedIds = me.blockedUsers.map(id => id.toString());

  const items = await Item.find(
  ["moderator", "admin"].includes(req.user.role)
    ? { seller: { $nin: blockedIds } }
    : { college: me.college, seller: { $nin: blockedIds } }
)

    .populate("seller", "name email profilePic role blockedUsers")
    .populate("comments.user", "name email profilePic")
    .populate("comments.replies.user", "name email profilePic")
    .sort({ createdAt: -1 });

  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const friendIds = me.friends.map(id => id.toString());

  const recentFriendItems = [];
  const remainingItems = [];

  items.forEach(i => {
    // ❌ seller blocked me
    if (i.seller.blockedUsers?.some(id => id.equals(me._id))) return;

    const isFriend = friendIds.includes(i.seller._id.toString());
    const isRecent =
      now - new Date(i.createdAt).getTime() <= DAY;

    if (isFriend && isRecent) {
      recentFriendItems.push(i);
    } else {
      remainingItems.push(i);
    }
  });

  res.json([...recentFriendItems, ...remainingItems]);
});

/*
MARK ITEM AS SOLD
GET /mark-sold?id=ITEM_ID
*/
router.get("/mark-sold", auth, async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("Missing id");

  const item = await Item.findById(id);
  if (!item) return res.status(404).send("Item not found");

  if (item.seller.toString() !== req.user.id)
    return res.status(403).send("Not allowed");

  item.status = "SOLD";
  await item.save();

  return res.send("MARKED SOLD");
});

/*
RESERVE ITEM
GET /reserve-item?id=ITEM_ID
*/
router.get("/reserve-item", auth, async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("Missing id");

  const item = await Item.findById(id);
  if (!item) return res.status(404).send("Item not found");

  if (item.seller.toString() !== req.user.id)
    return res.status(403).send("Not allowed");

  if (item.status !== "AVAILABLE")
    return res.status(400).send("Item not available");

  item.status = "RESERVED";
  item.reservedAt = new Date();
  await item.save();

  return res.send("ITEM RESERVED");
});
/*
UNRESERVE ITEM
GET /unreserve-item?id=ITEM_ID
*/
router.get("/unreserve-item", auth, async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("Missing id");

  const item = await Item.findById(id);
  if (!item) return res.status(404).send("Item not found");

  if (item.seller.toString() !== req.user.id)
    return res.status(403).send("Not allowed");

  item.status = "AVAILABLE";
  await item.save();

  return res.send("UNRESERVED");
});

/*
DELETE ITEM (seller only)
GET /delete-item?id=ITEM_ID
*/
router.get("/delete-item", auth, async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send("Missing id");

  const item = await Item.findById(id);
  if (!item) return res.status(404).send("Item not found");

  if (item.seller.toString() !== req.user.id)
    return res.status(403).send("Not allowed");

/* 🔥 DELETE UPLOADED IMAGES FROM DISK */
  item.images.forEach(img => {
    const filePath = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

/* 🔥 THEN DELETE DB RECORD */
  await Item.findByIdAndDelete(id);

  return res.send("ITEM DELETED");
});

/*
ADD COMMENT TO ITEM
POST /add-item-comment
body: { itemId, text }
*/
router.post("/add-item-comment", auth, requireVerified, async (req, res) => {
  const { itemId, text } = req.body;
  if (!itemId || !text)
    return res.status(400).send("Missing fields");

  const item = await Item.findById(itemId).populate("seller");
  if (!item) return res.status(404).send("Item not found");

  item.comments.push({
    user: req.user.id,
    text
  });

  await item.save();

  // 🔔 notify seller (if commenter is not seller)
  if (item.seller._id.toString() !== req.user.id) {
    await Notification.create({
      user: item.seller._id,
      type: "marketplace",
      text: `New comment on your item: ${item.title}`,
      link: `/marketplace.html#item=${item._id}`
    });
  }

  return res.send("COMMENT ADDED");
});

/*
REPLY TO COMMENT
POST /reply-item-comment
body: { itemId, commentId, text }
*/
router.post("/reply-item-comment", auth, requireVerified, async (req, res) => {
  const { itemId, commentId, text } = req.body;
  if (!itemId || !commentId || !text)
    return res.status(400).send("Missing fields");

  const item = await Item.findById(itemId).populate("seller");
  if (!item) return res.status(404).send("Item not found");

  const comment = item.comments.id(commentId);
  if (!comment) return res.status(404).send("Comment not found");

  comment.replies.push({
    user: req.user.id,
    text
  });

  await item.save();

  // 🔔 notify original commenter (if not self)
  if (comment.user.toString() !== req.user.id) {
    await Notification.create({
      user: comment.user,
      type: "marketplace",
      text: `Reply to your comment on: ${item.title}`,
      link: `/marketplace.html#item=${item._id}`
    });
  }

  return res.send("REPLY ADDED");
});

// ===== MODERATOR MARKETPLACE DELETE =====

router.delete("/moderator/marketplace/item/:itemId", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).send("Item not found");

  item.images.forEach(img => {
    const p = path.join(__dirname, "..", "uploads", img);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  await item.deleteOne();
  return res.send("ITEM DELETED");
});

router.delete("/moderator/marketplace/comment/:itemId/:commentId", auth, async (req, res) => {
  if (!["moderator", "admin"].includes(req.user.role))
    return res.status(403).send("Forbidden");

  const item = await Item.findById(req.params.itemId);
  if (!item) return res.status(404).send("Item not found");

  const comment = item.comments.id(req.params.commentId);
  if (!comment) return res.status(404).send("Comment not found");

  comment.deleteOne();
  await item.save();
  return res.send("COMMENT DELETED");
});

router.delete(
  "/moderator/marketplace/reply/:itemId/:commentId/:replyId",
  auth,
  async (req, res) => {
    if (!["moderator", "admin"].includes(req.user.role))
      return res.status(403).send("Forbidden");

    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).send("Item not found");

    const comment = item.comments.id(req.params.commentId);
    if (!comment) return res.status(404).send("Comment not found");

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) return res.status(404).send("Reply not found");

    reply.deleteOne();
    await item.save();
    return res.send("REPLY DELETED");
  }
);

module.exports = router;



