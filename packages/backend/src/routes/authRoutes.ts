import { Router, Request, Response } from "express";
import { AuthService, InvalidCredentialsError } from "../services/AuthService";

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

  return router;
}
