import { Router } from "express";

const router = Router();

// 6. Get USD balance
// GET /api/v1/user/balance
// Response: { "usd_balance": 500000 }  // Decimals is 2
router.get("/v1/user/balance", (_req, res) => {
  return res.status(200).json({ usd_balance: 500000 });
});

export default router;
