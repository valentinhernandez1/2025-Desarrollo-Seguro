// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Evita el warning de variable no usada
  void next;

  console.error("ERROR:", err);

  const status =
    typeof err === "object" && err && "status" in err
      ? (err as { status: number }).status
      : 500;

  const message =
    typeof err === "object" && err && "message" in err
      ? (err as { message: string }).message
      : "Internal Server Error";

  res.status(status).json({ message });
};

export default errorHandler;



