import express from "express";
import cors from "cors";
import candlesRouter from "../routes/candles";
import createorder from "../routes/createorder";
import { setupWebSocketServer } from "../ws/wsconnected";
import createSigninRouter from "../routes/signin";
import createSignupRouter from "../routes/signup";
import { authMiddleware, signToken } from "../auth/authentication";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

const users: { [email: string]: { userId: string; passwordHash: string } } = {};

// Mount routes
app.use("/api", createSignupRouter(users));
app.use("/api", createSigninRouter(users));
app.use("/api", candlesRouter);
app.use("/api", authMiddleware, createorder);


app.listen(port, () => {
  console.log(`server running at ${port}`);
  setupWebSocketServer();
});
