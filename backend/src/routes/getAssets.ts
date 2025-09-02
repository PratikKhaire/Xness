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
      `SELECT DISTINCT ON (symbol) symbol, bid, ask, decimals
         FROM price
        WHERE symbol = ANY($1)
        ORDER BY symbol, ts DESC`,
      [symbols]
    );

    const latestBySymbol = new Map<
      string,
      { bid: number; ask: number; decimals: number }
    >();
    for (const r of rows) {
      latestBySymbol.set(String(r.symbol), {
        bid: Number(r.bid),
        ask: Number(r.ask),
        decimals: Number(r.decimals) || DECIMALS,
      });
    }

    const assets = ASSETS.map((cfg) => {
      const p = latestBySymbol.get(cfg.dbSymbol);
      const srcDecimals = p?.decimals ?? DECIMALS;
      const scaleAdj = Math.pow(10, DECIMALS - srcDecimals);
      const askInt = Math.round((p?.ask ?? 0) * scaleAdj);
      const bidInt = Math.round((p?.bid ?? 0) * scaleAdj);

      // 1% spread on integers (multiply then divide to avoid rounding loss)
      const buy = Math.round(askInt * 1.01);
      const sell = Math.round(bidInt * 0.99);
      return {
        name: cfg.name,
        symbol: cfg.symbol,
        buyPrice: buy, // integers; decimals=4
        sellPrice: sell, // integers; decimals=4
        decimals: DECIMALS,
        imageUrl: cfg.imageUrl,
      };
    });

    return res.status(200).json({ assets });
  } catch (e: any) {
    return res.status(500).json({
      message: "Failed to load assets",
      error: String(e?.message || e),
    });
  } finally {
    await pg.end();
  }
});

export default router;
