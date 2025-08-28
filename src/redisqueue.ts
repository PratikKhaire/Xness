import { createClient } from "redis";

import { getPgClient } from "./db/db-connection";

export async function popBatchFromQueue(batchSize = 100) {
  const redisClient = createClient();
  await redisClient.connect();

  const pgClient = getPgClient({
      user:"your_pg_user",
        host : "localhost",
        database:"your_db",
        password:"your_password",
        port :5432,
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
        const batch = items.map((item: string) => JSON.parse(item));


        const values = batch.map(({symbol,bidPrice,askPrice,timestamp}) => `('${symbol}', ${bidPrice}, ${askPrice}, to_timestamp(${timestamp}/1000.0))`
      );

      const query = `INSERT INTO price ( symbol,bid,ask,ts) VALUES ${values.join(",")}`;
      await pgClient.query(query);
      console.log(`Inserted batch of ${batch.length} into TimescaleDB`);
        
      }
    } else {
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// To run:
popBatchFromQueue(100);
