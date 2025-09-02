import express from "express";
import { getPgClient } from "../db/db-connection";

const router = express.Router();

router.get("/v1/candles", async (req, res) => {
  const { asset, startTime, endTime, ts } = req.query;
  if (!asset || !startTime || !endTime || !ts) {
    return res.status(400).json({ message: "Missing query parameters" });
  }

  const pgClient = getPgClient({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "admin@123",
    port: 5432,
  });

  await pgClient.connect();

  try {
    const bucket =
      ts === "1m"
        ? "1 minute"
        : ts === "5m"
        ? "5 minutes"
        : ts === "15m"
        ? "15 minutes"
        : ts === "1h"
        ? "1 hour"
        : ts === "4h"
        ? "4 hours"
        : ts === "1d"
        ? "1 day"
        : ts === "1w"
        ? "1 week"
        : ts;
    const result = await pgClient.query(
      `WITH cte AS (
         SELECT time_bucket($1, ts) AS bucket,
                first(bid, ts) AS open,
                last(bid, ts)  AS close,
                max(bid)       AS high,
                min(bid)       AS low,
                max(decimals)  AS decimals
           FROM price
          WHERE symbol = $2
            AND ts >= to_timestamp($3)
            AND ts <= to_timestamp($4)
          GROUP BY bucket
      )
      SELECT extract(epoch from bucket)::bigint as timestamp,
             open, high, low, close, decimals
        FROM cte
        ORDER BY timestamp ASC`,
      [bucket, (asset as string).toUpperCase(), startTime, endTime]
    );

    const targetDecimals = 4;
    const candles = result.rows.map((r: any) => {
      const srcDec = Number(r.decimals) || targetDecimals;
      const adj = Math.pow(10, targetDecimals - srcDec);
      return {
        timestamp: Number(r.timestamp),
        open: Math.round(Number(r.open) * adj),
        high: Math.round(Number(r.high) * adj),
        low: Math.round(Number(r.low) * adj),
        close: Math.round(Number(r.close) * adj),
        decimals: targetDecimals,
      };
    });
    res.json({ candles });
  } catch (e) {
    res.status(500).json({ message: "Error fetching candles" });
  } finally {
    await pgClient.end();
  }
});

export default router;
