const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },

  dateTime: {
    type: Date,
    required: true
  },

  validTill: {
    type: Date,
    required: true
  },

  passengerLimit: {
    type: Number,
    required: true,
    min: 1
  },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  passengers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  pendingRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  college: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("Trip", tripSchema);

