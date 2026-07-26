import { Router, Request, Response } from "express";
import {
  AuthService,
  InvalidCredentialsError,
  UserNotFoundError,
} from "../services/AuthService";
import { authenticate } from "../middleware/authenticate";

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // POST /api/v1/Login
  router.post("/Login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return res.status(401).json({ error: error.message });
      }
      console.error("Login failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  router.get("/Me", authenticate, async (req: Request, res: Response) => {
    try {
      const profile = await authService.getProfile(req.userId);
      res.json({ user: profile });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return res.status(404).json({ error: error.message });
      }
      console.error("Failed to load profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
