import type { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export type AuthUser = { sub: string; email: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(
  userId: string,
  email: string,
) {
  const payload = { sub: userId, email };
  const options: jwt.SignOptions = { expiresIn: "7d" };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const h = req.header("authorization") || req.header("Authorization");
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = h.slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload | string;
    if (!decoded || typeof decoded === "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = {
      sub: String((decoded as jwt.JwtPayload).sub ?? ""),
      email: String((decoded as jwt.JwtPayload).email ?? ""),
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
