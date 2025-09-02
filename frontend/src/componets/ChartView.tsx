import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useChartData } from '../hooks/useChartData';
import { useRealtimeData } from '../hooks/useRealtimeData';

type Props = {
    asset?: string;
    backendUrl?: string;
    interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
    rangeDays?: number;
};

export default function ChartView({
    asset = 'BTCUSDT',
    backendUrl = 'http://localhost:4000',
    interval = '1d',
    rangeDays = 14,
}: Props) {
    const [currentInterval, setCurrentInterval] = useState(interval);
    const [currentAsset] = useState(asset);

    const { realtimeData } = useWebSocket('ws://localhost:4001', currentAsset);
    const { containerRef, spreadSeriesRef, livePriceSeriesRef } = useChartData({
        currentAsset,
        currentInterval,
        backendUrl,
        rangeDays,
    });

    useRealtimeData({ realtimeData, spreadSeriesRef, livePriceSeriesRef });

    const intervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const;

    return (
        <div style={{ width: '100%', minHeight: 420, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(90deg, #0F172A 0%, #1E293B 100%)', color: '#E6E8EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, letterSpacing: 0.5 }}>{currentAsset}</h2>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {intervals.map((int) => (
                        <button
                            key={int}
                            onClick={() => setCurrentInterval(int)}
                            style={{
                                padding: '6px 12px',
                                background: currentInterval === int ? '#5B8CFF' : 'rgba(255,255,255,0.06)',
                                color: '#E6E8EB',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }}
                        >
                            {int}
                        </button>
                    ))}
                </div>
            </div>
            <div ref={containerRef} className="chart-shell" style={{ flex: 1, width: '100%', minHeight: 360 }} />
        </div>
    );
}
