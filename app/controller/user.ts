import { Request, Response } from "express";
import { prisma } from "../prisma";
import { z } from "zod";
import { ulid } from "ulid";
import bcrypt from "bcryptjs";

import BadRequestError from "../errors/bad-request-error";
import { formatZodValidationErrors } from "../util/zod";

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     tags:
 *       - user
 *     summary: Register a new user account
 *     description: Allows new user to register an account by providing their details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                  type: string
 *                  example: "user@example.com"
 *               first_name:
 *                  type: string
 *                  example: "First"
 *               last_name:
 *                  type: string
 *                  example: "Last"
 *               password:
 *                  type: string
 *                  example: "password123"
 *               country:
 *                  type: string
 *                  example: "Taiwan"
 *               country_code:
 *                  type: string
 *                  example: "+886"
 *               phone_number:
 *                  type: string
 *                  example: "0912345678"
 *               birth_date:
 *                  type: string
 *                  example: "1900-01-01"
 *     responses:
 *       200:
 *         description: Successfully registered the user account.
 *       400:
 *         description: Invalid request data.
 */
export async function register(req: Request, res: Response) {
  const result = z
    .object({
      email: z.string().email("Invalid email").min(1, "Email is required"),
      first_name: z.string().min(1, "First Name is required"),
      last_name: z.string().min(1, "Last Name is required"),
      password: z.string().min(1, "Password is required"),
      country: z
        .string()
        .min(1, "Country is required")
        .max(45, "Country is invalid"),
      country_code: z.string().min(1, "Country Code is required"),
      phone_number: z
        .string()
        .min(1, "Phone Number is required")
        .max(15, "Phone Number is invalid"),
      birth_date: z.preprocess((arg) => {
        if (typeof arg === "string") return new Date(arg);
        return arg;
      }, z.date().min(new Date("1900-01-01"), "Birth Date is invalid")),
    })
    .safeParse(req.body);
  if (!result.success)
    throw new BadRequestError({
      context: formatZodValidationErrors(result.error),
    });
  const {
    email,
    first_name,
    last_name,
    password,
    country,
    country_code,
    phone_number,
    birth_date,
  } = result.data;

  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);

  // 使用鹽對密碼進行哈希
  const hashedPassword = await bcrypt.hash(password, salt);
  const userData = {
    uid: ulid(),
    email,
    first_name,
    last_name,
    salt: salt,
    hash: hashedPassword,
    country,
    country_code,
    phone_number,
    birth_date,
  };
  console.log("userData", userData);

  const createResult = await prisma.account.create({
    data: userData,
  });

  const resData = {
    uid: createResult.uid,
    createTime: createResult.create_at,
  };

  return res.status(200).json({ message: "Registered", data: resData });
}

export async function doSomething(req: Request, res: Response) {
  return res.status(200).json({ message: "doing something..." });
}
