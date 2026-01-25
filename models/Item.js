const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["book", "notes", "pyq", "item"],
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  description: {
    type: String
  },

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  college: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["AVAILABLE", "RESERVED", "SOLD"],
    default: "AVAILABLE"
  },

  reservedAt: {
    type: Date,
    default: null
  },

  images: [
    {
      type: String
    }
  ],

  expiresAt: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },

  /* 🗨️ COMMENTS + REPLIES */
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      text: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      replies: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
          },
          text: {
            type: String,
            required: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ]
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Item", itemSchema);
