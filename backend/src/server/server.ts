import express from "express";
import cors from "cors";
import candlesRouter from "../routes/candles";
import createorder from "../routes/createorder";
import { setupWebSocketServer } from "../ws/wsconnected";
import createSigninRouter from "../routes/signin";
import createSignupRouter from "../routes/signup";
import { authMiddleware, signToken } from "../auth/authentication";
import balanceRouter from "../routes/balance";

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// Gracefully handle invalid JSON bodies from clients (e.g., Postman)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // body-parser sets type to 'entity.parse.failed' for JSON parse errors
    const isJsonParseError =
      err &&
      (err.type === "entity.parse.failed" || err instanceof SyntaxError) &&
      "body" in err;
    if (isJsonParseError) {
      return res.status(400).json({
        message: "Invalid JSON body",
        details: String(err.message || err),
      });
    }
    return next(err);
  }
);

const users: { [email: string]: { userId: string; passwordHash: string } } = {};

// routes
app.use("/api", createSignupRouter(users));
app.use("/api", createSigninRouter(users));
app.use("/api", candlesRouter);
app.use("/api", authMiddleware, createorder);
app.use("/api", authMiddleware, balanceRouter);
app.use("/api", authMiddleware,balanceRouter);

app.listen(port, () => {
  console.log(`server running at ${port}`);
  setupWebSocketServer();
});
