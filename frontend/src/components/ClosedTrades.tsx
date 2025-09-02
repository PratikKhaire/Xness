import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

type ClosedTrade = {
    orderId: string;
    asset: string;
    type: "buy" | "sell";
    margin: number; // cents
    leverage: number;
    openPrice: number; // int
    closePrice: number; // int
    decimals: number; // 4
    ts: number; // epoch seconds
    pnl: number; // cents
};

export default function ClosedTrades() {
    const [rows, setRows] = useState<ClosedTrade[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet<{ orders: ClosedTrade[] }>("/v1/trades");
            setRows(res.orders || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load closed trades");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 6000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ background: "#12151B", color: "#E6E8EB", padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <strong>Closed trades</strong>
                {loading && <span style={{ fontSize: 12, opacity: 0.7 }}>(loading)</span>}
                {error && <span style={{ color: "#f66" }}>{error}</span>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", opacity: 0.8 }}>
                        <th>Asset</th>
                        <th>Type</th>
                        <th>Open</th>
                        <th>Close</th>
                        <th>Leverage</th>
                        <th>Margin</th>
                        <th>PNL</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.orderId}>
                            <td>{r.asset}</td>
                            <td style={{ color: r.type === "buy" ? "#22C55E" : "#EF4444" }}>{r.type}</td>
                            <td>{(r.openPrice / 1e4).toFixed(4)}</td>
                            <td>{(r.closePrice / 1e4).toFixed(4)}</td>
                            <td>{r.leverage}x</td>
                            <td>${(r.margin / 100).toFixed(2)}</td>
                            <td style={{ color: r.pnl >= 0 ? "#22C55E" : "#EF4444" }}>
                                ${(r.pnl / 100).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ opacity: 0.7 }}>
                                No closed trades
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
