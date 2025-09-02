import { useEffect, useRef } from "react";

interface RealtimeDataProps {
  realtimeData: any[];
  spreadSeriesRef: React.MutableRefObject<any>;
  livePriceSeriesRef?: React.MutableRefObject<any>;
}

export function useRealtimeData({
  realtimeData,
  spreadSeriesRef,
  livePriceSeriesRef,
}: RealtimeDataProps) {
  const processedTimestampsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (spreadSeriesRef.current && realtimeData.length > 0) {
      const newData = realtimeData
        .filter((item) => {
          const timestamp = Math.floor(item.timestamp / 1000); // Round to seconds to avoid duplicates
          if (processedTimestampsRef.current.has(timestamp)) {
            return false;
          }
          processedTimestampsRef.current.add(timestamp);
          return true;
        })
        .map((item) => ({
          time: Math.floor(item.timestamp / 1000) as any,
          // scale spread to float (data published is float mid for both sides; if later updated to ints, adjust here)
          value: Number(item.askPrice) - Number(item.bidPrice),
        }))
        .sort((a, b) => a.time - b.time);

      if (newData.length > 0) {
        // Get current data and merge with new data
        const currentData = spreadSeriesRef.current.data() || [];
        const combinedData = [...currentData, ...newData]
          .sort((a, b) => a.time - b.time)
          .filter((item, index, arr) => {
            // Remove duplicates based on time
            return index === 0 || item.time !== arr[index - 1].time;
          });

        spreadSeriesRef.current.setData(combinedData);

        // Update live price line with last tick's price if available
        if (livePriceSeriesRef?.current) {
          const last = realtimeData[realtimeData.length - 1];
          if (last) {
            const t = Math.floor(Number(last.timestamp) / 1000);
            const p = Number(last.price || last.askPrice || last.bidPrice);
            if (Number.isFinite(t) && Number.isFinite(p)) {
              // assume spot mid price is float
              livePriceSeriesRef.current.update({ time: t as any, value: p });
            }
          }
        }

        // Keep only recent timestamps to prevent memory leaks
        if (processedTimestampsRef.current.size > 1000) {
          const timestamps = Array.from(processedTimestampsRef.current).sort();
          const keepCount = 500;
          const toKeep = new Set(timestamps.slice(-keepCount));
          processedTimestampsRef.current = toKeep;
        }
      }
    }
  }, [realtimeData, spreadSeriesRef]);
}
