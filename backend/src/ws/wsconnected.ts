import { WebSocketServer } from "ws";
import { createClient } from "redis";

export function setupWebSocketServer() {
  const wss = new WebSocketServer({ port: 4001 });
  const redisSubscriber = createClient();

  redisSubscriber
    .connect()
    .then(() => {
      console.log("Connected to Redis for WebSocket subscription");
      // Subscribe to price updates (legacy)
      redisSubscriber.subscribe("price_updates", (message) => {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(message);
          }
        });
      });

      // Subscribe to internal trade events and broadcast to clients
      redisSubscriber.subscribe("trade_events", (message) => {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(message);
          }
        });
      });
    })
    .catch((err) => {
      console.error("Redis subscription error:", err);
    });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return wss;
}
