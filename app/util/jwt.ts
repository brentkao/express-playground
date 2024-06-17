import jwt, {
  TokenExpiredError,
  JsonWebTokenError,
  NotBeforeError,
} from "jsonwebtoken";

import { env } from "../../env";

// 定義JWT錯誤的類型
export enum JWTErrorType {
  Expired = "TokenExpiredError",
  Invalid = "JsonWebTokenError",
  NotActive = "NotBeforeError",
  Unknown = "UnknownError",
}

// 定義一個類型來描述JWT驗證的結果
export type VerifyJwtResult = [true, JwtPayload] | [false, JWTErrorType];

// 定義一個類型來限定用戶角色的可能值
export type UserRole = "developer" | "api" | "user";

// 定義JwtPayload接口
export interface JwtPayload {
  /** 用戶的唯一標識 */
  userId: string;
  /** 用戶的角色 */
  role: UserRole;
  // 根據需要可以添加更多的屬性
}

// 定義一個接口來描述JWT payload的結構
export function generateLoginJwt(payload: JwtPayload) {
  const secretKey = env.JWT_SECRET;
  const token = jwt.sign(payload, secretKey, { expiresIn: "24h" });
  return token;
}

// 定義一個函數來驗證JWT token
export function verifyJwt(token: string): VerifyJwtResult {
  const secretKey = env.JWT_SECRET;

  try {
    const payload = jwt.verify(token, secretKey) as JwtPayload;
    return [true, payload];
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      console.error("Token expired:", error.message);
      return [false, JWTErrorType.Expired];
    } else if (error instanceof JsonWebTokenError) {
      console.error("JWT error:", error.message);
      return [false, JWTErrorType.Invalid];
    } else if (error instanceof NotBeforeError) {
      console.error("JWT not active:", error.message);
      return [false, JWTErrorType.NotActive];
    } else {
      console.error("Unknown error:", error);
      return [false, JWTErrorType.Unknown];
    }
  }
}
