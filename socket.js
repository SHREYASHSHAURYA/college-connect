require("dotenv").config();
const jwt = require("jsonwebtoken");
const Message = require("./models/Message");
const User = require("./models/User");
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, email, college }
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    

    socket.join(socket.user.id.toString());
    socket.activeChatEmail = null;

    // ✅ CHANGE #1: chat-opened now ONLY sets active chat
    socket.on("chat-opened", async ({ withEmail }) => {
      socket.activeChatEmail = withEmail;
    });

    socket.on("chat-closed", () => {
      socket.activeChatEmail = null;
    });

    socket.on("send-message", async ({ toEmail, text, media }) => {
      if (!toEmail || !text) return;

      const sender = await User.findById(socket.user.id);
      const receiver = await User.findOne({ email: toEmail });

      // ✅ CHANGE #2: null checks BEFORE using receiver._id
      if (!sender || !receiver) return;
      if (sender.college !== receiver.college) return;

      const receiverSockets = await io
        .in(receiver._id.toString())
        .fetchSockets();
      const receiverOnline = receiverSockets.length > 0;

     

      const msg = new Message({
        sender: sender._id,
        receiver: receiver._id,
        college: sender.college,
        text,
        media,
        readAt: receiverOnline ? new Date() : null
      });

      await msg.save();

      if (receiverOnline) {
        io.to(sender._id.toString()).emit("messages-seen", {
          by: receiver.email
        });
      }

      

      io.to(sender._id.toString()).emit("receive-message", {
        _id: msg._id,
        sender: {
          _id: sender._id,
          email: sender.email
        },
        receiver: {
          _id: receiver._id,
          email: receiver.email
        },
        text: msg.text,
        media: msg.media || null,
        createdAt: msg.createdAt
      });

      io.to(receiver._id.toString()).emit("receive-message", {
        _id: msg._id,
        sender: {
          _id: sender._id,
          email: sender.email
        },
        receiver: {
          _id: receiver._id,
          email: receiver.email
        },
        text: msg.text,
        media: msg.media || null,
        createdAt: msg.createdAt
      });
    });

    socket.on("disconnect", () => {});
  });
};

