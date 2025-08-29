"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.popBatchFromQueue = popBatchFromQueue;
const redis_1 = require("redis");
const db_connection_1 = require("./db/db-connection");
const refreshMaterializedView_1 = require("./refreshMaterializedView");
async function popBatchFromQueue(batchSize = 100, intervalName, intervalBucket) {
    const redisClient = (0, redis_1.createClient)();
    await redisClient.connect();
    await db_connection_1.pgClient.connect();
    while (true) {
        const queueLength = await redisClient.lLen("price_queue");
        if (queueLength >= batchSize) {
            const items = await redisClient.sendCommand([
                "RPOP",
                "price_queue",
                batchSize.toString(),
            ]);
            if (Array.isArray(items) && items.length > 0) {
                const batch = items.map((item) => JSON.parse(item));
                const values = batch.map(({ symbol, bidPrice, askPrice, timestamp }) => `('${symbol}', ${bidPrice}, ${askPrice}, to_timestamp(${timestamp}/1000.0))`);
                const query = `INSERT INTO price (symbol, bid, ask, ts) VALUES ${values.join(",")}`;
                await db_connection_1.pgClient.query(query);
                console.log(`Inserted batch of ${batch.length} into TimescaleDB`);
                const uniqueSymbols = [...new Set(batch.map((item) => item.symbol))];
                for (const symbol of uniqueSymbols) {
                    await (0, refreshMaterializedView_1.setupMaterializedView)(symbol, intervalBucket, intervalName, db_connection_1.pgClient);
                }
            }
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}
// To run with a 10-minute interval:
popBatchFromQueue(100, "10min", "10 minutes");
//# sourceMappingURL=redisqueue.js.map