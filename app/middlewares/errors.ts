import e, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { CustomError } from "../errors/custom-error";
import { UnauthorizedError as JWTUnauthorizedError } from "express-jwt";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("===== [middlewares] errorHandler =====");
  // Handled errors
  if (err instanceof CustomError) {
    return handleCustomError(err, res);
  }

  // Zod errors
  if (err instanceof ZodError) {
    return handleZodError(err, res);
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  // JWT errors
  if (err instanceof JWTUnauthorizedError) {
    return handleJWTError(err, res);
  }

  // Unhandled errors
  return handleGenericError(err, res);
};

const handleCustomError = (err: CustomError, res: Response) => {
  const { statusCode, errors, logging } = err;
  if (logging) {
    console.error(
      JSON.stringify(
        {
          code: err.statusCode,
          errors: err.errors,
          stack: err.stack,
        },
        null,
        2
      )
    );
  }

  return res.status(statusCode).json({ errors });
};

function handleZodError(err: ZodError, res: Response) {
  if (process.env.NODE_ENV !== "production") {
    console.error(JSON.stringify(err, null, 2));
  }

  const errors = err.errors.map((error) => ({
    field: error.path.join("."),
    error: error.message,
    code: error.code,
  }));
  return res.status(400).json({ errors });
}

function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
) {
  let message = "The data access error.";
  let responseMsg = "Access denied.";
  switch (err.code) {
    case "P2002": // 唯一約束違反
      message = "A unique constraint violation occurred.";
      responseMsg = "Already exists.";
      break;
    case "P2003": // 外鍵約束違反
      message = "A foreign key constraint violation occurred.";
      break;
    case "P2025": // 找不到記錄或無法滿足查詢條件
      message = "The record was not found.";
      responseMsg = "Not found.";
      break;
    case "P2004": // 約束違反
      message = "A constraint violation occurred.";
      break;
  }
  //TODO 特別寫入錯誤日誌
  console.log("⛔ Prisma Error: ", message);

  return res.status(500).json({ errors: responseMsg });
}

function handleJWTError(err: JWTUnauthorizedError, res: Response) {
  let message = "UnauthorizedError";
  switch (err.code) {
    case "credentials_bad_scheme":
      message = "Invalid token format";
      break;
    case "credentials_bad_format":
      message = "Invalid token format";
      break;
    case "credentials_required":
      message = "Token required";
      break;
    case "invalid_token":
      message = "Invalid token";
      break;
    case "revoked_token":
      message = "Token revoked";
      break;
  }
  //TODO 特別寫入錯誤日誌
  console.log("⛔ JWT Error: ", message);

  return res.status(401).json({ errors: "Unauthorized Error" });
}

function handleGenericError(err: Error, res: Response) {
  //TODO 特別寫入錯誤日誌
  console.error(
    JSON.stringify(
      {
        message: err.message,
        stack: err.stack,
      },
      null,
      2
    )
  );
  return res.status(500).json({ errors: "Something went wrong" });
}
