import { createClient } from "redis";
import WebSocket from "ws";

export function getBinancedata(symbols: string[]) {
  const redisClient = createClient();
  redisClient.connect();

  const streams = symbols.map((s) => `${s.toLowerCase()}@bookTicker`).join("/");
  const binanceWsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;
  const ws = new WebSocket(binanceWsUrl);

  ws.on("open", () => {
    console.log("Connected to Binance WebSocket");
  });

  ws.on("message", async (data) => {
    const parsed = JSON.parse(data.toString());

    if (parsed.data && parsed.stream) {
      const symbol = parsed.data.s;
      const price = parsed.data.c;
      const bidPrice = parsed.data.b; // best bid price
      const askPrice = parsed.data.a;
      const timestamp = parsed.data.E;

      const queueItem = JSON.stringify({
        symbol,
        bidPrice,
        askPrice,
        timestamp,
      });

      await redisClient.lPush("price_queue", queueItem);

      // Publish to WebSocket subscribers
      await redisClient.publish("price_updates", queueItem);

      console.log(`Queued ${symbol} Bid: ${bidPrice}, Ask: ${askPrice}`);
    } else {
      console.log(parsed);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
    redisClient.disconnect();
  });
}
