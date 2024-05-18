import jwt from "jsonwebtoken";
import { env } from "../../env";

// 定義一個類型來限定用戶角色的可能值
export type UserRole = "developer" | "api" | "user";

// 定義JwtPayload接口
export interface JwtPayload {
  userId: string; // 用戶的唯一標識
  role: UserRole; // 用戶的角色
  // 根據需要可以添加更多的屬性
}

// 定義一個接口來描述JWT payload的結構
export function generateLoginJwt(payload: JwtPayload) {
  const secretKey = env.JWT_SECRET;
  const token = jwt.sign(payload, secretKey, { expiresIn: "24h" });
  return token;
}
