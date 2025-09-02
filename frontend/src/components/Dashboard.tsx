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
            <div style={{ width: '100%', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(11,14,17,0.6)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1400, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#E6E8EB' }}>
                        <h2 style={{ margin: 0 }}>Xness</h2>
                        {authed && <Balance />}
                    </div>
                    {!authed && <AuthPanel onAuthed={() => setAuthed(true)} />}
                </div>
            </div>
            <div style={{ maxWidth: 1400, margin: '16px auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, padding: '0 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: '#12151B', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                        <ChartView asset={`${asset}USDT`} interval='1h' rangeDays={3} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                        <Assets selected={asset} onSelect={setAsset} onTrade={() => { }} />
                    </div>
                    {authed && (
                        <div style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                            <OpenTrades onClosed={() => { }} />
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
