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
    const [currentAsset, setCurrentAsset] = useState(asset);

    const { realtimeData } = useWebSocket('ws://localhost:4001', currentAsset);
    const { containerRef, spreadSeriesRef } = useChartData({
        currentAsset,
        currentInterval,
        backendUrl,
        rangeDays,
    });

    useRealtimeData({ realtimeData, spreadSeriesRef });

    const intervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const;

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', background: '#1E222D', color: '#E6E8EB' }}>
                <h2>{currentAsset}</h2>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {intervals.map((int) => (
                        <button
                            key={int}
                            onClick={() => setCurrentInterval(int)}
                            style={{
                                padding: '5px 10px',
                                background: currentInterval === int ? '#5B8CFF' : '#2A2E39',
                                color: '#E6E8EB',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            {int}
                        </button>
                    ))}
                </div>
            </div>
            <div
                ref={containerRef}
                className="chart-shell"
                style={{ flex: 1, width: '100%' }}
            />
        </div>
    );
}
