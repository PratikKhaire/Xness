import { Router } from "express";
import { getPgClient } from "../db/db-connection";

type AssetConfig = {
  name: string;
  symbol: string; // frontend short symbol (e.g., BTC)
  dbSymbol: string; // DB symbol (e.g., BTCUSDT)
  imageUrl: string;
};

const DECIMALS = 4;
const SCALE = Math.pow(10, DECIMALS);

const ASSETS: AssetConfig[] = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    dbSymbol: "BTCUSDT",
    imageUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=029",
  },
  {
    name: "Ethereum",
    symbol: "ETH",
    dbSymbol: "ETHUSDT",
    imageUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029",
  },
  {
    name: "BNB",
    symbol: "BNB",
    dbSymbol: "BNBUSDT",
    imageUrl: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029",
  },
];

const router = Router();

router.get("/v1/assets", async (_req, res) => {
  const symbols = ASSETS.map((a) => a.dbSymbol);

  const pg = getPgClient({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "admin@123",
    port: 5432,
  });

  await pg.connect();
  try {
    // Latest row per symbol
    const { rows } = await pg.query(
      `SELECT DISTINCT ON (symbol) symbol, bid, ask
         FROM price
        WHERE symbol = ANY($1)
        ORDER BY symbol, ts DESC`,
      [symbols]
    );

    const latestBySymbol = new Map<string, { bid: number; ask: number }>();
    for (const r of rows) {
      latestBySymbol.set(String(r.symbol), {
        bid: Number(r.bid),
        ask: Number(r.ask),
      });
    }

    const assets = ASSETS.map((cfg) => {
      const p = latestBySymbol.get(cfg.dbSymbol);
      const buy = p?.ask ?? 0; // buy at ask
      const sell = p?.bid ?? 0; // sell at bid
      return {
        name: cfg.name,
        symbol: cfg.symbol,
        buyPrice: Math.round(buy * SCALE), // integers; decimals=4
        sellPrice: Math.round(sell * SCALE), // integers; decimals=4
        decimals: DECIMALS,
        imageUrl: cfg.imageUrl,
      };
    });

    return res.status(200).json({ assets });
  } catch (e: any) {
    return res
      .status(500)
      .json({
        message: "Failed to load assets",
        error: String(e?.message || e),
      });
  } finally {
    await pg.end();
  }
});

export default router;
