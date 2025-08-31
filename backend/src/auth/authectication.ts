import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET || "dev-secret";

export type AuthUser = { sub: string; email: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: string, email: string, expiresIn = "7d") {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn });
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
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    if (!decoded || typeof decoded === "string") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = {
      sub: String(decoded.sub ?? ""),
      email: String(decoded.email ?? ""),
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
