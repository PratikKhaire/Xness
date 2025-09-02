import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api/client";

type Asset = {
    name: string;
    symbol: string; // short e.g., BTC
    buyPrice: number; // int with 4 decimals
    sellPrice: number; // int with 4 decimals
    decimals: number; // 4
    imageUrl: string;
};

const LEVERAGES = [1, 5, 10, 20, 100];

export default function Assets({
    selected, // short, e.g. 'BTC'
    onSelect,
    onTrade,
}: {
    selected: string;
    onSelect: (symShort: string) => void;
    onTrade: (orderId: string) => void;
}) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [marginUsd, setMarginUsd] = useState<number>(100); // dollars
    const [leverage, setLeverage] = useState<number>(10);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet<{ assets: Asset[] }>("/v1/assets");
            setAssets(res.assets || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load assets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, []);

    const current = useMemo(
        () => assets.find((a) => a.symbol === selected) || assets[0],
        [assets, selected]
    );

    const place = async (type: "buy" | "sell") => {
        if (!current) return;
        try {
            const body = {
                asset: current.symbol, // backend maps BTC->BTCUSDT
                type,
                margin: Math.round((marginUsd || 0) * 100), // cents
                leverage,
            };
            const res = await apiPost<{ orderId: string }>("/v1/trade", body);
            onTrade(res.orderId);
        } catch (e: any) {
            alert(e?.message || "Trade failed");
        }
    };

    return (
        <div style={{ background: "#12151B", color: "#E6E8EB", padding: 12, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <strong>Assets</strong>
                {loading && <span style={{ fontSize: 12, opacity: 0.7 }}>(loading)</span>}
                {error && <span style={{ color: "#f66" }}>{error}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {assets.map((a) => (
                    <button
                        key={a.symbol}
                        onClick={() => onSelect(a.symbol)}
                        style={{
                            padding: "6px 10px",
                            background: selected === a.symbol ? "#2A2E39" : "#0B0E11",
                            color: "#E6E8EB",
                            border: "1px solid #2A2E39",
                            borderRadius: 6,
                            cursor: "pointer",
                        }}
                    >
                        <span style={{ marginRight: 6 }}>{a.symbol}</span>
                        <span style={{ opacity: 0.8 }}>
                            B {(a.buyPrice / 1e4).toFixed(4)} S {(a.sellPrice / 1e4).toFixed(4)}
                        </span>
                    </button>
                ))}
            </div>
            {current && (
                <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Margin (USD)</div>
                        <input
                            type="number"
                            min={1}
                            value={marginUsd}
                            onChange={(e) => setMarginUsd(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Leverage</div>
                        <select value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}>
                            {LEVERAGES.map((l) => (
                                <option key={l} value={l}>
                                    {l}x
                                </option>
                            ))}
                        </select>
                    </div>
                    <button onClick={() => place("buy")} style={{ padding: "6px 12px", background: "#22C55E", color: "#0B0E11", border: 0, borderRadius: 6 }}>Buy</button>
                    <button onClick={() => place("sell")} style={{ padding: "6px 12px", background: "#EF4444", color: "#0B0E11", border: 0, borderRadius: 6 }}>Sell</button>
                </div>
            )}
        </div>
    );
}
