const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    type: {
      type: String,
      required: true
      // friend | chat | trip | marketplace | forum
    },

    text: {
      type: String,
      required: true
    },

    link: {
      type: String
    },

    isRead: {
      type: Boolean,
      default: false
    },

    // ✅ MUST BE HERE (inside schema object)
    expiresAt: {
      type: Date,
      default: () =>
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

// ✅ TTL INDEX
notificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("Notification", notificationSchema);