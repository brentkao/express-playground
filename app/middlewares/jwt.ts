import express, { Request, Response, NextFunction } from "express";
import { expressjwt, Request as JWTRequest } from "express-jwt";
import { Algorithm } from "jsonwebtoken"; // 確保從jsonwebtoken導入Algorithm類型
import { env } from "../../env";
import { UserRole } from "../util/jwt";

export const userJWT = {
  secret: env.JWT_SECRET,
  algorithms: ["HS256"] as Algorithm[], // 明確指定類型為Algorithm[]
};

export function roleCheck(role: UserRole) {
  return function (req: JWTRequest, res: Response, next: NextFunction) {
    if (req.auth && req.auth?.role === role) {
      next();
    } else {
      res.status(403).send("Access denied");
    }
  };
}
