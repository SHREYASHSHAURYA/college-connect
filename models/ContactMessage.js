const mongoose = require("mongoose");

const ContactMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    email: {
      type: String,
      default: "anonymous"
    },
    subject: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    reply: {
      type: String,
      default: ""
    },
    repliedAt: Date,
    status: {
      type: String,
      enum: ["pending", "handled"],
      default: "pending"
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  },
  {
    timestamps: true
  }
);

ContactMessageSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("ContactMessage", ContactMessageSchema);
