"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_connection_1 = require("../db/db-connection");
const app = (0, express_1.default)();
const port = 4000;
app.use(express_1.default.json());
const users = {};
app.get("/api/candles", async (req, res) => {
    const { asset, startTime, endTime, ts } = req.query;
    if (!asset || !startTime || !endTime || !ts) {
        return res.status(400).json({ messae: "Missing query parameters" });
    }
    const pgClient = (0, db_connection_1.getPgClient)({
        user: "postgress",
        host: "localhost",
        database: "postgress",
        password: "admin@123",
        port: 5432,
    });
    await pgClient.connect();
    try {
        const bucket = ts === "1m" ? " 1 minute" : ts === "1w" ? "1 week" : ts === "1d" ? "1 day" : ts;
        const result = await pgClient.query(`SELECT extract(epoch from time_bucket($1,ts)) ::bigint as timestamp,
    first(bid,ts) as open,
    last(bid,ts) as close,
    max(bid) as high,
    min(bid) as low,
    4 as decimal 
    FROM price 
    WHERE symbol= $2
    AND ts >=to_timestamp($3)
    AND ts<= to_timestamp($4)
    GROUP BY time_bucket($1,ts)
    ORDER BY timestamp ASC`, [bucket, asset.toUpperCase(), startTime, endTime]);
        res.json({ candel: result.rows });
    }
    catch (e) {
        res.status(500).json({ message: "Error fetching candles" });
    }
    finally {
        await pgClient.end();
    }
});
app.post("/api/v1/user/signup", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(403).json({ message: "error while signing up" });
    }
    if (users[email]) {
        return res.status(403).json({ message: "Error while signing up" });
    }
    try {
        const userId = (0, uuid_1.v4)();
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        users[email] = { userId, passwordHash };
        res.status(200).json({ userId });
    }
    catch (e) {
        res.status(403).json({ message: "Erro while signing up" });
    }
});
app.listen(port, () => {
    console.log(`server running at ${port}`);
});
//# sourceMappingURL=server.js.map