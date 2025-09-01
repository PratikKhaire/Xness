import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getPgClient } from "../db/db-connection";

type TradeBody = {
  asset?: string;
  type?: "buy" | "sell";
  margin?: number;
  leverage?: number;
};

type Order = {
  orderId: string;
  userId: string;
  asset: string;
  type: "buy" | "sell";
  executedPrice: number;
  ts: number;
  margin: number;
  leverage: number;
  status: "open" | "filled" | "cancelled" | "closed";
  fillType: "market";
};

export const ordersByUser: Record<string, Order[]> = {};

const router = Router();

function validateTrade(b: TradeBody) {
  const validAsset = typeof b.asset === "string" && b.asset.trim().length > 0;
  const validType = b.type === "buy" || b.type === "sell";
  const validMargin =
    typeof b.margin === "number" && Number.isFinite(b.margin) && b.margin > 0;
  const validLeverage =
    typeof b.leverage === "number" &&
    Number.isFinite(b.leverage) &&
    b.leverage > 0;
  return validAsset && validType && validMargin && validLeverage;
}

async function getLatestPrice(symbol: string) {
  const pg = getPgClient({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "admin@123",
    port: 5432,
  });
  await pg.connect();
  try {
    const { rows } = await pg.query(
      `SELECT bid, ask, extract(epoch from ts)::bigint as timestamp
         FROM price
        WHERE symbol = $1
        ORDER BY ts DESC
        LIMIT 1`,
      [symbol]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      bid: Number(r.bid),
      ask: Number(r.ask),
      ts: Number(r.timestamp),
    };
  } finally {
    await pg.end();
  }
}

// POST /api/v1/trade (auth applied in server.ts)
router.post("/v1/trade", async (req, res) => {
  const body = req.body as TradeBody;
  const leverage = body.leverage ?? 1;

  const valid = validateTrade({ ...body, leverage });
  if (!valid) return res.status(411).json({ message: "Incorrect inputs" });

  const symbol = body.asset!.toUpperCase();
  const last = await getLatestPrice(symbol);
  if (!last || !Number.isFinite(last.bid) || !Number.isFinite(last.ask)) {
    return res.status(503).json({ message: "Price unavailable" });
  }

  const executedPrice = body.type === "buy" ? last.ask : last.bid;
  const userId = req.user?.sub ?? "unknown";
  const order: Order = {
    orderId: uuidv4(),
    userId,
    asset: symbol,
    type: body.type!,
    executedPrice,
    ts: last.ts,
    margin: body.margin!,
    leverage,
    status: "open",
    fillType: "market",
  };

  if (!ordersByUser[userId]) ordersByUser[userId] = [];
  ordersByUser[userId].push(order);

  return res.status(200).json(order);
});

router.get("/v1/trades/open", (req, res) => {
  const userId = req.user?.sub ?? "unknown";
  const openOrders = (ordersByUser[userId] || []).filter(
    (o) => o.status === "open"
  );
  return res.status(200).json({ orders: openOrders });
});

export default router;
