import express, { Express, Request } from "express";
import { WebSocket } from "ws";
import expressWs from "express-ws";
import swagger from "../swagger";
import { expressjwt as expressJwt, Request as JWTRequest } from "express-jwt";
import { userJWT, roleCheck } from "../middlewares/jwt";
import c_Server from "../constants/server";
import { wsGameConnection } from '../controller/websocket';

export default function (app: Express) {
  //➫ 初始化 express-ws 並套用至 app
  expressWs(app);
  const router = express.Router();

  //➫ get ws
  router.ws("/game", wsGameConnection);

  //# 以下驗證 身份
  router.use(expressJwt(userJWT), roleCheck("developer"));

  app.use(c_Server.WEBSOCKET_SERVICE_PATH, router);
  swagger(app);
}
