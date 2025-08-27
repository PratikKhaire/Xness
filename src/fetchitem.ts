import { resolve } from "path";
import { createClient } from "redis";

export async function consumeOueue(params: any) {
  const redisClient = createClient();
  await redisClient.connect();

  while (true) {
    const item = await redisClient.rPop("price_queue");
    if (item) {
      const data = JSON.parse(item);
      console.log("consumed fro queue", data);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }
}

// Add this to the bottom of src/fetchitem.ts to run the consumer
consumeOueue({});
