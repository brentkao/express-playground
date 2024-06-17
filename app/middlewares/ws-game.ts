import express, { Request, Response, NextFunction } from "express";
import { expressjwt, Request as JWTRequest } from "express-jwt";

// Game Token Data
import { gameTempTokenList } from "../data";

// game Token setting
export function validateGameToken(
  req: JWTRequest,
  res: Response,
  next: NextFunction
) {
  // get the token params
  const token = new URL(`https://www.express-playground.com${req.url}`).searchParams.get(
    "token"
  );
  // Check Token is exist
  if (token && gameTempTokenList.has(token)) {
    const auth = gameTempTokenList.get(token);
    req.auth = auth;
    // Token used to deleted
    gameTempTokenList.delete(token);
  }
  next();
}
