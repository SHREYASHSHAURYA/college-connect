const User = require("../models/User");

module.exports = async function requireVerified(req, res, next) {
  try {
    // moderators & admins bypass verification
    if (["moderator", "admin"].includes(req.user.role)) {
      return next();
    }

    const me = await User.findById(req.user.id).select("verification.status");

    if (!me) {
      return res.status(401).send("User not found");
    }

    if (me.verification.status !== "verified") {
      return res
        .status(403)
        .send("Account not verified");
    }

    next();
  } catch (err) {
    return res.status(500).send("Verification check failed");
  }
};