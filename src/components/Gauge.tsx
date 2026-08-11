interface GaugeProps {
  label: "Download" | "Upload";
  value: number; // in Mbps
  isActive: boolean;
  isCompleted: boolean;
  colorClass: string; // 'cyan' or 'violet'
  peakValue: number;
}

/**
 * Maps speed (0 - 1000 Mbps) to a 0.0 - 1.0 progress factor using an Ookla-style non-linear scaling line:
 * - 0% to 20% of dial: 0 - 10 Mbps
 * - 20% to 45% of dial: 10 - 100 Mbps
 * - 45% to 75% of dial: 100 - 500 Mbps
 * - 75% to 100% of dial: 500 - 1000+ Mbps
 */
export function getSpeedPercent(speed: number): number {
  if (speed <= 0) return 0;
  if (speed <= 10) {
    return (speed / 10) * 0.2;
  }
  if (speed <= 100) {
    return 0.2 + ((speed - 10) / 90) * 0.25;
  }
  if (speed <= 500) {
    return 0.45 + ((speed - 100) / 400) * 0.3;
  }
  return Math.min(1.0, 0.75 + ((speed - 500) / 500) * 0.25);
}

export default function Gauge({
  label,
  value,
  isActive,
  isCompleted,
  colorClass,
  peakValue,
}: GaugeProps) {
  const percent = getSpeedPercent(value);

  // Custom dial arc values
  // Start position: -215deg (bottom-left) to +35deg (bottom-right) representing a 250deg active sweep
  const sweepAngle = 250;
  const startAngle = -215;
  const targetRotation = startAngle + percent * sweepAngle;

  // SVG configuration
  const radius = 110;
  const center = 130;
  const circumference = 2 * Math.PI * radius;
  // Arc lengths matching the 250deg sweep
  const strokeLength = (sweepAngle / 360) * circumference;
  const strokeOffset = circumference - strokeLength;
  const filledOffset = strokeLength - percent * strokeLength;

  // Tick points to display around the non-linear scale boundary (speed, label, dial-percent)
  const ticks = [
    { speed: 0, label: "0" },
    { speed: 10, label: "10" },
    { speed: 50, label: "50" },
    { speed: 100, label: "100" },
    { speed: 250, label: "250" },
    { speed: 500, label: "500" },
    { speed: 1000, label: "1G" },
  ];

  // Specific Tailwind classes depending on the connection type (Download vs Upload)
  const isCyan = colorClass === "cyan";
  const shadowTheme = isCyan
    ? "shadow-[0_4px_24px_rgba(59,130,246,0.08)]"
    : "shadow-[0_4px_24px_rgba(16,185,129,0.08)]";
  const textTheme = isCyan ? "text-blue-600" : "text-emerald-600";
  const borderTheme = isCyan ? "border-blue-100/50" : "border-emerald-100/50";
  const activeGlow = isActive ? "animate-pulse font-semibold" : "";

  return (
    <div
      className={`relative flex flex-col items-center bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 border ${borderTheme} dark:border-slate-800/80 ${shadowTheme} min-w-[270px] flex-1 transition-all duration-300`}
    >
      {/* Top Banner Tag */}
      <div className="flex justify-between items-center w-full mb-5">
        <span className="text-xs uppercase tracking-widest font-mono text-slate-400 dark:text-slate-500 font-bold">
          {label} Phase
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${isActive ? (isCyan ? "bg-blue-500 animate-ping" : "bg-emerald-500 animate-ping") : isCompleted ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
          />
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500 font-semibold uppercase">
            {isActive ? "active" : isCompleted ? "complete" : "idle"}
          </span>
        </div>
      </div>

      {/* Speedometer Gauge Visualizer */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
        <svg
          className="w-full h-full select-none overflow-visible"
          viewBox="0 0 260 260"
        >
          <defs>
            {/* Color Gradients for filling paths */}
            <linearGradient
              id={`gaugeGrad-${colorClass}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {isCyan ? (
                <>
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </>
              )}
            </linearGradient>

            {/* Glowing filter effect for premium aesthetics */}
            <filter
              id={`glowFilter-${colorClass}`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-slate-100 dark:stroke-slate-800/60"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${strokeLength} ${strokeOffset}`}
            style={{
              transform: `rotate(${startAngle}deg)`,
              transformOrigin: "50% 50%",
            }}
          />

          {/* Active Highlight Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#gaugeGrad-${colorClass})`}
            strokeWidth={percent > 0 ? "12" : "0"}
            strokeLinecap="round"
            strokeDasharray={`${percent * strokeLength} ${circumference - percent * strokeLength}`}
            strokeDashoffset="0"
            filter={`url(#glowFilter-${colorClass})`}
            className="transition-all duration-300 ease-out"
            style={{
              transform: `rotate(${startAngle}deg)`,
              transformOrigin: "50% 50%",
            }}
          />

          {/* Fine Tick Marks Around Gauge */}
          {ticks.map((tick, i) => {
            const tickPercent = getSpeedPercent(tick.speed);
            const tickAngleInRad =
              ((startAngle + tickPercent * sweepAngle) * Math.PI) / 180;
            const cos = Math.cos(tickAngleInRad);
            const sin = Math.sin(tickAngleInRad);

            // Outer and inner coordinate pairs for drawing tick ticks
            const startX = center + (radius + 4) * cos;
            const startY = center + (radius + 4) * sin;
            const endX = center + (radius - 8) * cos;
            const endY = center + (radius - 8) * sin;

            // Label positions (further inward)
            const labelX = center + (radius - 24) * cos;
            const labelY = center + (radius - 24) * sin;

            return (
              <g key={i}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={
                    percent >= tickPercent
                      ? isCyan
                        ? "#3b82f6"
                        : "#10b981"
                      : undefined
                  }
                  className={
                    percent >= tickPercent
                      ? ""
                      : "stroke-slate-200 dark:stroke-slate-800/80"
                  }
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  className={`select-none transition-all duration-300 ${percent >= tickPercent ? "fill-slate-800 dark:fill-slate-200" : "fill-slate-400 dark:fill-slate-500"}`}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Speed Indicator Needle */}
          <g
            style={{
              transform: `rotate(${targetRotation}deg)`,
              transformOrigin: `${center}px ${center}px`,
            }}
            className="transition-transform duration-300 ease-out"
          >
            {/* Needle Shaft */}
            <line
              x1={center}
              y1={center}
              x2={center + radius - 6}
              y2={center}
              stroke={isCyan ? "#2563eb" : "#059669"}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Elegant Needle Accent Line */}
            <line
              x1={center}
              y1={center}
              x2={center + radius - 16}
              y2={center}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Gauge Core Center Hub */}
            <circle
              cx={center}
              cy={center}
              r="9"
              className="fill-white dark:fill-slate-900"
              stroke={isCyan ? "#2563eb" : "#059669"}
              strokeWidth="3.5"
            />
          </g>
        </svg>

        {/* Central Numeric Readout */}
        <div className="absolute inset-x-0 bottom-5 md:bottom-8 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-5xl md:text-6xl font-extrabold font-mono tracking-tight text-slate-800 dark:text-slate-100 flex items-baseline select-none">
            {value.toFixed(2).split(".")[0]}
            <span className="text-2xl md:text-3xl font-medium text-slate-400 dark:text-slate-500">
              .{value.toFixed(2).split(".")[1]}
            </span>
          </div>
          <span className="text-xs md:text-sm font-mono tracking-wider text-slate-400 dark:text-slate-500 mt-1 font-semibold">
            Mbps
          </span>
        </div>
      </div>

      {/* Auxiliary Stats (Peak Speed, Dial Ratio) */}
      <div className="mt-4 w-full flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 select-none">
        <div className="flex flex-col">
          <span className="text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
            Peak Speed
          </span>
          <span className="text-sm font-mono font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
            {peakValue > 0 ? `${peakValue.toFixed(2)} Mbps` : "—"}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-bold block">
            Gauge Dial
          </span>
          <span
            className={`text-sm font-mono font-semibold ${textTheme} mt-0.5 ${activeGlow}`}
          >
            {(percent * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
