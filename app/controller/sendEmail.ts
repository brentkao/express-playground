import { Request, Response } from "express";
import fs from "fs";

import BadRequestError from "../errors/bad-request-error";
import { env } from "../../env";
import {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand, // 這裡是用來上傳檔案的(!不推上傳大檔案，如果上傳過程中斷，必須重新上傳整個文件，沒有斷點續傳功能)
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import path from "path";
import { z } from "zod";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

// 獲取 uploads 資料夾的絕對路徑
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// 檢查並創建 uploads 資料夾（如果不存在）
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure AWS S3
const s3 = new S3Client({
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto", // Cloudflare R2 does not require a region
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

// Nodemailer 設定
const mailgunTransporter = nodemailer.createTransport({
  host: env.MAILGUN_HOST,
  port: env.MAILGUN_PORT,
  auth: {
    user: env.MAILGUN_USER,
    pass: env.MAILGUN_PASSWORD,
  },
});

export async function sendEmail(req: Request, res: Response) {
  //step validate request
  const inputSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    product: z.string().min(1, "Product is required"),
    quantity: z.number().int().min(1, "Quantity is required"),
    price: z.number().int().min(1, "Price is required"),
  });

  const body = inputSchema.parse(req.body);
  console.log("已接收 body", body);

  const { name, email, product, quantity, price } = body;
  const pdfPath = path.join(uploadsDir, `quotation_${Date.now()}.pdf`);
  const businessEmail = "parazeni2023@gmail.com";

  // 計算總價
  const totalPrice = quantity * price;

  // 使用 PDFKit 生成 PDF
  const doc = new PDFDocument();
  const fileStream = fs.createWriteStream(pdfPath);

  fileStream
    .on("finish", async () => {
      console.log("PDF 檔案寫入完成");

      const fileStream = fs.createReadStream(pdfPath);
      console.log("PDF 完成，開始上傳至 R2");

      try {
        // 上傳至 R2 使用 Upload
        const upload = new Upload({
          client: s3,
          params: {
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
            Key: path.basename(pdfPath),
            Body: fileStream,
            ContentType: "application/pdf",
            ACL: "public-read",
          },
        });
  
        upload.on("httpUploadProgress", (progress) => {
          console.log("R2 parallelUploads3 httpUploadProgress", progress);
        });
  
        const uploadResult = await upload.done();
        console.log("R2 uploadResult", uploadResult);
  
        const fileUrl = `${env.CLOUDFLARE_R2_CUSTOM_DOMAINS}/${path.basename(
          pdfPath
        )}`;
  
        // 設置郵件內容
        const mailOptions = {
          from: `報價單服務 <${businessEmail}>`,
          to: [email, businessEmail],
          subject: "Your Quotation",
          text: `請透過以下連結讀取您的報價單: ${fileUrl}`,
          html: `<p>請透過以下連結讀取您的報價單:</p><a href="${fileUrl}">開啟報價單</a>`,
        };
  
        // 發送郵件
        mailgunTransporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Failed to send email:", error);
            return res
              .status(500)
              .json({ message: "Error sending email", error });
          }
          res.json({
            message: "Quotation generated, uploaded, and emailed successfully",
            url: fileUrl,
          });
        });
      } catch (error) {
        return res.status(500).json({ message: "Error uploading PDF", error });
      } finally {
        fs.unlinkSync(pdfPath); // 刪除本地生成的 PDF
      }
    })
    .on("error", (error) => {
      console.error("寫入文件錯誤:", error);
      return res.status(500).json({ message: "Error writing PDF", error });
    });

  doc.pipe(fileStream);
  doc.fontSize(20).text("Quotation", { align: "center" });
  doc.moveDown();
  doc.text(`Name: ${name}`);
  doc.text(`Email: ${email}`);
  doc.text(`Product: ${product}`);
  doc.text(`Quantity: ${quantity}`);
  doc.text(`Price per Unit: $${price}`);
  doc.text(`Total Price: $${totalPrice}`);
  doc.end();
  console.log("doc 編輯完成");
}

export async function uploadPDFAndSendEmail(req: Request, res: Response) {
  //step validate request
  console.log("req.file", req.file);
  const file = req.file;
  if (!file) throw new BadRequestError({ message: "No file uploaded" });

  //step upload image to cloudflare
  const filePath = file.path;
  const fileStream = fs.createReadStream(filePath);
  try {
    // Upload the image to S3
    const parallelUploads3 = new Upload({
      client: s3,
      params: {
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME as string,
        Key: file.filename,
        Body: fileStream,
        ContentType: file.mimetype,
        ACL: "public-read", // or any other appropriate ACL
      },
    });

    parallelUploads3.on("httpUploadProgress", (progress) => {
      console.log("R2 parallelUploads3 httpUploadProgress", progress);
    });

    const uploadResult = await parallelUploads3.done();
    console.log("R2 uploadResult", uploadResult);

    const url = `${env.CLOUDFLARE_R2_CUSTOM_DOMAINS}/${file.filename}`;

    return res
      .status(200)
      .json({ message: "File uploaded successfully", data: url });
  } catch (error) {
    console.error(error);
    throw new BadRequestError({ message: "File upload failed" });
  } finally {
    // Clean up the uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
