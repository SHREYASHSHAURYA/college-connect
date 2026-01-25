const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification"); // 🔔 ADDED FOR NOTIFICATIONS
const auth = require("../middleware/auth");
const chatUpload = require("../middleware/chatUpload");
const validateUpload = require("../middleware/validateUpload");

const router = express.Router();

/*
CHAT MEDIA UPLOAD
POST /chat/upload
*/
router.post(
  "/chat/upload",
  auth,
  chatUpload.single("file"),
  validateUpload({ allowVideo: true }),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const type = req.file.mimetype.startsWith("image/")
      ? "image"
      : "video";

    res.json({
      type,
      filename: req.file.filename
    });
  }
);

/*
SEND MESSAGE (HTTP)
*/
router.get("/send-message", auth, async (req, res) => {
  const { toEmail, text } = req.query;
  if (!toEmail || !text) return res.status(400).send("Missing params");

  const sender = await User.findById(req.user.id);
  const receiver = await User.findOne({ email: toEmail });
  if (!receiver) return res.status(404).send("User not found");

  const msg = new Message({
    sender: sender._id,
    receiver: receiver._id,
    college: sender.college,
    text,
    media: null
  });

  await msg.save();

  // 🔔 ADDED FOR NOTIFICATIONS (CHAT)
  await Notification.create({
    user: receiver._id,
    type: "chat",
    text: `New message from ${sender.email}`,
    link: `/chat.html?with=${sender.email}`
  });

  res.send("MESSAGE SENT");
});

/*
GET CHAT HISTORY
*/
router.get("/messages", auth, async (req, res) => {
  const { withEmail } = req.query;
  if (!withEmail) return res.status(400).send("Missing withEmail");

  const me = await User.findById(req.user.id);
  const other = await User.findOne({ email: withEmail });
  if (!other) return res.status(404).send("User not found");

 
// ✅ MARK MESSAGES AS READ (THIS IS REQUIRED)
await Message.updateMany(
  {
    sender: other._id,
    receiver: me._id,
    readAt: null
  },
  { readAt: new Date() }
);
// 2️⃣ FETCH AFTER UPDATE (readAt is now present)
const messages = await Message.find({
  $or: [
    { sender: me._id, receiver: other._id },
    { sender: other._id, receiver: me._id }
  ]
})
  .sort({ createdAt: 1 })
  .populate("sender receiver", "email profilePic");

  res.json(messages);
});
router.get("/messages/unread-count", auth, async (req, res) => {
  const count = await Message.countDocuments({
    receiver: req.user.id,
    readAt: null
  });

  res.json({ count });
});

/*
GET CHAT INBOX (LAST MESSAGE PER USER + UNREAD COUNT)
*/
router.get("/chat-inbox", auth, async (req, res) => {
  const mongoose = require("mongoose");
  const me = new mongoose.Types.ObjectId(req.user.id);

  const inbox = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: me },
          { receiver: me }
        ]
      }
    },
    {
      $project: {
        otherUser: {
          $cond: [
            { $eq: ["$sender", me] },
            "$receiver",
            "$sender"
          ]
        },
        text: 1,
        createdAt: 1,
        readAt: 1,
        sender: 1,
        receiver: 1
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$otherUser",
        lastMessage: { $first: "$text" },
        lastAt: { $first: "$createdAt" },
        unread: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiver", me] },
                  { $eq: ["$readAt", null] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { lastAt: -1 } }
  ]);

  const users = await User.find(
    { _id: { $in: inbox.map(i => i._id) } },
    "email name profilePic"
  );

  const map = {};
  users.forEach(u => (map[u._id] = u));

  const result = inbox
    .filter(i => map[i._id])   // 🔒 prevent ghost users
    .map(i => ({
      userId: i._id,
      email: map[i._id].email,
      name: map[i._id].name,
      profilePic: map[i._id].profilePic || null,
      lastMessage: i.lastMessage,
      unread: i.unread
    }));

  res.json(result);
});

/*
GET UNREAD CHAT USER COUNT
*/
router.get("/chat-unread-users", auth, async (req, res) => {
  const mongoose = require("mongoose");
  const me = new mongoose.Types.ObjectId(req.user.id);

  const unreadUsers = await Message.aggregate([
    {
      $match: {
        receiver: me,
        readAt: null
      }
    },
    {
      $group: {
        _id: "$sender"
      }
    }
  ]);

  res.json({ count: unreadUsers.length });
});

module.exports = router;

