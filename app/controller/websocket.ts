import { z } from "zod";
import { WebSocket, RawData } from "ws";
import { Request as JWTRequest } from "express-jwt";
import { NormalWS, GameWS } from "../constants/websocket";
import { logger, loggerTable } from "../util/logger";
import { formatZodValidationErrors } from "../util/zod";

function stringMsg(msg: RawData): string {
  let message: string = "";
  if (msg instanceof Buffer) {
    message = msg.toString();
  } else if (typeof msg === "string") {
    message = msg as string;
  }
  return message;
}

function parseJsonString<T>(str: string): [true, T] | [false, undefined] {
  try {
    const data = JSON.parse(str) as T;
    return [true, data];
  } catch (e) {
    console.log("Error parsing JSON string:", e);
    return [false, undefined];
  }
}

/** 傳送訊息(JSON) */
// 定義函數重載（Function Overloading）
function sendMessage<T>(
  ws: WebSocket,
  type: NormalWS.MessageType,
  data: T
): void;
function sendMessage<T>(ws: WebSocket, type: GameWS.MessageType, data: T): void;
// 實際實現函數
function sendMessage<T>(ws: WebSocket, type: any, data: T): void {
  const message = { type, data };
  ws.send(JSON.stringify(message));
}
//-----------------------------------------------------------//
function createEmptyBoard() {
  const size = 20;
  const board = [];
  for (let i = 0; i < size; i++) {
    board.push(new Array(size).fill(null));
  }
  return board;
}
/** 判斷房間是否已滿 */
function isRoomFull(room: GameWS.GameRoomDetail): boolean {
  return room.players.length === room.size;
}
/** 用於儲存遊戲房間(GameRoomDetail) */
let rooms: { [key: string]: GameWS.GameRoomDetail } = {};
/** 用於儲存玩家(WS) */
let players: { [key: string]: WebSocket } = {};
/** 紀錄玩家數量 */
let playerCount = 0;
/** 紀錄玩家是否在房間中(roomId) */
let playerIsInRoom: { [key: string]: string } = {};
//-----------------------------------------------------------//
export function normalConnection(ws: WebSocket, req: JWTRequest) {
  logger("WebSocket", { msg: "normalConnection opened" });
  logger("WebSocket", { msg: "Request URL:", data: req.url });
  logger("WebSocket", { msg: "Request headers:", data: req.headers });
  logger("WebSocket", { msg: "Request auth:", data: req.auth });

  ws.on("message", (msg) => {
    const message = stringMsg(msg);
    const [isJsonString, receivedMessage] = parseJsonString<{ asn: string }>(
      message
    );
    logger("WebSocket", {
      msg: `received: ${isJsonString}`,
      data: receivedMessage,
    });
    if (isJsonString) {
      sendMessage(ws, NormalWS.MessageType.Notification, {
        msg: "Welcome to Normal Connection!",
        detail: receivedMessage.asn,
      });
    } else {
      sendMessage(ws, NormalWS.MessageType.Error, {
        msg: "Invalid message format(Not JSON).",
      });
      return;
    }
  });

  ws.on("close", () => {
    logger("WebSocket", { msg: "normalConnection connection closed" });
  });

  ws.on("error", (err) => {
    logger("WebSocket", { msg: "normalConnection error:", data: err });
  });

  sendMessage(ws, GameWS.MessageType.Notification, {
    msg: "Welcome to Normal Connection!",
  });
}

