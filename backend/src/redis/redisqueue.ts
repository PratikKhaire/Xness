import { createClient } from "redis";
import {  pgClient } from "../db/db-connection";
import { setupMaterializedView } from "./refreshMaterializedView";

export async function popBatchFromQueue(
  batchSize = 100,
  intervalName: string,
  intervalBucket: string
) {
  const redisClient = createClient();
  await redisClient.connect();



  await pgClient.connect();

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

        const values = batch.map(
          ({ symbol, bidPrice, askPrice, timestamp }) =>
            `('${symbol}', ${bidPrice}, ${askPrice}, to_timestamp(${timestamp}/1000.0))`
        );

        const query = `INSERT INTO price (symbol, bid, ask, ts) VALUES ${values.join(
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
