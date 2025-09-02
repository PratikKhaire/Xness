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
    // track trade actions if needed later

    useEffect(() => {
        // Refresh auth state on load (e.g., token persisted)
        setAuthed(!!getAuthToken());
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0B0E11 0%, #0F1320 100%)',
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#12151B', color: '#E6E8EB', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <h2 style={{ margin: 0 }}>Xness</h2>
                            {authed && <Balance />}
                        </div>
                        {!authed && <AuthPanel onAuthed={() => setAuthed(true)} />}
                    </div>
                    <div style={{ background: '#12151B', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                        <ChartView asset={`${asset}USDT`} interval='1h' rangeDays={3} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                        <Assets selected={asset} onSelect={setAsset} onTrade={() => {}} />
                    </div>
                    {authed && (
                        <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                            <OpenTrades onClosed={() => {}} />
                        </div>
                    )}
                    {authed && (
                        <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                            <ClosedTrades />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
