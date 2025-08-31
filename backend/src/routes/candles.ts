import express from "express";
import { getPgClient } from "../db/db-connection";

const router = express.Router();

router.get("/candles", async (req, res) => {
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
      `SELECT extract(epoch from time_bucket($1,ts)) ::bigint as timestamp,
      first(bid,ts) as open,
      last(bid,ts) as close,
      max(bid) as high,
      min(bid) as low,
      4 as decimal
      FROM price
      WHERE symbol= $2
      AND ts >=to_timestamp($3)
      AND ts<= to_timestamp($4)
      GROUP BY time_bucket($1,ts)
      ORDER BY timestamp ASC`,
      [bucket, (asset as string).toUpperCase(), startTime, endTime]
    );
    res.json({ candles: result.rows });
  } catch (e) {
    res.status(500).json({ message: "Error fetching candles" });
  } finally {
    await pgClient.end();
  }
});

export default router;
