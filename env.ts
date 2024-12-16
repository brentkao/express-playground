require("dotenv").config();
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.preprocess((val) => {
    const valueAsString = String(val);
    const parsed = parseInt(valueAsString, 10);
    return !isNaN(parsed) ? parsed : 3000; // 使用默認值3000如果轉換失敗
  }, z.number()),
  JWT_SECRET: z.string().default("JWT_SECRET"),
  DATABASE_URL: z.string(),
  //# CloudFlare R2
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string(),
  CLOUDFLARE_API_TOKEN: z.string(),
  CLOUDFLARE_R2_CUSTOM_DOMAINS: z.string(),
  //# MailGun
  MAILGUN_API_KEY: z.string(),
  MAILGUN_KEY_SECRET: z.string(),
  MAILGUN_HOST: z.string(),
  MAILGUN_PORT: z.preprocess((val) => Number(val), z.number()),
  MAILGUN_USER: z.string(),
  MAILGUN_PASSWORD: z.string(),
  //# Target
  TARGET_EMAIL: z.string(),
});

const {
  NODE_ENV,
  PORT,
  JWT_SECRET,
  DATABASE_URL,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET_NAME,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_R2_CUSTOM_DOMAINS,
  MAILGUN_API_KEY,
  MAILGUN_KEY_SECRET,
  MAILGUN_HOST,
  MAILGUN_PORT,
  MAILGUN_USER,
  MAILGUN_PASSWORD,
  TARGET_EMAIL,
} = process.env;

const environment = environmentSchema.safeParse({
  NODE_ENV,
  PORT,
  JWT_SECRET,
  DATABASE_URL,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET_NAME,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_R2_CUSTOM_DOMAINS,
  MAILGUN_API_KEY,
  MAILGUN_KEY_SECRET,
  MAILGUN_HOST,
  MAILGUN_PORT,
  MAILGUN_USER,
  MAILGUN_PASSWORD,
  TARGET_EMAIL,
});

if (process.env.NODE_ENV !== "production") console.log(environment);

if (!environment.success) {
  console.log("Environment validation failed: ");
  console.error(environment.error.errors);
  process.exit(1);
}

export const env = environment.data;
