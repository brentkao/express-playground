import express, { Express, Request } from "express";
import expressWs from "express-ws";
import swagger from "../swagger";
import { expressjwt as expressJwt, Request as JWTRequest } from "express-jwt";
import { wsJWT, roleCheck } from "../middlewares/jwt";
import c_Server from "../constants/server";
import { wsGameConnection, normalConnection } from "../controller/websocket";
import { validateGameToken } from "../middlewares/ws-game";
import cors from "cors";

const allowedOrigins = ["http://localhost", "http://127.0.0.1"];
export default function (app: Express) {
  //TODO: 暫時允許所有來源, 之後要改成只允許特定來源
  //➫ 設定 CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.some((allowedOrigin) =>
            origin.startsWith(allowedOrigin)
          )
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
  //➫ 初始化 express-ws 並套用至 app
  expressWs(app);
  const router = express.Router();
  router.use(expressJwt(wsJWT).unless({ path: ["/"] }));
  router.use(validateGameToken);

  //# 無需驗證身份的 WebSocket 服務
  //➫ get ws
  router.ws("/", normalConnection);

  //# 需驗證身份的 WebSocket 服務
  router.use(roleCheck("user"));
  router.ws("/game", wsGameConnection);

  app.use(c_Server.WEBSOCKET_SERVICE_PATH, router);
  swagger(app);
}
