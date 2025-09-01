import { Router } from "express";
import { getPgClient, pgClient } from "../db/db-connection";
import { ordersByUser } from "./createorder";
import { closeSync } from "fs";

type CloseBody = { orderId?:string};

type ClosedTrade = {
    orderId:string;
    type:'buy'| 'sell';
    margin : number;
    leverage: number;
    openPrice:number;
    closePrice:number;
    pnl:number;
};

const closedTradesByUser : Record<string, ClosedTrade[]>={};
const router = Router();

async function getLatestPrice (symbol:string){
    await pgClient.connect();
    try{
        const {rows} = await pgClient.query(
      `SELECT bid, ask, extract(epoch from ts)::bigint as timestamp
         FROM price
        WHERE symbol = $1
        ORDER BY ts DESC
        LIMIT 1`,
      [symbol]
    );
    if(rows.length ===0) return null;
    return {
        bid:Number(rows[0].bid),
        ask:Number(rows[0].ask),
        ts:Number(rows[0].timestamp),
    };

    }
    finally{
        await pgClient.end();
    }
}

// close trader 
router.post("/v1/trade/close", async ( req , res) => {
    const userId = req.user?.sub ?? "unknown";
    const { orderId} = req.body as CloseBody;

    if(!orderId || typeof orderId !== "string"){
        return res.status(411).json({ mesage:'Incorrect inputs'});
    }
     const userOrders = ordersByUser[userId] || [];
     const order = userOrders.find( o => o.orderId  && o.status ==="open");
     if(!order){
        return res.status(404).json({message:'Order not found or not open'});
     }

     const last = await getLatestPrice(order.asset);
     if(!last || !Number.isFinite(last.bid) || !Number.isFinite(last.ask)){
        return res.status(503).json({message:"price unavailable"});
     }

     const closePriceFloat = order.type ==="buy"? last.bid: last.ask;
     const openPriceFloat = order.executedPrice;

     const exposureUSD= ( order.margin/100) * order.leverage;
     const qty = exposureUSD / openPriceFloat;

     const pnlUSD = ( order.type === "buy") ? ( closePriceFloat - openPriceFloat)* qty :(openPriceFloat-closePriceFloat)*qty;

     const closed : ClosedTrade = {
        orderId : order.orderId,
        type:order.type,
        margin:order.margin,
        leverage:order.leverage,

        openPrice:Math.round(openPriceFloat * 10000),
        closePrice:Math.round(closePriceFloat * 10000),
        pnl:Math.round(pnlUSD * 100),

     };

     order.status = "closed";

     if(!closedTradesByUser[userId]) closedTradesByUser[userId] = [];
     closedTradesByUser[userId].push(closed);

     return res.status(200).json(closed);


});

router.get('/v1/trades', ( req,res) => {
    const userId = req.user?.sub ?? 'unknown';
    const trades = closedTradesByUser[userId] || [];
    return res.status(200).json({trades});
});

export default router;