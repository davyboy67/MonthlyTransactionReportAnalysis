import { Router, Request, Response } from "express";
import {
  IInviteService,
  EmailAlreadyRegisteredError,
  InviteNotFoundError,
  InviteUnusableError,
  MIN_PASSWORD_LENGTH,
} from "../services/InviteService";
import { authenticate } from "../middleware/authenticate";
import { requireOwner } from "../middleware/requireOwner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 401 is reserved for a bad session -- the frontend apiClient logs the user out on any 401,
// so an invalid invite must never use it.
function respondToInviteError(error: unknown, res: Response): boolean {
  if (error instanceof InviteNotFoundError) {
    res.status(404).json({ error: error.message });
    return true;
  }
  if (error instanceof InviteUnusableError) {
    res.status(410).json({ error: error.message });
    return true;
  }
  if (error instanceof EmailAlreadyRegisteredError) {
    res.status(409).json({ error: error.message });
    return true;
  }
  return false;
}

export function createInviteRouter(inviteService: IInviteService): Router {
  const router = Router();

  // POST /api/v1/CreateInvite
  router.post("/CreateInvite", authenticate, requireOwner, async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName } = req.body as {
        email?: string;
        firstName?: string;
        lastName?: string;
      };

      if (!email || !firstName || !lastName) {
        return res
          .status(400)
          .json({ error: "email, firstName and lastName are required" });
      }
      if (!EMAIL_PATTERN.test(email.trim())) {
        return res.status(400).json({ error: "A valid email address is required" });
      }

      const result = await inviteService.createInvite(req.userId, {
        email,
        firstName,
        lastName,
      });
      res.json({ token: result.token, expiresAt: result.expiresAt });
    } catch (error) {
      if (respondToInviteError(error, res)) return;
      console.error("Failed to create invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/v1/ValidateInvite
  router.post("/ValidateInvite", async (req: Request, res: Response) => {
    try {
      const { token } = req.body as { token?: string };
      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      const preview = await inviteService.validateInvite(token);
      res.json(preview);
    } catch (error) {
      if (respondToInviteError(error, res)) return;
      console.error("Failed to validate invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/v1/RedeemInvite
  router.post("/RedeemInvite", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) {
        return res.status(400).json({ error: "token and password are required" });
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res
          .status(400)
          .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      }

      const result = await inviteService.redeemInvite(token, password);
      res.json(result);
    } catch (error) {
      if (respondToInviteError(error, res)) return;
      console.error("Failed to redeem invite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
