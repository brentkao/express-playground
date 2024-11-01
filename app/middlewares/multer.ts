import multer, { FileFilterCallback } from "multer";
import fs from "fs";
import path from "path";
import { Request } from "express";
import BadRequestError from "../errors/bad-request-error";

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

// 文件格式過濾器，僅允許 PDF
const pdfFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true); // 接受文件
  } else {
    cb(
      new BadRequestError({ code: 400, message: "Only PDF files are allowed!" })
    ); // 拒絕非 PDF 文件
  }
};

export const uploadPdf = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
});
