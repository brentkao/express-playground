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

// Configure AWS S3
const s3 = new S3Client({
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto", // Cloudflare R2 does not require a region
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

/**
 * @swagger
 * tags:
 *  name: CloudFlare R2
 *  description: '照片 API'
 */

/**
 * @swagger
 * /api/cloudR2/upload:
 *   post:
 *     tags:
 *        - CloudFlare R2
 *     summary: Upload Image
 *     description: Upload Image.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successful upload.
 *       500:
 *         description: Error response with error message.
 */
export async function uploadImage(req: Request, res: Response) {
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

/**
 * @swagger
 * /api/cloudR2/getBuckets:
 *   get:
 *     tags:
 *        - CloudFlare R2
 *     summary: buckets list.
 *     description: buckets list.
 *     responses:
 *       200:
 *         description: Successful buckets list.
 *       500:
 *         description: Error response with error message.
 */
export async function getBuckets(req: Request, res: Response) {
  try {
    const command = new ListBucketsCommand({});
    const result = await s3.send(command);
    console.log("getBuckets ListBucketsCommand ", result);

    //! 不推薦直接回傳所有 bucket name，將會暴露自己的 bucket name
    const resData = result.Buckets?.map((bucket) => bucket.Name);

    return res.status(200).json({ data: resData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to list buckets",
      error: (error as Error).message,
    });
  }
}

/**
 * @swagger
 * /api/cloudR2/getObjects:
 *   get:
 *     tags:
 *        - CloudFlare R2
 *     summary: objects list.
 *     description: objects list.
 *     responses:
 *       200:
 *         description: Successful objects list.
 *       500:
 *         description: Error response with error message.
 */
export async function getObjects(req: Request, res: Response) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    });
    const result = await s3.send(command);

    // 篩選只包含 .png 和 .jpg 文件
    const filteredContents = result.Contents?.filter((object) => {
      const ext = path.extname(object.Key || "").toLowerCase();
      return ext === ".png" || ext === ".jpg";
    });

    const resData = filteredContents?.map(
      (object) => `${env.CLOUDFLARE_R2_CUSTOM_DOMAINS}/${object.Key}`
    );

    return res.status(200).json({ data: resData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to list objects",
      error: (error as Error).message,
    });
  }
}
