import { useEffect, useRef, useState } from "react";

export function useWebSocket(url: string, currentAsset: string) {
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.symbol === currentAsset.toUpperCase()) {
        setRealtimeData((prev) => [...prev.slice(-50), data]);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [url, currentAsset]);

  return { realtimeData, wsRef };
}
