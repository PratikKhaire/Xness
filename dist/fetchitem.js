"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumeOueue = consumeOueue;
const redis_1 = require("redis");
async function consumeOueue(params) {
    const redisClient = (0, redis_1.createClient)();
    await redisClient.connect();
    while (true) {
        const item = await redisClient.rPop("price_queue");
        if (item) {
            const data = JSON.parse(item);
            console.log("consumed fro queue", data);
        }
        else {
            await new Promise((resolve) => setTimeout(resolve, 1100));
        }
    }
}
// Add this to the bottom of src/fetchitem.ts to run the consumer
consumeOueue({});
//# sourceMappingURL=fetchitem.js.map