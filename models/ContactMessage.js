const mongoose = require("mongoose");

const ContactMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    email: String,
    subject: String,
    message: String,
    reply: {
  type: String,
  default: ""
},
repliedAt: Date,
    status: {
      type: String,
      enum: ["pending", "handled"],
      default: "pending"
    }
  },
  {
    timestamps: {
      createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 
      },
      updatedAt: true
    }
  }
);

module.exports = mongoose.model("ContactMessage", ContactMessageSchema);
