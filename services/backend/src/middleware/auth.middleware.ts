import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded; // ✔ Tipado sin ANY
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};
export default authenticateJWT;
