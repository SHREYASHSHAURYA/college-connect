require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

/* ROUTES */
const authRoutes = require("./routes/auth");
const friendsRoutes = require("./routes/friends");
const chatRoutes = require("./routes/chat");
const marketplaceRoutes = require("./routes/marketplace");
const tripsRoutes = require("./routes/trips");
const forumRoutes = require("./routes/forum");
const notificationsRoutes = require("./routes/notifications");
const profileRoutes = require("./routes/profile");
const reportsRoutes = require("./routes/reports");
const moderatorRoutes = require("./routes/moderator");
const collegeRoutes = require("./routes/colleges");

/* MODELS */
const User = require("./models/User");
const Message = require("./models/Message");
const Post = require("./models/Post");

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const server = http.createServer(app);

/* CORS */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.use("/uploads", express.static("uploads"));

/* FRONTEND — MUST BE BEFORE ROUTES */
app.use(express.static(path.join(__dirname, "frontend")));

/* ROUTES — UNTOUCHED */
app.use(authRoutes);
app.use(friendsRoutes);
app.use(chatRoutes);
app.use(marketplaceRoutes);
app.use(tripsRoutes);
app.use(forumRoutes);
app.use(notificationsRoutes);
app.use(profileRoutes);
app.use(reportsRoutes);
app.use(moderatorRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/verification", require("./routes/verification"));
app.use("/contact", require("./routes/contact"));

/* ROOT */
app.get("/", (req, res) => {
  res.send("Server + Socket running");
});

/* SOCKET.IO */
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set("io", io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.id;

  socket.join(userId);
    // ===== ACTIVE CHAT TRACKING =====
  socket.activeChatEmail = null;

  socket.on("chat-opened", ({ withEmail }) => {
    socket.activeChatEmail = withEmail;
  });

  socket.on("chat-closed", () => {
    socket.activeChatEmail = null;
  });
  // ✅ HANDLE READ WHEN USER OPENS CHAT AFTER MESSAGE ARRIVED
socket.on("message-read", async ({ fromEmail }) => {
  const reader = await User.findById(userId);
  const sender = await User.findOne({ email: fromEmail });
  if (!reader || !sender) return;

  const result = await Message.updateMany(
    {
      sender: sender._id,
      receiver: reader._id,
      readAt: null
    },
    { readAt: new Date() }
  );

  if (result.modifiedCount > 0) {
    io.to(sender._id.toString()).emit("messages-seen", {
      by: reader.email
    });
  }
});


socket.on("send-message", async ({ toEmail, text, media }) => {
  if (!toEmail) return;
  if (!text && !media) return;

  const sender = await User.findById(userId);
  const receiver = await User.findOne({ email: toEmail });
  if (!sender || !receiver) return;

  // 🔍 check if receiver is actively viewing this chat
  const receiverSockets = await io
    .in(receiver._id.toString())
    .fetchSockets();

  const receiverViewingChat = receiverSockets.some(
    s => s.activeChatEmail === sender.email
  );

  const msg = new Message({
    sender: sender._id,
    receiver: receiver._id,
    college: sender.college,
    text: text || "",
    media: media || null,
    readAt: receiverViewingChat ? new Date() : null
  });

  await msg.save();

  const populatedMsg = await Message.findById(msg._id)
    .populate("sender receiver", "email profilePic");

  io.to(receiver._id.toString()).emit("receive-message", populatedMsg);
  io.to(userId).emit("receive-message", populatedMsg);

  // ✅ instant seen update
  if (receiverViewingChat) {
    io.to(sender._id.toString()).emit("messages-seen", {
      by: receiver.email
    });
  }
});
}); 
  

/* DB */
mongoose.connect(process.env.MONGO_URI);

const Item = require("./models/Item");

setInterval(async () => {
  const now = new Date();

  // RESERVED → AVAILABLE after 3 days
  await Item.updateMany(
    {
      status: "RESERVED",
      reservedAt: { $lte: new Date(now - 3 * 24 * 60 * 60 * 1000) }
    },
    {
      $set: { status: "AVAILABLE", reservedAt: null }
    }
  );

  // Auto-delete expired items (not SOLD)
  await Item.deleteMany({
    expiresAt: { $lt: now },
    status: { $ne: "SOLD" }
  });

  // Auto-delete expired forum posts
  await Post.deleteMany({
    expiresAt: { $lt: now }
  });

}, 60 * 60 * 1000); // runs every 1 hour

  

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {});








