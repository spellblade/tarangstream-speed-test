import { useState, useMemo } from "react";
import { HistoryEntry } from "../types";
import {
  Activity,
  ShieldCheck,
  ArrowDown,
  ArrowUp,
  Zap,
  Clock,
  Info,
  Calendar,
} from "lucide-react";

interface StabilityChartProps {
  history: HistoryEntry[];
  onClearHistory?: () => void;
}

export default function StabilityChart({
  history,
  onClearHistory,
}: StabilityChartProps) {
  const [activeMetric, setActiveMetric] = useState<
    "all" | "download" | "upload" | "ping" | "jitter"
  >("all");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Math helper details for drawing paths
  const width = 640;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Process data for rendering
  const chartData = useMemo(() => {
    return [...history].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [history]);

  // Calculations for graph bounds
  const bounds = useMemo(() => {
    if (chartData.length === 0)
      return { maxSpeed: 100, maxPing: 100, maxJitter: 50 };

    const maxDownload = Math.max(...chartData.map((d) => d.download));
    const maxUpload = Math.max(...chartData.map((d) => d.upload));
    const maxPingVal = Math.max(...chartData.map((d) => d.ping));
    const maxJitterVal = Math.max(...chartData.map((d) => d.jitter || 0));

    return {
      maxSpeed: Math.max(
        10,
        Math.ceil(Math.max(maxDownload, maxUpload) * 1.15),
      ), // pad 15%
      maxPing: Math.max(20, Math.ceil(maxPingVal * 1.2)),
      maxJitter: Math.max(10, Math.ceil(maxJitterVal * 1.2)),
    };
  }, [chartData]);

  // Overall Connection Metrics calculated dynamically
  const metrics = useMemo(() => {
    if (chartData.length === 0)
      return {
        avgDl: 0,
        avgUl: 0,
        avgPing: 0,
        stabilityIndex: 100,
        avgJitter: 0,
      };

    const count = chartData.length;
    const sumDl = chartData.reduce((s, h) => s + h.download, 0);
    const sumUl = chartData.reduce((s, h) => s + h.upload, 0);
    const sumPing = chartData.reduce((s, h) => s + h.ping, 0);
    const sumJitter = chartData.reduce((s, h) => s + h.jitter, 0);

    // Connection Consistency (Stability Index)
    // Calculated by comparing standard deviation of latency to mean.
    // Low standard deviation means a highly stable, non-fluctuating connection.
    const averagePing = sumPing / count;
    const variance =
      chartData.reduce((s, h) => s + Math.pow(h.ping - averagePing, 2), 0) /
      count;
    const stdDev = Math.sqrt(variance);
    // Grade stability from 0 to 100 (high deviation yields lower score, ping spikes degrade it)
    const stabilityIndex = Math.max(
      15,
      Math.min(
        100,
        Math.round(
          100 - (stdDev / (averagePing || 1)) * 40 - (sumJitter / count) * 2,
        ),
      ),
    );

    return {
      avgDl: sumDl / count,
      avgUl: sumUl / count,
      avgPing: sumPing / count,
      avgJitter: sumJitter / count,
      stabilityIndex,
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl text-center shadow-sm">
        <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3 animate-pulse" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No stability historical logs
        </h4>
        <p className="text-xs text-slate-505 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
          Run your first speed test from the main dashboard to generate
          connection metrics and begin tracking long-term signal quality.
        </p>
      </div>
    );
  }

  // Maps index to relative X coordinate
  const getX = (index: number) => {
    if (chartData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (chartData.length - 1)) * chartWidth;
  };

  // Maps value to relative Y coordinate based on custom max ranges
  const getY = (value: number, type: "speed" | "ping" | "jitter") => {
    const max =
      type === "speed"
        ? bounds.maxSpeed
        : type === "ping"
          ? bounds.maxPing
          : bounds.maxJitter;
    return height - paddingBottom - (value / max) * chartHeight;
  };

  // Helper arrays for building custom path bezier curves
  const makePointsList = (
    metricKey: "download" | "upload" | "ping" | "jitter",
    valueType: "speed" | "ping" | "jitter",
  ) => {
    return chartData.map((d, i) => ({
      x: getX(i),
      y: getY(d[metricKey] || 0, valueType),
      val: d[metricKey] || 0,
    }));
  };

  const getSvgPathString = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    if (points.length === 1)
      return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;

    // Draw smooth cubic bezier or segmented curves (monotone)
    return points.reduce((path, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 3;
      const cy1 = prev.y;
      const cx2 = prev.x + (2 * (p.x - prev.x)) / 3;
      const cy2 = p.y;
      return `${path} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
    }, "");
  };

  const downloadPoints = makePointsList("download", "speed");
  const uploadPoints = makePointsList("upload", "speed");
  const pingPoints = makePointsList("ping", "ping");
  const jitterPoints = makePointsList("jitter", "jitter");

  const dlPath = getSvgPathString(downloadPoints);
  const ulPath = getSvgPathString(uploadPoints);
  const pngPath = getSvgPathString(pingPoints);
  const jtrPath = getSvgPathString(jitterPoints);

  // Closed paths to compute gradient area underneath graphs
  const dlAreaPath = dlPath
    ? `${dlPath} L ${getX(chartData.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`
    : "";
  const ulAreaPath = ulPath
    ? `${ulPath} L ${getX(chartData.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`
    : "";

  // Grid tick placements (e.g. 4 divisions)
  const speedGridLevels = Array.from({ length: 4 }, (_, i) =>
    Math.round((bounds.maxSpeed / 3) * i),
  );
  const pingGridLevels = Array.from({ length: 4 }, (_, i) =>
    Math.round((bounds.maxPing / 3) * i),
  );
  const jitterGridLevels = Array.from({ length: 4 }, (_, i) =>
    Math.round((bounds.maxJitter / 3) * i),
  );

  // Determine current hovered statistics details
  const activeHoverData =
    hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Dynamic Key Performance Indicators (KPIs) cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI: Consistency */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
              Stability
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {metrics.stabilityIndex}%
              </span>
            </div>
            <span className="text-[10px] text-slate-550 dark:text-slate-400 font-medium">
              {metrics.stabilityIndex >= 90
                ? "Excellent Line"
                : metrics.stabilityIndex >= 75
                  ? "Stable Flow"
                  : "High Jitter"}
            </span>
          </div>
        </div>

        {/* KPI: Dynamic Avg Download */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
            <ArrowDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
              Avg Down
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {metrics.avgDl.toFixed(1)}
              </span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                Mbps
              </span>
            </div>
            <span className="text-[10px] text-slate-550 dark:text-slate-400 font-medium">
              Across {chartData.length} records
            </span>
          </div>
        </div>

        {/* KPI: Dynamic Avg Upload */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ArrowUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
              Avg Up
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {metrics.avgUl.toFixed(1)}
              </span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                Mbps
              </span>
            </div>
            <span className="text-[10px] text-slate-550 dark:text-slate-400 font-medium">
              Throughput peak
            </span>
          </div>
        </div>

        {/* KPI: General Latency Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-450">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
              Avg Latency
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {metrics.avgPing.toFixed(0)}
              </span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                ms
              </span>
            </div>
            <span className="text-[10px] text-slate-550 dark:text-slate-400 font-medium">
              Packet delay
            </span>
          </div>
        </div>

        {/* KPI: Jitter Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-start gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
              Avg Jitter
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                {metrics.avgJitter.toFixed(1)}
              </span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                ms
              </span>
            </div>
            <span className="text-[10px] text-slate-550 dark:text-slate-400 font-medium">
              Ping variance
            </span>
          </div>
        </div>
      </div>

      {/* Main Stability Visualizer Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 relative shadow-sm">
        {/* Toggle controls & Clear button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 select-none">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs">
            <button
              onClick={() => setActiveMetric("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeMetric === "all" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-105 shadow-sm border border-slate-200/40 dark:border-slate-800" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              All Signals
            </button>
            <button
              onClick={() => setActiveMetric("download")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeMetric === "download" ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Download
            </button>
            <button
              onClick={() => setActiveMetric("upload")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeMetric === "upload" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Upload
            </button>
            <button
              onClick={() => setActiveMetric("ping")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeMetric === "ping" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 border border-amber-100/50 dark:border-amber-900/30" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Ping
            </button>
            <button
              onClick={() => setActiveMetric("jitter")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeMetric === "jitter" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border border-rose-100/50 dark:border-rose-900/30" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              Jitter
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onClearHistory && (
              <button
                onClick={onClearHistory}
                className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 uppercase transition-all duration-200 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/60 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 font-bold"
              >
                Flush Cache
              </button>
            )}
          </div>
        </div>

        {/* SVG Drawing Area */}
        <div className="relative w-full overflow-hidden">
          <svg
            className="w-full h-auto overflow-visible"
            viewBox={`0 0 ${width} ${height}`}
            onMouseLeave={() => setHoveredIndex(null)}
            onMouseMove={(e) => {
              const svgRect = e.currentTarget.getBoundingClientRect();
              const scaleX = width / svgRect.width;
              const mouseX = (e.clientX - svgRect.left) * scaleX;

              // Find closest entry on the X axis
              let closestIdx = 0;
              let minDistance = Infinity;
              chartData.forEach((_, i) => {
                const dist = Math.abs(getX(i) - mouseX);
                if (dist < minDistance) {
                  minDistance = dist;
                  closestIdx = i;
                }
              });
              setHoveredIndex(closestIdx);
            }}
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="dlAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="ulAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>

              {/* Glowing dot shadow templates */}
              <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            {speedGridLevels.map((lvl, index) => {
              const y = getY(lvl, "speed");
              return (
                <g key={`sg-${index}`} className="opacity-80">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    className="stroke-slate-100 dark:stroke-slate-800/75"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Left Label Axis (Mbps) */}
                  {(activeMetric === "all" ||
                    activeMetric === "download" ||
                    activeMetric === "upload") && (
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      className="fill-slate-400 dark:fill-slate-500"
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="end"
                    >
                      {lvl}M
                    </text>
                  )}
                </g>
              );
            })}

            {/* Right side Ping labels for Latency axis */}
            {activeMetric === "ping" &&
              pingGridLevels.map((lvl, index) => {
                const y = getY(lvl, "ping");
                return (
                  <g key={`pg-${index}`} className="opacity-80">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      className="stroke-slate-100 dark:stroke-slate-800/75"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={width - paddingRight + 5}
                      y={y + 3}
                      fill="#d97706"
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="start"
                    >
                      {lvl}ms
                    </text>
                  </g>
                );
              })}

            {/* Right side Jitter labels for Jitter axis */}
            {activeMetric === "jitter" &&
              jitterGridLevels.map((lvl, index) => {
                const y = getY(lvl, "jitter");
                return (
                  <g key={`jg-${index}`} className="opacity-80">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={width - paddingRight}
                      y2={y}
                      className="stroke-slate-100 dark:stroke-slate-800/75"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={width - paddingRight + 5}
                      y={y + 3}
                      fill="#f43f5e"
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="start"
                    >
                      {lvl}ms
                    </text>
                  </g>
                );
              })}

            {/* Draw Paths depending on the active selector metric */}

            {/* 1. Download Path Group */}
            {(activeMetric === "all" || activeMetric === "download") &&
              dlAreaPath && (
                <>
                  <path
                    d={dlAreaPath}
                    fill="url(#dlAreaGrad)"
                    className="transition-all duration-300"
                  />
                  <path
                    d={dlPath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </>
              )}

            {/* 2. Upload Path Group */}
            {(activeMetric === "all" || activeMetric === "upload") &&
              ulAreaPath && (
                <>
                  <path
                    d={ulAreaPath}
                    fill="url(#ulAreaGrad)"
                    className="transition-all duration-300"
                  />
                  <path
                    d={ulPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </>
              )}

            {/* 3. Latency (Ping) Path Group */}
            {(activeMetric === "all" || activeMetric === "ping") && pngPath && (
              <path
                d={pngPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeDasharray="4 3"
                strokeLinecap="round"
                opacity={activeMetric === "all" ? 0.5 : 1}
                className="transition-all duration-300"
              />
            )}

            {/* 4. Jitter Path Group */}
            {(activeMetric === "all" || activeMetric === "jitter") &&
              jtrPath && (
                <path
                  d={jtrPath}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.8"
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  opacity={activeMetric === "all" ? 0.45 : 1}
                  className="transition-all duration-300"
                />
              )}

            {/* Vertical grid markers corresponding to the timestamps */}
            {chartData.map((d, i) => {
              const x = getX(i);
              return (
                <g key={`vg-${i}`} className="opacity-60">
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={height - paddingBottom}
                    className="stroke-slate-50 dark:stroke-slate-900/40"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Highlights/Dots on Hover */}
            {hoveredIndex !== null && (
              <g>
                {/* Scrubbing bar vertical marker */}
                <line
                  x1={getX(hoveredIndex)}
                  y1={paddingTop}
                  x2={getX(hoveredIndex)}
                  y2={height - paddingBottom}
                  className="stroke-slate-300 dark:stroke-slate-700"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Metrics Highlight Sparkles */}
                {downloadPoints[hoveredIndex] &&
                  (activeMetric === "all" || activeMetric === "download") && (
                    <circle
                      cx={downloadPoints[hoveredIndex].x}
                      cy={downloadPoints[hoveredIndex].y}
                      r="5"
                      fill="#2563eb"
                      className="stroke-white dark:stroke-slate-900"
                      strokeWidth="2.5"
                      filter="url(#dotGlow)"
                    />
                  )}
                {uploadPoints[hoveredIndex] &&
                  (activeMetric === "all" || activeMetric === "upload") && (
                    <circle
                      cx={uploadPoints[hoveredIndex].x}
                      cy={uploadPoints[hoveredIndex].y}
                      r="5"
                      fill="#059669"
                      className="stroke-white dark:stroke-slate-900"
                      strokeWidth="2.5"
                      filter="url(#dotGlow)"
                    />
                  )}
                {pingPoints[hoveredIndex] &&
                  (activeMetric === "all" || activeMetric === "ping") && (
                    <circle
                      cx={pingPoints[hoveredIndex].x}
                      cy={pingPoints[hoveredIndex].y}
                      r="4.5"
                      fill="#d97706"
                      className="stroke-white dark:stroke-slate-900"
                      strokeWidth="2"
                      filter="url(#dotGlow)"
                    />
                  )}
                {jitterPoints[hoveredIndex] &&
                  (activeMetric === "all" || activeMetric === "jitter") && (
                    <circle
                      cx={jitterPoints[hoveredIndex].x}
                      cy={jitterPoints[hoveredIndex].y}
                      r="4.5"
                      fill="#f43f5e"
                      className="stroke-white dark:stroke-slate-900"
                      strokeWidth="2"
                      filter="url(#dotGlow)"
                    />
                  )}
              </g>
            )}
          </svg>
        </div>

        {/* Bottom Horizontal Calendar Axis Labels */}
        <div className="flex justify-between pl-[42px] pr-[12px] mt-2 select-none">
          <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 font-bold">
            {new Date(chartData[0].timestamp).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 font-bold">
            Chronological Performance Log
          </span>
          <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 font-bold">
            {new Date(
              chartData[chartData.length - 1].timestamp,
            ).toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Floating Tooltip info bar */}
        <div className="mt-4 bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-100 dark:border-slate-850 flex flex-wrap justify-between items-center gap-4 text-xs font-mono min-h-[50px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
          {activeHoverData ? (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-405 dark:text-slate-500" />
                <span className="text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                  {new Date(activeHoverData.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">
                    Download:
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {activeHoverData.download.toFixed(1)}{" "}
                    <span className="text-[8px] font-normal text-slate-400 dark:text-slate-500">
                      M
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">
                    Upload:
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeHoverData.upload.toFixed(1)}{" "}
                    <span className="text-[8px] font-normal text-slate-400 dark:text-slate-500">
                      M
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">
                    Ping:
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {activeHoverData.ping}{" "}
                    <span className="text-[8px] font-normal text-slate-400 dark:text-slate-500">
                      ms
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">
                    Jitter:
                  </span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold">
                    {activeHoverData.jitter}{" "}
                    <span className="text-[8px] font-normal text-slate-400 dark:text-slate-500">
                      ms
                    </span>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 w-full text-center justify-center py-0.5">
              <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Hover/Scrub across the graph timeline above to drill into
                historic packet telemetry
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-b-slate-850 flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 dark:text-slate-400">
            Complete Historical Log ({chartData.length})
          </span>
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold text-right uppercase">
            Newest first
          </span>
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
          {[...chartData].reverse().map((entry) => (
            <div
              key={entry.id}
              className="p-3 w-full text-xs font-mono grid grid-cols-5 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-all items-center"
            >
              <div className="text-slate-400 dark:text-slate-550 text-[10px] pl-2 font-bold">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-blue-500/60 dark:text-blue-400/60" />
                {entry.download.toFixed(1)}{" "}
                <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">
                  Mbps
                </span>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-emerald-500/60 dark:text-emerald-400/60" />
                {entry.upload.toFixed(1)}{" "}
                <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">
                  Mbps
                </span>
              </div>
              <div className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500/60 dark:text-amber-400/60" />
                {entry.ping}{" "}
                <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">
                  ms
                </span>
              </div>
              <div
                className="text-slate-500 dark:text-slate-400 font-bold text-[10px] text-right pr-3 truncate"
                title={entry.isp}
              >
                {entry.isp.length > 18
                  ? entry.isp.substring(0, 16) + ".."
                  : entry.isp}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
