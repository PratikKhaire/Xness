import { Router } from "express";

export type BalancesStore = Record<string, number>; // userId -> cents

export default function createBalanceRouter(balances: BalancesStore) {
  const router = Router();

  router.get("/v1/user/balance", (req, res) => {
    const userId = req.user?.sub ?? "unknown";
    const usd = balances[userId] ?? 500000;
    return res.status(200).json({ usd_balance: usd });
  });

  return router;
}
