import { Request, Response } from "express";
import BadRequestError from "../errors/bad-request-error";

export function error(req: Request, res: Response) {
  throw new BadRequestError({ message: "Bad request", logging: true });
}
