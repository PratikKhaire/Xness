import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";

type OpenTrade = {
    orderId: string;
    asset: string; // short like BTC
    type: "buy" | "sell";
    margin: number; // cents
    leverage: number;
    openPrice: number; // int with 4 decimals
    decimals: number; // 4
    ts?: number;
};

export default function OpenTrades({ onClosed }: { onClosed: () => void }) {
    const [rows, setRows] = useState<OpenTrade[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet<{ orders: OpenTrade[] }>("/v1/trades/open");
            setRows(res.orders || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load open trades");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 4000);
        return () => clearInterval(id);
    }, []);

    const closeOrder = async (orderId: string) => {
        try {
            await apiPost("/v1/trade/close", { orderId });
            onClosed();
            load();
        } catch (e: any) {
            alert(e?.message || "Close failed");
        }
    };

    return (
        <div style={{ background: "#12151B", color: "#E6E8EB", padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <strong>Open trades</strong>
                {loading && <span style={{ fontSize: 12, opacity: 0.7 }}>(loading)</span>}
                {error && <span style={{ color: "#f66" }}>{error}</span>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", opacity: 0.8 }}>
                        <th>Asset</th>
                        <th>Type</th>
                        <th>Open</th>
                        <th>Leverage</th>
                        <th>Margin</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.orderId}>
                            <td>{r.asset}</td>
                            <td style={{ color: r.type === "buy" ? "#22C55E" : "#EF4444" }}>{r.type}</td>
                            <td>{(r.openPrice / 1e4).toFixed(4)}</td>
                            <td>{r.leverage}x</td>
                            <td>${(r.margin / 100).toFixed(2)}</td>
                            <td>
                                <button onClick={() => closeOrder(r.orderId)} style={{ padding: "4px 8px" }}>
                                    Close
                                </button>
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ opacity: 0.7 }}>
                                No open trades
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
