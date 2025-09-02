import axios from "axios";

async function main() {
  const base = "http://localhost:4000/api";
  const email = `demo+${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "P@ssw0rd!";

  console.log("signup...", email);
  await axios.post(`${base}/v1/user/signup`, { email, password });

  console.log("signin...");
  const { data: signin } = await axios.post(`${base}/v1/user/signin`, {
    email,
    password,
  });
  const token: string = signin.token;
  const headers = { Authorization: `Bearer ${token}` };

  console.log("create trade...");
  const { data: create } = await axios.post(
    `${base}/v1/trade`,
    { asset: "BTC", type: "buy", margin: 10000, leverage: 10 },
    { headers }
  );
  console.log("ORDER=", create);

  console.log("open trades...");
  const { data: open } = await axios.get(`${base}/v1/trades/open`, { headers });
  console.log("OPEN=", open);

  const orderId: string = create.orderId;
  await new Promise((r) => setTimeout(r, 2000));

  console.log("close trade...");
  const { data: closed } = await axios.post(
    `${base}/v1/trade/close`,
    { orderId },
    { headers }
  );
  console.log("CLOSED=", closed);

  console.log("balance...");
  const { data: bal } = await axios.get(`${base}/v1/user/balance`, {
    headers,
  });
  console.log("BAL=", bal);
}

main().catch((e) => {
  console.error("Smoke test failed:", e?.response?.data || e.message || e);
  process.exit(1);
});
