import { WebSocket, RawData } from "ws";
import { Request as JWTRequest } from "express-jwt";

function stringMsg(msg: RawData): string {
  let message: string = "";
  if (msg instanceof Buffer) {
    message = msg.toString();
  } else if (typeof msg === "string") {
    message = msg as string;
  }
  return message;
}

export function normalConnection(ws: WebSocket, req: JWTRequest) {
  console.log("WebSocket normalConnection opened");
  console.log("Request URL:", req.url);
  console.log("Request headers:", req.headers);
  console.log("Request auth:", req.auth);

  ws.on("message", (msg) => {
    const message = stringMsg(msg);
    console.log("received: %s", message);
    ws.send("Welcome to Normal Connection!");
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.send("Connected to WebSocket server!");
}

export function wsGameConnection(ws: WebSocket, req: JWTRequest) {
  console.log("WebSocket wsGameConnection opened");
  console.log("Request URL:", req.url);
  console.log("Request headers:", req.headers);
  console.log("Request auth:", req.auth);

  ws.on("message", (msg) => {
    const message = stringMsg(msg);
    console.log("received: %s", message);
    ws.send(`Hello, ${req.auth?.userId}!`);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.send("Connected to WebSocket server!");
}