export function wsGameConnection(ws: WebSocket, req: JWTRequest) {
  console.log("WebSocket wsGameConnection opened");
  console.log("Request URL:", req.url);
  console.log("Request headers:", req.headers);
  console.log("Request auth:", req.auth);
  if (!req.auth?.userId) return;
  players[req.auth.userId] = ws; // 紀錄玩家
  playerCount++; // 玩家數量+1

  ws.on("message", (msg) => {
    if (!req.auth?.userId) return;
    const userId = req.auth.userId;

    const message = stringMsg(msg);
    try {
      const parsedMessage = JSON.parse(message);
      logger("WebSocket", { msg: "received:", data: parsedMessage });
      const type = parsedMessage.type as GameWS.MessageType;

      switch (type) {
        case GameWS.MessageType.CreateRoom:
          // Check if the player is already in a room
          if (playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are already in a room.`,
            });

          // Check request format
          const crRequestDetail = parsedMessage.data as GameWS.CreateRoomDetail;
          const crValidationResult =
            GameWS.CreateRoomDetailSchema.safeParse(crRequestDetail);
          if (!crValidationResult.success)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Invalid CreateRoom message format.`,
              context: formatZodValidationErrors(crValidationResult.error),
            });

          // Create a new room
          const newRoomId = Math.random().toString(36).substring(2);
          playerIsInRoom[userId] = newRoomId;
          rooms[newRoomId] = {
            host: userId,
            isPublic: crRequestDetail.isPublic,
            size: crRequestDetail.detail.size,
            players: [userId],
            gameStatus: false,
            currentPlayer: "",
            board: [],
          };
          sendMessage(ws, GameWS.MessageType.CreateRoom, {
            msg: `Create room success!`,
            detail: {
              roomId: newRoomId,
              ...rooms[newRoomId],
            },
          });

          logData();

          break;

        case GameWS.MessageType.JoinRoom:
          // Check if the player is already in a room
          if (playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are already in a room.`,
            });

          // Check request format
          const jrRequestDetail = parsedMessage.data as GameWS.JoinRoomDetail;
          const jrValidationResult =
            GameWS.JoinRoomDetailSchema.safeParse(jrRequestDetail);
          if (!jrValidationResult.success)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Invalid CreateRoom message format.`,
              context: formatZodValidationErrors(jrValidationResult.error),
            });

          // Check if the room exists
          if (!rooms[jrRequestDetail.roomId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room not found.`,
            });

          // Check if the room is full
          const room = rooms[jrRequestDetail.roomId];
          if (isRoomFull(room))
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room is full.`,
            });
          //TODO isPublic 的做法( 目前 roomId 就是 私人房間的 key)
          // Join the room
          playerIsInRoom[userId] = jrRequestDetail.roomId;
          room.players.push(userId); // Add player to the room

          // Notify all players in the room
          for (const player of room.players) {
            if (players[player]) {
              // Notify other players in the room
              sendMessage(players[player], GameWS.MessageType.Notification, {
                msg: `${userId} joined the room.`,
              });
              // Notify Room Detail is updated
              sendMessage(players[player], GameWS.MessageType.RoomDetail, {
                msg: "Room updated.",
                detail: { roomId: jrRequestDetail.roomId, ...room },
              });
            }

            // Notify player to start the game (Room full)
            if (isRoomFull(room)) {
              sendMessage(players[player], GameWS.MessageType.Notification, {
                msg: "Room is full. Please start the game.",
              });
            }
          }

          logData();

          break;

        case GameWS.MessageType.JoinRandomRoom:
          // Check if the player is already in a room
          if (playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are already in a room.`,
            });

          // Get all public rooms && Room is not full
          const jrrPublicRooms = Object.entries(rooms).filter(
            ([roomId, room]) => room.isPublic && room.players.length < room.size
          );
          // Check if there is any public room available then notify the player
          if (jrrPublicRooms.length === 0)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `No public room available.`,
            });
          // Get a random roomId
          const randomRoomId =
            jrrPublicRooms[
              Math.floor(Math.random() * jrrPublicRooms.length)
            ][0];
          logger("WebSocket", { msg: "randomRoomId:", data: randomRoomId });
          // Join the room
          playerIsInRoom[userId] = randomRoomId;
          rooms[randomRoomId].players.push(userId); // Add player to the room
          // Notify all players in the room
          for (const player of rooms[randomRoomId].players) {
            if (players[player]) {
              // Notify other players in the room
              sendMessage(players[player], GameWS.MessageType.Notification, {
                msg: `${userId} joined the room.`,
              });
              // Notify Room Detail is updated
              sendMessage(players[player], GameWS.MessageType.RoomDetail, {
                msg: "Room updated.",
                detail: { roomId: randomRoomId, ...rooms[randomRoomId] },
              });
            }
            // Notify player to start the game (Room full)
            if (isRoomFull(rooms[randomRoomId])) {
              sendMessage(players[player], GameWS.MessageType.Notification, {
                msg: "Room is full. Please start the game.",
              });
            }
          }
          logData();
          break;

        case GameWS.MessageType.LeaveRoom:
          // Check if the player is not in a room
          if (!playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are not in a room.`,
            });
          // Check if the room exists
          if (rooms[playerIsInRoom[userId]]) {
            const room = rooms[playerIsInRoom[userId]];
            // Check if the game is running
            if (room.gameStatus)
              return sendMessage(ws, GameWS.MessageType.Error, {
                msg: `Game is running. You cannot leave the room.`,
              });

            const isHostLeaving = room.host === userId;
            // Notify other players in the room (also remove the leaving player from the room)
            room.players = room.players.filter((player) => player !== userId); // 剩餘在房間的玩家(不包含離開的玩家)
            for (const player of room.players) {
              if (players[player]) {
                sendMessage(players[player], GameWS.MessageType.Notification, {
                  msg: `${userId} left the room.`,
                });
                // Notify Room Detail is updated
                sendMessage(players[player], GameWS.MessageType.RoomDetail, {
                  msg: "Room updated.",
                  detail: { roomId: playerIsInRoom[userId], ...room },
                });
              }
              if (isHostLeaving) {
                // Update room host if the host is leaving
                room.host = room.players[0];
                sendMessage(players[player], GameWS.MessageType.Notification, {
                  msg: `New host is ${room.host}.`,
                });
              }
            }
            // Remove room if no player
            if (room.players.length === 0) delete rooms[playerIsInRoom[userId]];
            // Remove player from the room
            delete playerIsInRoom[userId];
            sendMessage(ws, GameWS.MessageType.Notification, {
              msg: `Leave room success.`,
            });
            logData();
          } else {
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room is not exist.`,
            });
          }

          break;

        case GameWS.MessageType.PublicRoomList:
          // Get all public rooms
          const prlPublicRooms = Object.entries(rooms).filter(
            ([roomId, room]) => room.isPublic
          );

          // Mapping the public rooms with specify room data info
          const prlRoomList = prlPublicRooms.map(([roomId, room]) => ({
            roomId,
            host: room.host,
            isPublic: room.isPublic,
            size: room.size,
            players: room.players,
            gameStatus: room.gameStatus,
          }));

          // Response to the player
          sendMessage(ws, GameWS.MessageType.PublicRoomList, {
            msg: "Public room list.",
            rooms: prlRoomList,
          });

          logger("WebSocket", { msg: "Public room list:", data: prlRoomList });
          //TODO: 監聽公開房間的變化，並通知所有「大廳」玩家 (應該獨立開大廳 Message Type)

          break;

        case GameWS.MessageType.RoomDetail:
          // Check if the player is not in a room
          if (!playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are not in a room.`,
            });

          // Check if the room exists
          if (rooms[playerIsInRoom[userId]]) {
            const room = rooms[playerIsInRoom[userId]];
            // Notify Room Detail
            sendMessage(ws, GameWS.MessageType.RoomDetail, {
              msg: "Room detail.",
              detail: { roomId: playerIsInRoom[userId], ...room },
            });
          } else {
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room is not exist.`,
            });
          }
          break;
        case GameWS.MessageType.StartGame:
          // Check if the player is not in a room
          if (!playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are not in a room.`,
            });
          const sgRoomId = playerIsInRoom[userId];
          // Check if the room exists
          if (!rooms[sgRoomId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room is not exist.`,
            });
          const sgRoom = rooms[sgRoomId];
          // Check is the player is the host
          if (sgRoom.host !== userId)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are not the host.`,
            });
          // Check if the room is full
          if (!isRoomFull(sgRoom))
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room is not full.`,
            });
          // Check if the game is not running
          if (sgRoom.gameStatus)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Game is already running.`,
            });
          // Start the game
          sgRoom.gameStatus = true;
          sgRoom.board = createEmptyBoard();
          sgRoom.currentPlayer = sgRoom.players[0];
          // Notify all players in the room
          for (const player of sgRoom.players) {
            if (players[player]) {
              sendMessage(players[player], GameWS.MessageType.Notification, {
                msg: `Game started.`,
              });
              sendMessage(players[player], GameWS.MessageType.RoomDetail, {
                msg: "Room updated.",
                detail: { roomId: sgRoomId, ...sgRoom },
              });
              sendMessage(players[player], GameWS.MessageType.NextPlayer, {
                msg: `Next player is ${sgRoom.currentPlayer}.`,
              });
            }
          }
          // Notify the first player to play
          sendMessage(
            players[sgRoom.currentPlayer],
            GameWS.MessageType.Notification,
            {
              msg: `Your turn.`,
            }
          );

          logger("WebSocket", { msg: "Game started.", data: sgRoom, depth: 2 });

          break;

        case GameWS.MessageType.GameMakeMove:
          // Check if the player is not in a room
          if (!playerIsInRoom[userId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `You are not in a room.`,
            });
          const gmmRoomId = playerIsInRoom[userId];
          // Check if the room exists
          if (!rooms[gmmRoomId])
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Room is not exist.`,
            });
          const gmmRoom = rooms[gmmRoomId];
          // Check if the game is running
          if (!gmmRoom.gameStatus)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Game is not running.`,
            });
          // Check if it is the player's turn
          if (gmmRoom.currentPlayer !== userId)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Not your turn.`,
            });
          // Check request format
          const gmmRequestDetail = parsedMessage.data as {
            x: number;
            y: number;
          }; //TODO: Define GameMakeMoveDetailSchema
          const gmmValidationResult = z
            .object({
              x: z.number().int().min(0).max(19),
              y: z.number().int().min(0).max(19),
            })
            .safeParse(gmmRequestDetail);
          if (!gmmValidationResult.success)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Invalid GameMakeMove message format.`,
              context: formatZodValidationErrors(gmmValidationResult.error),
            });
          // Check if the move is valid
          if (gmmRoom.board[gmmRequestDetail.x][gmmRequestDetail.y] !== null)
            return sendMessage(ws, GameWS.MessageType.Error, {
              msg: `Invalid move.`,
            });
          // Make the move
          gmmRoom.board[gmmRequestDetail.x][gmmRequestDetail.y] = userId;
          //TODO: Check if the game is over
          if (Math.random()*100 < 5) {
            // Randomly end the game
            gmmRoom.gameStatus = false; // End the game
            gmmRoom.currentPlayer = ""; // Reset current player
            gmmRoom.board = []; // Clear the board
            // Notify all players in the room
            for (const player of gmmRoom.players) {
              if (players[player]) {
                sendMessage(players[player], GameWS.MessageType.Notification, {
                  msg: `Game over. ${userId} wins.`,
                });
                sendMessage(players[player], GameWS.MessageType.RoomDetail, {
                  msg: "Room updated.",
                  detail: { roomId: gmmRoomId, ...gmmRoom },
                });
                sendMessage(ws, GameWS.MessageType.GameOver, {
                  msg: `Game over. ${userId} wins.`,
                  result: {
                    //Fake data
                    winner: userId,
                    board: gmmRoom.board,
                    point: 100,
                  },
                });
              }
            }
            return;
          }
          // Switch to the next player
          const currentPlayerIndex = gmmRoom.players.indexOf(userId);
          const nextPlayerIndex =
            (currentPlayerIndex + 1) % gmmRoom.players.length;
          gmmRoom.currentPlayer = gmmRoom.players[nextPlayerIndex];
          // Notify all players in the room
          for (const player of gmmRoom.players) {
            if (players[player]) {
              sendMessage(players[player], GameWS.MessageType.Notification, {
                msg: `Move made by ${userId}.`,
              });
              sendMessage(players[player], GameWS.MessageType.RoomDetail, {
                msg: "Room updated.",
                detail: { roomId: gmmRoomId, ...gmmRoom },
              });
              sendMessage(players[player], GameWS.MessageType.NextPlayer, {
                msg: `Next player is ${gmmRoom.currentPlayer}.`,
              });
            }
          }
          // Notify the next player to play
          sendMessage(
            players[gmmRoom.currentPlayer],
            GameWS.MessageType.Notification,
            {
              msg: `Your turn.`,
            }
          );

          logger("WebSocket", {
            msg: "Game move made.",
            data: gmmRoom.board,
          });

          break;

        default:
          sendMessage(ws, GameWS.MessageType.Error, {
            msg: "Invalid message type.",
          });

          break;
      }
      return;
    } catch (error) {
      logger("WebSocket", { msg: "Error parsing JSON string:", data: error });
      sendMessage(ws, GameWS.MessageType.Error, {
        msg: "Invalid message format(Not JSON).",
      });
    }
  }); //end of ws.on("message")

  ws.on("close", () => {
    logger("WebSocket", { msg: "wsGameConnection connection closed" });
    if (!req.auth?.userId) return;
    const userId = req.auth.userId;
    //TODO Check if the user is still in a room and game is not done
    if (playerIsInRoom[userId] && rooms[playerIsInRoom[userId]].gameStatus) {
      logger("WebSocket", { msg: "WS is closing. Game is still running." });
    }
    playerCount -= 1; // 玩家數量-1
    delete players[userId]; // 刪除玩家
    delete playerIsInRoom[userId]; // 刪除玩家是否在房間中
  }); //end of ws.on("close")

  ws.on("error", (err) => {
    logger("WebSocket", { msg: "wsGameConnection error:", data: err });
  }); //end of ws.on("error")

  sendMessage(ws, GameWS.MessageType.Notification, {
    msg: "Welcome to wsGame Connection!",
  });
  logData();
} //end of wsGameConnection

//-----------------------------------------------------------//
function logData() {
  logger("WebSocket", { msg: `playerCount:${playerCount}` });
  loggerTable("WebSocket", { msg: "players:", data: players });
  loggerTable("WebSocket", { msg: "playerIsInRoom:", data: playerIsInRoom });
  loggerTable("WebSocket", { msg: "rooms:", data: rooms });
}
