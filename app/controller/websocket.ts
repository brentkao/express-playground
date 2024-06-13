import { Request } from "express";
import { WebSocket } from "ws";

export function wsGameConnection(ws: WebSocket, req: Request) {
  console.log("WebSocket connection opened");
  console.log("Request URL:", req.url);
  console.log("Request headers:", req.headers);

  ws.on("message", (msg) => {
    // 检查消息是否是 Buffer，并将其转换为字符串
    let message: string = "";
    if (msg instanceof Buffer) {
      message = msg.toString();
    } else if (typeof msg === "string") {
      message = msg as string;
    }
    console.log("received: %s", message);
    ws.send("Hello, WebSocket!");
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.send("Connected to WebSocket server!");
}
