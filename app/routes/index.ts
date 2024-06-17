import express, { Express } from "express";
import swagger from "../swagger";
import * as user from "../controller/user";
import * as auth from "../controller/auth";
import * as error from "../controller/error";
import { expressjwt as expressJwt, Request as JWTRequest } from "express-jwt";
import { userJWT, roleCheck } from "../middlewares/jwt";
import path from "path";

export default function (app: Express) {
  const router = express.Router();

  //➫ get error demo
  router.get("/error", error.error);

  //➫ auth
  const authRouter = express.Router();
  router.use("/auth", authRouter);
  //User//
  authRouter.post("/user/login", auth.userLogin);
  authRouter.get("/user/logout", auth.userLogout);

  //➫ user
  const userRouter = express.Router();
  router.use("/user", userRouter);
  userRouter.post("/register", user.register);
  //以下驗證 身份
  userRouter.use(expressJwt(userJWT), roleCheck("user"));
  userRouter.get("/do-something", user.doSomething);
  userRouter.get("/gameAccessToken", user.getGameAccessToken);

  app.use("/api", router);
  swagger(app);
}
