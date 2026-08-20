import { Request, Response, NextFunction } from "express";
import { OWNER_USER_ID } from "../services/AuthService";

// Must be chained after authenticate, which is what sets req.userId.
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (req.userId !== OWNER_USER_ID) {
    res.status(403).json({ error: "Not allowed" });
    return;
  }
  next();
}
