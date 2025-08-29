import express from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

const app = express();
const port = 4000;

app.use(express.json());

const users:{[email:string] :{
    userId:string ;
    passwordHash: string
}} = {};

app.post("/api/v1/user/signup", async (req, res) => {
  const { email, password } = req.body;
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
    res.status(200).json({ userId });
  } catch (e) {
    res.status(403).json({ message: "Erro while signing up" });
  }
});

app.listen(port, () => {
  console.log(`server running at ${port}`);
});
