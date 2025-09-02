import { Router } from "express";
import { getPgClient } from "../db/db-connection";
import { ordersByUser } from "./createorder";
import type { BalancesStore } from "./balance";
import { getPublisher } from "../ws/publisher";

type CloseBody = { orderId?: string };

type ClosedTrade = {
  orderId: string;
  asset: string;
  type: "buy" | "sell";
  margin: number; // integer cents
  leverage: number;
  openPrice: number; // int, 4 decimals
  closePrice: number; // int, 4 decimals
  decimals: number; // always 4
  ts: number; // close timestamp (from price row)
  pnl: number; // integer cents
};

export const closedTradesByUser: Record<string, ClosedTrade[]> = {};

function shortFromSymbol(sym: string): "BTC" | "ETH" | "BNB" | string {
  if (sym === "BTCUSDT") return "BTC";
  if (sym === "ETHUSDT") return "ETH";
  if (sym === "BNBUSDT") return "BNB";
  return sym;
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
    return {
      bid: Number(rows[0].bid), // integers
      ask: Number(rows[0].ask),
      decimals: Number(rows[0].decimals) || 4,
      ts: Number(rows[0].timestamp),
    };
  } finally {
    await pg.end();
  }
}

export default function createCloseRouter(balances: BalancesStore) {
  const router = Router();

  // Close trade
  router.post("/v1/trade/close", async (req, res) => {
    const userId = req.user?.sub ?? "unknown";
    const { orderId } = req.body as CloseBody;

    if (!orderId || typeof orderId !== "string") {
      return res.status(411).json({ mesage: "Incorrect inputs" });
    }

    const userOrders = ordersByUser[userId] || [];
    const order = userOrders.find(
      (o) => o.orderId === orderId && o.status === "open"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found or not open" });
    }

    const last = await getLatestPrice(order.asset);
    if (!last || !Number.isFinite(last.bid) || !Number.isFinite(last.ask)) {
      return res.status(503).json({ message: "Price unavailable" });
    }

    // Normalize to 4 decimals and apply 0.5% spread on close (unfavorable)
    const targetDecimals = 4;
    const adj = Math.pow(10, targetDecimals - (last.decimals ?? 4));
    const askInt = Math.round(last.ask * adj);
    const bidInt = Math.round(last.bid * adj);
    const closePrice =
      order.type === "buy"
        ? Math.round((bidInt * 995) / 1000)
        : Math.round((askInt * 1005) / 1000);

    // Convert openPrice back to float for qty calc
    const openPriceFloat = order.openPrice / 10000;

    const exposureUSD = (order.margin / 100) * order.leverage; // dollars
    const qty = exposureUSD / openPriceFloat;

    const closePriceFloat = closePrice / 10000;
    const pnlUSD =
      order.type === "buy"
        ? (closePriceFloat - openPriceFloat) * qty
        : (openPriceFloat - closePriceFloat) * qty;
    const pnlCents = Math.round(pnlUSD * 100);

    const closed: ClosedTrade = {
      orderId: order.orderId,
  asset: order.asset,
      type: order.type,
      margin: order.margin,
      leverage: order.leverage,
      openPrice: order.openPrice,
      closePrice,
      decimals: 4,
      ts: last.ts,
      pnl: pnlCents,
    };

    order.status = "closed";

    if (!closedTradesByUser[userId]) closedTradesByUser[userId] = [];
    closedTradesByUser[userId].push(closed);

    // Release margin and apply PnL to user's balance
    const current = balances[userId] ?? 0;
    balances[userId] = current + order.margin + pnlCents;

    // Publish close event
    try {
      const pub = await getPublisher();
      await pub.publish(
        "trade_events",
        JSON.stringify({
          type: "trade_close",
          userId,
          orderId: order.orderId,
          asset: order.asset,
          side: order.type,
          openPrice: order.openPrice,
          closePrice: closePrice,
          decimals: 4,
          leverage: order.leverage,
          margin: order.margin,
          ts: last.ts,
          pnl: pnlCents,
        })
      );
    } catch (e) {
      console.error("Failed to publish trade close event:", e);
    }

    return res.status(200).json(closed);
  });

  router.get("/v1/trades", (req, res) => {
    const userId = req.user?.sub ?? "unknown";
    const trades = (closedTradesByUser[userId] || []).map((t) => ({
      ...t,
      asset: shortFromSymbol(t.asset),
    }));
    return res.status(200).json({ trades });
  });

  return router;
}
