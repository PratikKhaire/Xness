import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getPgClient } from "../db/db-connection";

type TradeBody = {
  asset?: string;
  type?: "buy" | "sell";
  margin?: number; // integer cents with 2 decimals (e.g., 50000 -> $500.00)
  leverage?: number; // e.g. 1, 2, 5, ...
};

const router = Router();

router.post("/v1/trade", async (req, res) => {
  const { asset, type, margin, leverage = 1 } = req.body as TradeBody;

  const validAsset = typeof asset === "string" && asset.trim().length > 0;
  const validType = type === "buy" || type === "sell";
  const validMargin =
    typeof margin === "number" && Number.isFinite(margin) && margin > 0;
  const validLeverage =
    typeof leverage === "number" && Number.isFinite(leverage) && leverage > 0;

  if (!validAsset || !validType || !validMargin || !validLeverage) {
    return res.status(411).json({ message: "Incorrect inputs" });
  }

  const symbol = asset!.toUpperCase();
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

    if (rows.length === 0) {
      return res.status(503).json({ message: "Price unavailable" });
    }

    const latest = rows[0];
    const bestBid = Number(latest.bid);
    const bestAsk = Number(latest.ask);
    const priceTs = Number(latest.timestamp);

    if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk)) {
      return res.status(503).json({ message: "Invalid market price" });
    }

    const executedPrice = type === "buy" ? bestAsk : bestBid;

    const orderId = uuidv4();
    const userId = req.user?.sub ?? "unknown";

    // TODO: persist order to DB if needed
    const order = {
      orderId,
      userId,
      asset: symbol,
      type,
      executedPrice,
      ts: priceTs,
      margin,
      leverage,
      status: "filled",
      fillType: "market",
    };

    return res.status(200).json(order);
  } catch (e) {
    console.error("Failed to place order:", e);
    return res.status(500).json({ message: "Failed to place order" });
  } finally {
    await pg.end();
  }
});

export default router;
