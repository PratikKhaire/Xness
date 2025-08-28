"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBinancedata = getBinancedata;
const redis_1 = require("redis");
const ws_1 = __importDefault(require("ws"));
function getBinancedata(symbols) {
    const redisClient = (0, redis_1.createClient)();
    redisClient.connect();
    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
    const binanceWsUrl = `wss://fstream.binance.com/stream?streams=${streams}`;
    const ws = new ws_1.default(binanceWsUrl);
    ws.on("open", () => {
        console.log("Connected to Binance WebSocket");
    });
    ws.on("message", async (data) => {
        const parsed = JSON.parse(data.toString());
        // For multi-stream, data is in parsed.data
        if (parsed.data && parsed.stream) {
            const symbol = parsed.data.s;
            const price = parsed.data.c;
            const timestamp = parsed.data.E;
            const queueItem = JSON.stringify({ symbol, price, timestamp });
            await redisClient.lPush("price_queue", queueItem);
            console.log(`Queued ${symbol} Price:`, price);
        }
        else {
            // fallback for single stream
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
//# sourceMappingURL=binance_ws.js.map