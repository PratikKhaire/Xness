import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export type UsersStore = {
  [email: string]: { userId: string; passwordHash: string };
};

export default function createSignupRouter(users: UsersStore) {
  const router = Router();

  router.post("/v1/user/signup", async (req, res) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return res.status(403).json({ message: "error while signing up" });
    }
    if (users[email]) {
      return res.status(403).json({ message: "Error while signing up" });
    }

    try {
      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);
      users[email] = { userId, passwordHash };
      return res.status(200).json({ userId });
    } catch {
      return res.status(403).json({ message: "Erro while signing up" });
    }
  });

  return router;
}
