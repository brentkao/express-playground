console.log("Hello World!");
import express, { Express, Application } from "express";
import "express-async-errors"; 
import cors from "cors";
import routes from "./app/routes";
import { env } from "./env";
import { errorHandler } from "./app/middlewares/errors";

const app: Express = express();
const port: number = env.PORT;

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
  console.log("Starting server...");
}

main()
  .then(() => {
    //# 啟動伺服器監聽
    return app.listen(port, () =>
      console.log(`Listening on port http://localhost:${port}`)
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
