const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
  type: String,
  required: true,
  trim: true,
  validate: {
    validator: function (v) {
      return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(v);
    },
    message: "Name can contain only letters and single spaces"
  }
},
    
    profilePic: {
      type: String // filename stored in /uploads
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user"
    },

    isBanned: {
      type: Boolean,
      default: false
    },

   college: {
  type: String,
  required: true
},

collegeRef: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "College",
  default: null
},

   password: {
  type: String,
  required: true
},

resetPasswordToken: {
  type: String
},

resetPasswordExpires: {
  type: Date
},

   verification: {
  status: {
    type: String,
    enum: ["verified", "unverified", "pending", "banned"],
    default: "unverified" 
  },
  method: {
    type: String,
    enum: ["college_email", "id_upload", "legacy", null],
    default: "legacy"
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  proof: {
    type: [String], // uploaded filenames
    default: []
  },
  reviewedByModerator: {
  type: Boolean,   
  default: false 
}
},

    verificationCode: {
      type: String
    },

    verificationExpires: {
      type: Date
    },

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    friendRequestsSent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    friendRequestsReceived: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    notifications: [
      {
        type: {
        type: String, // chat | friend | trip
        required: true
        },
        text: {
        type: String,
        required: true
        },
        link: {
        type: String // optional frontend redirect
        },
        isRead: {
        type: Boolean,
        default: false
        },
        createdAt: {
        type: Date,
        default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
