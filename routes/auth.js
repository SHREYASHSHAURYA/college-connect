require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const College = require("../models/College");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, college, collegeId, password } = req.body;
const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

if (!name || !email || !college || !password) {
  return res.status(400).json({ message: "Missing fields" });
}

if (!nameRegex.test(name.trim())) {
  return res.status(400).json({
    message: "Name can contain only letters and single spaces"
  });
}

if (!passwordRegex.test(password)) {
  return res.status(400).json({
    message:
      "Password must be at least 8 characters and include letters, numbers, and special characters"
  });
}

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

   let collegeDoc = null;

if (collegeId) {
  collegeDoc = await College.findById(collegeId);
  if (!collegeDoc) {
    return res.status(400).json({ message: "Invalid college selected" });
  }
}

const emailDomain = email.split("@")[1]?.toLowerCase();

let verificationStatus = "unverified";
let verificationMethod = "legacy";

if (collegeDoc && emailDomain) {
  const match = collegeDoc.domains.some(
    d => d.toLowerCase() === emailDomain
  );

  if (match) {
    verificationStatus = "verified";
    verificationMethod = "college_email";
  }
}

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailToken = jwt.sign(
  { email },
  JWT_SECRET,
  { expiresIn: "24h" }
);

    const user = new User({
  name,
  email,
  college,
  collegeRef: collegeDoc ? collegeDoc._id : null,
  password: hashedPassword,

  verificationCode: emailToken,
  verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),

  verification: {
    status: verificationStatus,
    method: verificationMethod,
    verifiedAt: verificationStatus === "verified" ? new Date() : null,
    proof: []
  }
});

    await user.save();
    const verifyLink = `http://localhost:5000/verify-email.html?token=${emailToken}`;

await sendEmail({
  to: email,
  subject: "Verify your email",
  text: `Verify your email: ${verifyLink}`,
  html: `<p><a href="${verifyLink}">Verify Email</a></p>`
});
    res.json({ message: "Registered successfully" });

  } catch (err) {
  console.error("REGISTER ERROR:", err);
  res.status(500).json({ message: "Server error" });
}
});

router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Invalid link");

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(400).send("Link expired");
  }

  const user = await User.findOne({
    email: decoded.email,
    verificationCode: token,
    verificationExpires: { $gt: new Date() }
  });

  if (!user) return res.status(400).send("Invalid link");

  user.verificationCode = null;
  user.verificationExpires = null;
  await user.save();

  res.send("Email verified. You can now log in.");
});

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isBanned) {
  return res.status(403).json({
    message: "Your account has been banned"
  });
}

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.verificationCode) {
  return res.status(403).json({
    message: "Please verify your email before logging in"
  });
}

    // 🔒 CLEAR ANY OLD RESET TOKENS ON SUCCESSFUL LOGIN
user.resetPasswordToken = null;
user.resetPasswordExpires = null;
await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        college: user.college,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        college: user.college
      }
    });

  } catch (err) {
    // login error 
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  if (!user) {
    // security: do NOT reveal existence
    return res.json({ message: "If account exists, reset link sent" });
  }

  const resetToken = jwt.sign(
    { id: user._id },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const resetLink = `http://localhost:5000/reset-password.html?token=${resetToken}`;

await sendEmail({
  to: user.email,
  subject: "Reset your College Connect password",
  text: `Reset your password using this link: ${resetLink}`,
  html: `
    <p>You requested a password reset.</p>
    <p>
      <a href="${resetLink}">Click here to reset your password</a>
    </p>
    <p>This link expires in 15 minutes.</p>
  `
});

  res.json({ message: "Password reset link sent" });
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

if (!token || !newPassword)
  return res.status(400).json({ message: "Missing fields" });

if (!passwordRegex.test(newPassword)) {
  return res.status(400).json({
    message:
      "Password must be at least 8 characters and include letters, numbers, and special characters"
  });
}

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const user = await User.findOne({
    _id: decoded.id,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user)
    return res.status(400).json({ message: "Invalid or expired token" });

 const samePassword = await bcrypt.compare(newPassword, user.password);
if (samePassword) {
  return res.status(400).json({
    message: "New password must be different from old password"
  });
}

// ✅ HASH & SAVE
user.password = await bcrypt.hash(newPassword, 10);
user.resetPasswordToken = null;
user.resetPasswordExpires = null;

await user.save();

  res.json({ message: "Password reset successful" });
});

/* ================= CHANGE PASSWORD ================= */
router.post("/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: "Missing fields" });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok)
    return res.status(401).json({ message: "Old password incorrect" });
  if (!passwordRegex.test(newPassword)) {
  return res.status(400).json({
    message:
      "Password must be at least 8 characters and include letters, numbers, and special characters"
  });
}

 const samePassword = await bcrypt.compare(newPassword, user.password);
if (samePassword) {
  return res.status(400).json({
    message: "New password must be different from old password"
  });
}

// ✅ Now update password
user.password = await bcrypt.hash(newPassword, 10);
await user.save();

  res.json({ message: "Password changed successfully" });
});

/* GET MY PROFILE */
router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).send("User not found");
  res.json(user);
});

module.exports = router;


