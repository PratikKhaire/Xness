import { useEffect, useRef } from "react";

interface RealtimeDataProps {
  realtimeData: any[];
  spreadSeriesRef: React.MutableRefObject<any>;
}

export function useRealtimeData({
  realtimeData,
  spreadSeriesRef,
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
          value: parseFloat(item.askPrice) - parseFloat(item.bidPrice),
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
