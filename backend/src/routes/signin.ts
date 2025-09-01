import { Router } from "express";
import bcrypt from "bcrypt";
import { signToken } from "../auth/authentication";

export type UsersStore = {
  [email: string]: { userId: string; passwordHash: string };
};

export default function createSigninRouter(users: UsersStore) {
  const router = Router();

  router.post("/v1/user/signin", async (req, res) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };
      if (!email || !password)
        return res.status(403).json({ message: "Incorrect credentials" });

      const record = users[email];
      if (!record)
        return res.status(403).json({ message: "Incorrect credentials" });

      const ok = await bcrypt.compare(password, record.passwordHash);
      if (!ok)
        return res.status(403).json({ message: "Incorrect credentials" });

      const token = signToken(record.userId, email);
      return res.status(200).json({ token });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return router;
}
