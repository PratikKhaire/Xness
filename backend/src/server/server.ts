import express from "express";
import cors from "cors";
import candlesRouter from "../routes/candles";
import createTradeRouter from "../routes/createorder";
import { setupWebSocketServer } from "../ws/wsconnected";
import createSigninRouter from "../routes/signin";
import createSignupRouter from "../routes/signup";
import { authMiddleware } from "../auth/authentication";
import createBalanceRouter, { BalancesStore } from "../routes/balance";
import assetsRouter from "../routes/assets";
import createCloseRouter from "../routes/closeOrder";

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
const balances: BalancesStore = {};

// routes
app.use(
  "/api",
  createSignupRouter(users, (userId) => {
    // initial balance = 5000.00 (2 decimals)
    balances[userId] = 5000 * 100;
  })
);
app.use("/api", createSigninRouter(users));
app.use("/api", candlesRouter);
app.use("/api", assetsRouter);
app.use("/api", authMiddleware, createTradeRouter(balances));
app.use("/api", authMiddleware, createBalanceRouter(balances));
app.use("/api", authMiddleware, createCloseRouter(balances));

app.listen(port, () => {
  console.log(`server running at ${port}`);
  setupWebSocketServer();
});
