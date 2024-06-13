import { logger } from "./app/util/logger";
logger("app", { msg: "Hello World!", retainLogs: false });
import express, { Express, Application } from "express";
import "express-async-errors"; 
import cors from "cors";
import { rateLimit } from 'express-rate-limit'
import routes from "./app/routes";
import { env } from "./env";
import { errorHandler } from "./app/middlewares/errors";

const app: Express = express();
const port: number = env.PORT;

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis, Memcached, etc. See below.
  skip: (req, res) => ["/"].includes(req.url) // Bypass the rate limit for some requests
})
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//➫ 設置路由
routes(app);

//➫ 錯誤處理
app.use(errorHandler);

async function main() {
  logger("app", { msg: "Starting server...", retainLogs: true });

}

main()
  .then(() => {
    //# 啟動伺服器監聽
    return app.listen(port, () =>
      logger("app", {
        msg: `Listening on port http://localhost:${port}`,
        retainLogs: true,
        pointer: true,
      })
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
