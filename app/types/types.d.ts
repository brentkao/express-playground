import "express";

declare module "express-serve-static-core" {
  interface JwtPayload {
    userId: string;
    role: "developer" | "api" | "user";
  }

  interface Request {
    auth?: JwtPayload;
  }
}
