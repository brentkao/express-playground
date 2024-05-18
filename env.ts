require("dotenv").config();
import { z } from "zod";

const environmentSchema = z.object({
  PORT: z.preprocess((val) => {
    const valueAsString = String(val);
    const parsed = parseInt(valueAsString, 10);
    return !isNaN(parsed) ? parsed : 3000; // 使用默認值3000如果轉換失敗
  }, z.number()),
  JWT_SECRET: z.string().default("JWT_SECRET"),
  DATABASE_URL: z.string(),
});

const { PORT, JWT_SECRET, DATABASE_URL } = process.env;

const environment = environmentSchema.safeParse({
  PORT,
  JWT_SECRET,
  DATABASE_URL,
});

if(process.env.NODE_ENV !== "production") console.log(environment);

if (!environment.success) {
  console.log("Environment validation failed: ");
  console.error(environment.error.errors);
  process.exit(1);
}

export const env = environment.data;
