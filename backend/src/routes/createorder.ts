import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getPgClient } from "../db/db-connection";
import type { BalancesStore } from "./balance";
import { getPublisher } from "../ws/publisher";

type TradeBody = {
  asset?: string;
  type?: "buy" | "sell";
  margin?: number; // integer cents
  leverage?: number; // one of 1,5,10,20,100
};

type Order = {
  orderId: string;
  userId: string;
  asset: string;
  type: "buy" | "sell";
  // Executed/open price as float (kept for compatibility with close route)
  executedPrice: number;
  // Integer open price with 4 decimals scaling, includes 1% spread
  openPrice: number; // scaled by 1e4
  decimals: number; // always 4
  ts: number;
  // Margin locked in integer cents
  margin: number;
  leverage: number;
  status: "open" | "filled" | "cancelled" | "closed";
  fillType: "market";
};

export const ordersByUser: Record<string, Order[]> = {};

function mapAsset(a: string): string | null {
  const s = a.toUpperCase();
  if (s === "BTC" || s === "BTCUSDT") return "BTCUSDT";
  if (s === "ETH" || s === "ETHUSDT") return "ETHUSDT";
  if (s === "BNB" || s === "BNBUSDT") return "BNBUSDT";
  return null;
}

function shortFromSymbol(sym: string): "BTC" | "ETH" | "BNB" | string {
  if (sym === "BTCUSDT") return "BTC";
  if (sym === "ETHUSDT") return "ETH";
  if (sym === "BNBUSDT") return "BNB";
  return sym;
}

function validateTrade(b: TradeBody) {
  const validAsset = typeof b.asset === "string" && !!mapAsset(b.asset);
  const validType = b.type === "buy" || b.type === "sell";
  // margin expected as integer cents
  const validMargin =
    typeof b.margin === "number" && Number.isInteger(b.margin) && b.margin > 0;
  const allowed = new Set([1, 5, 10, 20, 100]);
  const validLeverage =
    typeof b.leverage === "number" && allowed.has(b.leverage);
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
      `SELECT bid, ask, decimals, extract(epoch from ts)::bigint as timestamp
         FROM price
        WHERE symbol = $1
        ORDER BY ts DESC
        LIMIT 1`,
      [symbol]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      bid: Number(r.bid), // integer stored
      ask: Number(r.ask), // integer stored
      decimals: Number(r.decimals) || 4,
      ts: Number(r.timestamp),
    };
  } finally {
    await pg.end();
  }
}

export default function createTradeRouter(balances: BalancesStore) {
  const router = Router();

  // POST /api/v1/trade (auth applied in server.ts)
  router.post("/v1/trade", async (req, res) => {
    const body = req.body as TradeBody;
    const leverage = body.leverage ?? 1;

    const valid = validateTrade({ ...body, leverage });
    if (!valid) return res.status(411).json({ message: "Incorrect inputs" });

    const symbol = mapAsset(body.asset!)!;
    const last = await getLatestPrice(symbol);
    if (!last || !Number.isFinite(last.bid) || !Number.isFinite(last.ask)) {
      return res.status(503).json({ message: "Price unavailable" });
    }

    // Prices are integers with `last.decimals` decimals. Normalize to 4 and apply 0.5% spread.
    const targetDecimals = 4;
    const adj = Math.pow(10, targetDecimals - (last.decimals ?? 4));
    const askInt = Math.round(last.ask * adj);
    const bidInt = Math.round(last.bid * adj);
    const openPrice =
      body.type === "buy"
        ? Math.round((askInt * 1005) / 1000)
        : Math.round((bidInt * 995) / 1000);
    const executedPrice = openPrice / 10000; // float, derived from int

    const userId = req.user?.sub ?? "unknown";

    // Margin in integer cents; ensure sufficient balance and lock it
    const marginCents = body.margin!;
    if (!Number.isInteger(marginCents) || marginCents <= 0) {
      return res.status(411).json({ message: "Margin must be integer cents" });
    }
    const current = balances[userId] ?? 0;
    if (current < marginCents) {
      return res.status(403).json({ message: "Insufficient balance" });
    }
    balances[userId] = current - marginCents;

    const order: Order = {
      orderId: uuidv4(),
      userId,
      asset: symbol,
      type: body.type!,
      executedPrice,
      openPrice,
      decimals: 4,
      ts: last.ts,
      margin: marginCents,
      leverage,
      status: "open",
      fillType: "market",
    };

    if (!ordersByUser[userId]) ordersByUser[userId] = [];
    ordersByUser[userId].push(order);

    // Publish a trade open event for WS consumers
    try {
      const pub = await getPublisher();
      await pub.publish(
        "trade_events",
        JSON.stringify({
          type: "trade_open",
          userId,
          orderId: order.orderId,
          asset: order.asset,
          side: order.type,
          openPrice: order.openPrice,
          decimals: order.decimals,
          leverage: order.leverage,
          margin: order.margin,
          ts: order.ts,
        })
      );
    } catch (e) {
      console.error("Failed to publish trade open event:", e);
    }

    // Return only orderId per spec
    return res.status(200).json({ orderId: order.orderId });
  });

  router.get("/v1/trades/open", (req, res) => {
    const userId = req.user?.sub ?? "unknown";
    const openOrders = (ordersByUser[userId] || []).filter(
      (o) => o.status === "open"
    );
    // Map to spec-like shape
    const trades = openOrders.map((o) => ({
      orderId: o.orderId,
      asset: shortFromSymbol(o.asset),
      type: o.type,
      openPrice: o.openPrice,
      decimals: o.decimals,
      leverage: o.leverage,
      margin: o.margin,
      ts: o.ts,
    }));
    return res.status(200).json({ trades });
  });

  return router;
}
