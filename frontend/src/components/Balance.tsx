import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

export default function Balance() {
    const [usd, setUsd] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        try {
            const res = await apiGet<{ usd_balance: number }>("/v1/user/balance");
            setUsd(res.usd_balance);
        } catch (e: any) {
            setError(e?.message || "Failed to load balance");
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <strong>Balance:</strong>
            {usd === null ? (
                <span>—</span>
            ) : (
                <span>${(usd / 100).toFixed(2)}</span>
            )}
            {error && <span style={{ color: "#f66" }}>{error}</span>}
        </div>
    );
}
