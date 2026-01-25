const path = require("path");

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXT = [".mp4", ".webm"];

module.exports = function validateUpload({ allowVideo = false } = {}) {
  return (req, res, next) => {
    if (!req.file && !req.files) return next();

    const files = req.file ? [req.file] : req.files;

    for (const f of files) {
      const ext = path.extname(f.originalname).toLowerCase();

      if (f.mimetype.startsWith("image/")) {
        if (!IMAGE_EXT.includes(ext)) {
          return res.status(400).send("Invalid image type");
        }
        continue;
      }

      if (allowVideo && f.mimetype.startsWith("video/")) {
        if (!VIDEO_EXT.includes(ext)) {
          return res.status(400).send("Invalid video type");
        }
        continue;
      }

      return res.status(400).send("Invalid file upload");
    }

    next();
  };
};