import { useEffect, useState } from "react";
import AuthPanel from "./AuthPanel";
import Balance from "./Balance";
import Assets from "./Assets";
import OpenTrades from "./OpenTrades";
import ClosedTrades from "./ClosedTrades";
import ChartView from '../componets/ChartView';
import { getAuthToken } from "../api/client";

export default function Dashboard() {
    const [authed, setAuthed] = useState<boolean>(!!getAuthToken());
    const [asset, setAsset] = useState<string>("BTC");
    const [lastOrderId, setLastOrderId] = useState<string | null>(null);

    useEffect(() => {
        // Refresh auth state on load (e.g., token persisted)
        setAuthed(!!getAuthToken());
    }, []);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#12151B', color: '#E6E8EB', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>Xness</h2>
                        {authed && <Balance />}
                    </div>
                    {!authed && <AuthPanel onAuthed={() => setAuthed(true)} />}
                </div>
                <ChartView asset={`${asset}USDT`} interval='1h' rangeDays={3} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Assets selected={asset} onSelect={setAsset} onTrade={(id) => setLastOrderId(id)} />
                {authed && <OpenTrades onClosed={() => setLastOrderId(null)} />}
                {authed && <ClosedTrades />}
            </div>
        </div>
    );
}
