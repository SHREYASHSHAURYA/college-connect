const express = require("express");
const router = express.Router();
const College = require("../models/College");

// GET /api/colleges?search=
router.get("/", async (req, res) => {
  try {
    const search = req.query.search || "";

    const colleges = await College.find({
      status: "active",
      name: { $regex: search, $options: "i" }
    })
      .limit(10)
      .select("_id name");

    res.json(colleges);
  } catch (err) {
    //console.error(err);
    res.status(500).json({ message: "Failed to fetch colleges" });
  }
});

module.exports = router;