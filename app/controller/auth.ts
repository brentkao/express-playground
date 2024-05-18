import { Request, Response } from "express";
import { prisma } from "../prisma";
import { z } from "zod";
import { generateLoginJwt } from "../util/jwt";
import BadRequestError from "../errors/bad-request-error";
import bcrypt from "bcryptjs";
import { formatZodValidationErrors } from "../util/zod";

/**
 * @swagger
 * tags:
 *  name: Auth
 *  description: '身份管理 API'
 */

/**
 * @swagger
 * /api/auth/user/login:
 *   post:
 *     tags:
 *        - Auth
 *     summary: Login Auth Account
 *     description: Login Auth Account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Successful login.
 *       500:
 *         description: Error response with error message.
 */
export async function userLogin(req: Request, res: Response) {
  //step validate request
  console.log("req.body", req.body);

  const result = z
    .object({
      email: z.string().email("Invalid email").min(1, "Email is required"),
      password: z.string().min(1, "Password is required"),
    })
    .safeParse(req.body);
  if (!result.success)
    throw new BadRequestError({
      context: formatZodValidationErrors(result.error),
    });
  const { email, password } = result.data;

  //step find user
  const user = await prisma.account.findUnique({
    where: {
      email,
    },
    select: {
      uid: true,
      email: true,
      hash: true,
    },
  });

  if (user === null) {
    throw new BadRequestError({
      code: 404,
      message: "Invalid email or password",
    });
  }

  //step compare password
  const match = await bcrypt.compare(password, user.hash);
  if (!match) {
    throw new BadRequestError({
      message: "Invalid email or password",
    });
  }

  const token = generateLoginJwt({
    role: "user",
    userId: user.uid,
  });

  return res.status(200).json({ token: token });
}

/**
 * @swagger
 * /api/auth/user/logout:
 *   get:
 *     tags:
 *         - Auth
 *     summary: Logout Account
 *     description: Logout Account.
 *     responses:
 *       200:
 *         description: Successful logout.
 *       500:
 *         description: Error response with error message.
 */
export async function userLogout(req: Request, res: Response) {
  try {
    res.json({ status: 1, message: "Logout success." });
  } catch (error: any) {
    console.error("Error: ", error);
    let message = error?.message || "Error";
    res.status(500).json({ status: 100, error: message });
  }
}
