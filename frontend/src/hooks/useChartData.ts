import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  CandlestickSeries,
  LineSeries,
  CrosshairMode,
} from "lightweight-charts";

interface ChartData {
  currentAsset: string;
  currentInterval: string;
  backendUrl: string;
  rangeDays: number;
}

export function useChartData({
  currentAsset,
  currentInterval,
  backendUrl,
  rangeDays,
}: ChartData) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const spreadSeriesRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getWidth = () => container.clientWidth || 600;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {}
      chartRef.current = null;
    }

    const chart = createChart(container, {
      width: getWidth(),
      height: Math.max(420, Math.round(window.innerHeight * 0.75)),
      layout: {
        textColor: "#E6E8EB",
        background: { color: "#0B0E11" },
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(150, 150, 150, 0.4)",
          labelBackgroundColor: "#1E222D",
        },
        horzLine: {
          color: "rgba(150, 150, 150, 0.4)",
          labelBackgroundColor: "#1E222D",
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderVisible: false,
      },
      localization: {
        priceFormatter: (p: number) => p.toFixed(4),
      },
    });
    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#5B8CFF",
      topColor: "rgba(91, 140, 255, 0.25)",
      bottomColor: "rgba(91, 140, 255, 0.05)",
      priceLineVisible: false,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderUpColor: "#22C55E",
      borderDownColor: "#EF4444",
      wickUpColor: "#22C55E",
      wickDownColor: "#EF4444",
    });

    const spreadSeries = chart.addSeries(LineSeries, {
      color: "#FF6B6B",
      lineWidth: 2,
      title: "Bid-Ask Spread",
    });
    spreadSeriesRef.current = spreadSeries;

    const end = Math.floor(Date.now() / 1000);
    const start = end - rangeDays * 24 * 60 * 60;
    const url = `${backendUrl}/api/candles?asset=${encodeURIComponent(
      currentAsset
    )}&startTime=${start}&endTime=${end}&ts=${encodeURIComponent(
      currentInterval
    )}`;

    const ac = new AbortController();

    (async () => {
      try {
        const resp = await fetch(url, { signal: ac.signal });
        if (!resp.ok) {
          console.error("Failed to fetch candles", await resp.text());
          return;
        }
        const payload = (await resp.json()) as {
          candles: Array<{
            timestamp: number;
            open: number;
            high: number;
            low: number;
            close: number;
          }>;
        };

        const rows = (payload.candles ?? [])
          .map((c) => ({
            timeSec: Number(c.timestamp),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          }))
          .filter(
            (p) =>
              Number.isFinite(p.timeSec) &&
              Number.isFinite(p.open) &&
              Number.isFinite(p.high) &&
              Number.isFinite(p.low) &&
              Number.isFinite(p.close)
          )
          .sort((a, b) => a.timeSec - b.timeSec);

        if (rows.length === 0) {
          console.warn("No candles to render");
          return;
        }

        const toTime = (t: number) => {
          if (currentInterval === "1d" || currentInterval === "1w") {
            return new Date(t * 1000).toISOString().slice(0, 10);
          }
          return t;
        };

        const ohlc = rows.map((r) => ({
          time: toTime(r.timeSec) as any,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
        }));

        const line = rows.map((r) => ({
          time: toTime(r.timeSec) as any,
          value: r.close,
        }));

        candleSeries.setData(ohlc);
        areaSeries.setData(line);
        chart.timeScale().fitContent();
      } catch (e: any) {
        if (e?.name !== "AbortError") console.error("Error loading candles", e);
      }
    })();

    const ro = new ResizeObserver(() => {
      if (!chartRef.current) return;
      chartRef.current.applyOptions({
        width: getWidth(),
        height: Math.max(420, Math.round(window.innerHeight * 0.75)),
      });
    });
    ro.observe(container);

    return () => {
      ac.abort();
      ro.disconnect();
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
    };
  }, [currentAsset, currentInterval, backendUrl, rangeDays]);

  return { containerRef, chartRef, spreadSeriesRef };
}
