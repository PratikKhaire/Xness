import { createClient } from "redis";
import { pgClient } from "../db/db-connection";
import { setupMaterializedView } from "./refreshMaterializedView";

async function connectRedisWithRetry(): Promise<
  ReturnType<typeof createClient>
> {
  let attempt = 0;
  while (true) {
    try {
      const client = createClient();
      await client.connect();
      return client;
    } catch (err) {
      attempt++;
      const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
      console.error(
        `Redis connect failed (attempt ${attempt}). Retrying in ${Math.round(
          delay / 1000
        )}s...`,
        err
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function popBatchFromQueue(
  batchSize = 100,
  intervalName: string,
  intervalBucket: string
) {
  const redisClient = await connectRedisWithRetry();

  await pgClient.connect();

  // Ensure schema exists (integerized: store price with 4 decimals)
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS price (
      symbol text NOT NULL,
      bid bigint NOT NULL,
      ask bigint NOT NULL,
      decimals smallint NOT NULL DEFAULT 4,
      ts timestamptz NOT NULL
    );
  `);
  await pgClient.query(
    `CREATE INDEX IF NOT EXISTS idx_price_symbol_ts ON price(symbol, ts DESC);`
  );
  // Backfill decimals column if table existed without it
  await pgClient.query(
    `ALTER TABLE price ADD COLUMN IF NOT EXISTS decimals smallint NOT NULL DEFAULT 4;`
  );

  while (true) {
    const queueLength = await redisClient.lLen("price_queue");
    if (queueLength >= batchSize) {
      const items = await redisClient.sendCommand([
        "RPOP",
        "price_queue",
        batchSize.toString(),
      ]);
      if (Array.isArray(items) && items.length > 0) {
        const batch = items.map((item: string) => JSON.parse(item));

        // Scale incoming floats to integers with 4 decimals
        const values = batch.map(
          ({ symbol, bidPrice, askPrice, timestamp }) => {
            const b = Math.round(Number(bidPrice) * 10000);
            const a = Math.round(Number(askPrice) * 10000);
            return `('${symbol}', ${b}, ${a}, 4, to_timestamp(${Number(
              timestamp
            )} / 1000.0))`;
          }
        );

        const query = `INSERT INTO price (symbol, bid, ask, decimals, ts) VALUES ${values.join(
          ","
        )}`;
        await pgClient.query(query);
        console.log(`Inserted batch of ${batch.length} into TimescaleDB`);

        const uniqueSymbols = [...new Set(batch.map((item) => item.symbol))];

        for (const symbol of uniqueSymbols) {
          await setupMaterializedView(
            symbol,
            intervalBucket,
            intervalName,
            pgClient
          );
        }
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// To run with a 10-minute interval:
popBatchFromQueue(100, "10min", "10 minutes");
