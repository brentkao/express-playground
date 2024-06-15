import { z } from "zod";

export namespace NormalWS {
  export enum MessageType {
    Ping = "ping",
    Pong = "pong",
    Error = "error",
    Notification = "notification",
  }

  export const BaseResponseMessageSchema = z.object({
    type: z.nativeEnum(MessageType),
  });

  export type BaseResponseMessage<T> = z.infer<
    typeof BaseResponseMessageSchema
  > & { data: T };

  export const PingPongSchema = z.object({
    timestamp: z.string(),
  });
  export type PingPong = z.infer<typeof PingPongSchema>;
}

export namespace GameWS {
  export enum MessageType {
    Error = "error",
    Notification = "notification",
    NextPlayer = "next-player",
    GameOver = "game-over",
    //---Actions---//
    CreateRoom = "create-room",
    JoinRoom = "join-room",
    LeaveRoom = "leave-room",
    JoinRandomRoom = "join-random-room",
    PublicRoomList = "public-room-list", // for public room list
    RoomDetail = "room-detail",
    StartGame = "start-game",
    GameMakeMove = "game-make-move",
  }

  export const BaseResponseMessageSchema = z.object({
    type: z.nativeEnum(MessageType),
  });

  export type BaseResponseMessage<T> = z.infer<
    typeof BaseResponseMessageSchema
  > & { data: T };

  export const CreateRoomDetailSchema = z
    .object({
      isPublic: z.boolean(),
      detail: z.object({
        size: z
          .number()
          .refine(
            (value) => value === 2 || value === 4,
            "Size must be either 2 or 4"
          ),
      }),
    })
    .strict();
  export type CreateRoomDetail = z.infer<typeof CreateRoomDetailSchema>;

  export const JoinRoomDetailSchema = z
    .object({
      roomId: z.string(),
      isPublic: z.boolean(),
    })
    .strict();
  export type JoinRoomDetail = z.infer<typeof JoinRoomDetailSchema>;

  export type GameRoomDetail = {
    host: string;
    isPublic: boolean;
    size: number;
    players: string[];
    gameStatus: boolean;
    currentPlayer: string;
    board: string[][];
  };
}
