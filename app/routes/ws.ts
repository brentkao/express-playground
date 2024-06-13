import express, { Express, Request } from "express";
import { WebSocket } from "ws";
import expressWs from "express-ws";
import swagger from "../swagger";
import { expressjwt as expressJwt, Request as JWTRequest } from "express-jwt";
import { wsJWT, roleCheck } from "../middlewares/jwt";
import c_Server from "../constants/server";
import { wsGameConnection, normalConnection } from "../controller/websocket";

export default function (app: Express) {
  //➫ 初始化 express-ws 並套用至 app
  expressWs(app);
  const router = express.Router();
  router.use(expressJwt(wsJWT).unless({ path: ["/"] }));

  //# 無需驗證身份的 WebSocket 服務
  //➫ get ws
  router.ws("/", normalConnection);

  //# 需驗證身份的 WebSocket 服務
  router.use(roleCheck("user"));
  router.ws("/game", wsGameConnection);

  app.use(c_Server.WEBSOCKET_SERVICE_PATH, router);
  swagger(app);
}
