require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function (req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token" });
  }

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "Invalid token format" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      college: decoded.college,
      role: decoded.role
    }; 

    /* ================= BLOCK ENFORCEMENT ================= */

    const me = await User.findById(decoded.id).select(
  "blockedUsers isBanned role"
);

if (!me) {
  return res.status(401).json({ message: "User not found" });
}

// 🔒 Block banned users EXCEPT moderators/admins
if (
  me.isBanned &&
  !["moderator", "admin"].includes(me.role)
) {
  return res.status(401).json({ message: "Account banned" });
}

    /*
      Extract target email from ALL possible places
      This intentionally covers your entire app
    */
    const targetEmail =
      req.query.email ||
      req.query.toEmail ||
      req.query.withEmail ||
      req.query.user ||
      req.params.email ||
      req.params.identifier ||
      null;

    /*
      IMPORTANT RULE:
      - If *I* blocked them → I CAN still see them
      - If *they* blocked me → I CANNOT see them
    */

    if (targetEmail && targetEmail !== "me" && targetEmail !== decoded.email) {
      const target = await User.findOne({ email: targetEmail }).select(
        "_id blockedUsers"
      );

      if (target) {
        const theyBlockedMe = target.blockedUsers.some(id =>
          id.equals(me._id)
        );

        if (theyBlockedMe) {
          // Appear as non-existent everywhere
          return res.status(404).json({ message: "User not found" });
        }
      }
    }

    /* ===================================================== */

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

