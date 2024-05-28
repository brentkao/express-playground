import multer from "multer";
import fs from "fs";
import path from "path";

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    console.log("file", file);
    // Flatten the filename to remove spaces
    const flattenedName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/\s+/g, "_");

    cb(null, Date.now() + flattenedName + path.extname(file.originalname)); // Appending extension
  },
});
export const upload = multer({ storage: storage });
