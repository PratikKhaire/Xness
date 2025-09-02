import { createClient } from "redis";
import WebSocket from "ws";

export function getBinancedata(symbols: string[]) {
  const redisClient = createClient();
  redisClient.connect();

  // Use spot aggregated trade stream per symbol: <symbol>@trade
  const streams = symbols.map((s) => `${s.toLowerCase()}@trade`).join("/");
  const binanceWsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
  const ws = new WebSocket(binanceWsUrl);

  ws.on("open", () => {
    console.log("Connected to Binance WebSocket");
  });

  ws.on("message", async (data) => {
    const parsed = JSON.parse(data.toString());

    if (parsed.data && parsed.stream) {
      // Aggregate trade payload: https://binance-docs.github.io/apidocs/spot/en/#aggregate-trade-streams
      // We'll use trade price as mid for both bid/ask to keep ingestion simple; spread applied later on reads.
      const symbol = parsed.data.s; // e.g., BTCUSDT
      const priceStr = parsed.data.p; // trade price as string
      const eventTime = parsed.data.E; // event time (ms)

      const price = Number(priceStr);
      if (!Number.isFinite(price)) return;

      const queueItem = JSON.stringify({
        symbol,
        bidPrice: price,
        askPrice: price,
        timestamp: eventTime,
      });

      await redisClient.lPush("price_queue", queueItem);

      // Publish to WebSocket subscribers (optional)
      await redisClient.publish("price_updates", queueItem);

      // Keep logs terse
      // console.log(`Queued ${symbol} price: ${price}`);
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
