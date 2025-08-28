"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.popBatchFromQueue = popBatchFromQueue;
const redis_1 = require("redis");
const db_connection_1 = require("./db/db-connection");
async function popBatchFromQueue(batchSize = 100) {
    const redisClient = (0, redis_1.createClient)();
    await redisClient.connect();
    const pgClient = (0, db_connection_1.getPgClient)({
        user: "your_pg_user",
        host: "localhost",
        database: "your_db",
        password: "your_password",
        port: 5432,
    });
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
                const batch = items.map((item) => JSON.parse(item));
                const values = batch.map(({ symbol, bidPrice, askPrice, timestamp }) => `('${symbol}', ${bidPrice}, ${askPrice}, to_timestamp(${timestamp}/1000.0))`);
                const query = `INSERT INTO price ( symbol,bid,ask,ts) VALUES ${values.join(",")}`;
                await pgClient.query(query);
                console.log(`Inserted batch of ${batch.length} into TimescaleDB`);
            }
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}
// To run:
popBatchFromQueue(100);
//# sourceMappingURL=redisqueue.js.map