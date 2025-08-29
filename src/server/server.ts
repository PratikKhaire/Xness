import express from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getPgClient } from "../db/db-connection";

const app = express();
const port = 4000;

app.use(express.json());

const users:{[email:string] :{
    userId:string ;
    passwordHash: string
}} = {};

app.get("/api/candles", async (req , res) =>{
   const { asset, startTime, endTime, ts} = req.query;
   if(!asset || !startTime || !endTime || !ts){
    return res.status(400).json({messae:"Missing query parameters"});
   }
    
   const pgClient = getPgClient({
     user: "postgres",
     host: "localhost",
     database: "postgres",
     password: "admin@123",
     port: 5432,
   });
  
    await pgClient.connect();

try {
  const bucket = ts === "1m" ? " 1 minute" : ts === "1w" ? "1 week" : ts ==="1d" ? "1 day" :ts;
  const result = await pgClient.query(
    `SELECT extract(epoch from time_bucket($1,ts)) ::bigint as timestamp,
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
    ORDER BY timestamp ASC`,[bucket,(asset as string).toUpperCase(), startTime,endTime]
  );
  res.json({ candles: result.rows });
} catch(e){
  res.status(500).json({message:"Error fetching candles"});
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
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    users[email] = { userId, passwordHash };
    res.status(200).json({ userId });
  } catch (e) {
    res.status(403).json({ message: "Erro while signing up" });
  }
});

app.listen(port, () => {
  console.log(`server running at ${port}`);
});
