const mongoose = require("mongoose");
const College = require("../models/College");
const MONGO_URI = process.env.MONGO_URI;

const colleges = require("./colleges.json");

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    //console.log("MongoDB connected");

    await College.deleteMany({});
    await College.insertMany(colleges);

    //console.log("Colleges seeded successfully");
    process.exit();
  } catch (err) {
    //console.error(err);
    process.exit(1);
  }
}

seed();