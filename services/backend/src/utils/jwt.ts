import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("FATAL: Missing JWT_SECRET environment variable");
}

// Tipo del payload del token
export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, SECRET, { expiresIn: "1h" });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload;
};

export default {
  generateToken,
  verifyToken
};
