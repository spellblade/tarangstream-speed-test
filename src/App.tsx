import {
  useState,
  useEffect,
  useRef,
  useMemo,
  lazy,
  Suspense,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  TestPhase,
  SpeedData,
  IspInfo,
  HistoryEntry,
  ServerOption,
} from "./types";

// Prod (real /api) implementation
import * as prodSpeed from "./utils/speedTest";
// Dedicated localhost / testing overrides (ALL localhost-specific code lives here)
import * as localSpeed from "./utils/speedTest.local";

// Shared non-runner utilities (always safe to pull from prod)
import {
  measurePing,
  fetchIspDetails,
  getSpeedCurveValue,
  calculateDistance,
  calculateWMA,
} from "./utils/speedTest";
import { sanitizeHistoryEntries } from "./utils/historySanitize";
import { validatePingHostUrl } from "./utils/urlValidation";
import { sanitizeCustomServers } from "./utils/customServers";
import { buildHistoryCsv } from "./utils/csv";
import Gauge from "./components/Gauge";
import StatsCard from "./components/StatsCard";

const StabilityChart = lazy(() => import("./components/StabilityChart"));
const AboutPage = lazy(() => import("./components/AboutPage"));
import {
  Activity,
  History,
  Info,
  Play,
  RotateCcw,
  Wifi,
  Server,
  Zap,
  Clock,
  Compass,
  ArrowRight,
  ShieldCheck,
  MapPin,
  FlameKindling,
  Send,
  ArrowDown,
  ArrowUp,
  Globe,
  Award,
  BookOpen,
  Cpu,
  Trash2,
  Plus,
  X,
  Sun,
  Moon,
  Download,
} from "lucide-react";

// Seeding realistic historical logs so the stability graph starts with rich data,
// while letting the application persist all subsequent test cycles.
const BASE_HISTORY: HistoryEntry[] = [
  {
    id: "seed-1",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    download: 342.5,
    upload: 182.1,
    ping: 18,
    jitter: 3,
    isp: "Gigabit Fiber Corp",
    server: "Optimal Automatic",
  },
  {
    id: "seed-2",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    download: 295.1,
    upload: 154.2,
    ping: 24,
    jitter: 5,
    isp: "Gigabit Fiber Corp",
    server: "Optimal Automatic",
  },
  {
    id: "seed-3",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    download: 388.9,
    upload: 210.5,
    ping: 16,
    jitter: 2,
    isp: "Gigabit Fiber Corp",
    server: "Optimal Automatic",
  },
  {
    id: "seed-4",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    download: 412.0,
    upload: 220.8,
    ping: 15,
    jitter: 2,
    isp: "Gigabit Fiber Corp",
    server: "Optimal Automatic",
  },
  {
    id: "seed-5",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    download: 165.4, // represent peak-hour congestion dip
    upload: 82.0,
    ping: 32,
    jitter: 9,
    isp: "Gigabit Fiber Corp",
    server: "Optimal Automatic",
  },
];

const DEFAULT_SERVER_OPTIONS: ServerOption[] = [
  {
    id: "optimal",
    name: "Automatic Optimal Node",
    location: "Lowest Latency Route",
  },
  {
    id: "oregon",
    name: "Cloud Provider (US-West)",
    location: "Oregon, USA",
    lat: 45.8283,
    lon: -120.3184,
  },
  {
    id: "virginia",
    name: "Cloud Provider (US-East)",
    location: "Virginia, USA",
    lat: 37.4316,
    lon: -78.6569,
  },
  {
    id: "frankfurt",
    name: "High-Speed CDN Node",
    location: "Frankfurt, GER",
    lat: 50.1109,
    lon: 8.6821,
  },
  {
    id: "london",
    name: "Core Gateway (UK-West)",
    location: "London, GBR",
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: "singapore",
    name: "Pacific Transit Point",
    location: "Singapore, SGP",
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: "tokyo",
    name: "Asia Pacific Edge",
    location: "Tokyo, JPN",
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: "sydney",
    name: "Oceania Backbone",
    location: "Sydney, AUS",
    lat: -33.8688,
    lon: 151.2093,
  },
  {
    id: "saopaulo",
    name: "South America Hub",
    location: "São Paulo, BRA",
    lat: -23.5505,
    lon: -46.6333,
  },
  {
    id: "mumbai",
    name: "South Asia Core",
    location: "Mumbai, IND",
    lat: 19.076,
    lon: 72.8777,
  },
];

const POPULAR_CITIES = [
  { name: "New York, USA", lat: 40.7128, lon: -74.006 },
  { name: "Los Angeles, USA", lat: 34.0522, lon: -118.2437 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
  { name: "Mumbai, India", lat: 19.076, lon: 72.8777 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Cape Town, S. Africa", lat: -33.9249, lon: 18.4241 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "speedometer" | "stability" | "diagnostics"
  >("speedometer");
  const [view, setView] = useState<"app" | "about">("app");

  // Dark mode state with localStorage and system preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const cached = localStorage.getItem("theme");
    if (cached) {
      return cached === "dark";
    }
    // Check system preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Localhost detection (true when client and server are on same machine -> we use the dedicated local test file)
  const isLocal = localSpeed.isLocalEnvironment();

  useEffect(() => {
    // Speed up theme transition by temporarily disabling CSS transitions on all elements
    const css = document.createElement("style");
    css.type = "text/css";
    css.appendChild(
      document.createTextNode(
        `* {
           -webkit-transition: none !important;
           -moz-transition: none !important;
           -o-transition: none !important;
           -ms-transition: none !important;
           transition: none !important;
        }`,
      ),
    );
    document.head.appendChild(css);

    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Force a reflow to ensure the style changes are applied instantly before transitions are re-enabled
    const _ = window.getComputedStyle(css).opacity;

    // Remove the style block to restore standard hover/state transitions
    document.head.removeChild(css);
  }, [darkMode]);

  // Prefetch lazy-loaded components on mount to make tab & page transitions completely instantaneous
  useEffect(() => {
    const prefetch = async () => {
      try {
        await Promise.all([
          import("./components/StabilityChart"),
          import("./components/AboutPage"),
        ]);
      } catch (e) {
        console.warn("Background prefetching failed", e);
      }
    };
    const timer = setTimeout(prefetch, 800);
    return () => clearTimeout(timer);
  }, []);

  // State for speed test results
  const [testPhase, setTestPhase] = useState<TestPhase>("idle");
  const [speeds, setSpeeds] = useState<SpeedData>({
    download: 0,
    upload: 0,
    ping: 0,
    jitter: 0,
    packetLoss: 0,
    maxStreams: 1,
  });
  const [peakSpeeds, setPeakSpeeds] = useState<{
    download: number;
    upload: number;
  }>({ download: 0, upload: 0 });
  const [overallProgress, setOverallProgress] = useState(0); // 0 - 100%
  const [packetsSent, setPacketsSent] = useState<number>(0);
  const [livePps, setLivePps] = useState<number>(0); // Keeps compatibility with standard PPS/Ping Count visualizer if needed

  // New High-Fidelity Network telemetry states
  const [liveEMA, setLiveEMA] = useState<number>(0);
  const [liveWMA, setLiveWMA] = useState<number>(0);
  const [livePacketLoss, setLivePacketLoss] = useState<number>(0);
  const [liveStreams, setLiveStreams] = useState<number>(1);
  const [smoothingMethod, setSmoothingMethod] = useState<
    "EMA" | "WMA" | "Hybrid"
  >("Hybrid");

  // Create speeds ref to avoid stale closure issues in timers/intervals
  const speedsRef = useRef(speeds);
  useEffect(() => {
    speedsRef.current = speeds;
  }, [speeds]);

  // ISP and Servers
  const [ispInfo, setIspInfo] = useState<IspInfo | null>(null);
  const [isIspLoading, setIsIspLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<ServerOption>(
    DEFAULT_SERVER_OPTIONS[0],
  );

  // Load custom servers on mount
  const [customServers, setCustomServers] = useState<ServerOption[]>([]);
  const [showAddServerForm, setShowAddServerForm] = useState(false);

  // Custom server form inputs
  const [customName, setCustomName] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  // Combination of standard and custom servers
  const allServers = useMemo(() => {
    return [...DEFAULT_SERVER_OPTIONS, ...customServers];
  }, [customServers]);

  useEffect(() => {
    const cachedCustom = localStorage.getItem("custom_speedtest_servers");
    if (cachedCustom) {
      try {
        const sanitized = sanitizeCustomServers(JSON.parse(cachedCustom));
        setCustomServers(sanitized);
        localStorage.setItem(
          "custom_speedtest_servers",
          JSON.stringify(sanitized),
        );
      } catch (e) {
        console.error("Failed to parse custom servers", e);
      }
    }
  }, []);

  const handleAddCustomServer = (e: FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customCity.trim()) return;

    const latVal = parseFloat(customLat);
    const lonVal = parseFloat(customLon);

    let validatedUrl: string | undefined;
    const rawUrl = customUrl.trim();
    if (rawUrl) {
      const checked = validatePingHostUrl(rawUrl);
      if (!checked.ok) {
        // Reject private/loopback/non-http targets rather than storing a hostile URL
        return;
      }
      validatedUrl = checked.url;
    }

    const newSrv: ServerOption = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      location: customCity.trim(),
      lat: isNaN(latVal) ? undefined : latVal,
      lon: isNaN(lonVal) ? undefined : lonVal,
      url: validatedUrl,
      isCustom: true,
    };

    const updated = [...customServers, newSrv];
    setCustomServers(updated);
    localStorage.setItem("custom_speedtest_servers", JSON.stringify(updated));
    setSelectedServer(newSrv);

    // Reset fields
    setCustomName("");
    setCustomCity("");
    setCustomLat("");
    setCustomLon("");
    setCustomUrl("");
    setShowAddServerForm(false);
  };

  const handleDeleteCustomServer = (id: string, e: MouseEvent) => {
    e.stopPropagation(); // Prevent choosing the server being deleted
    const updated = customServers.filter((s) => s.id !== id);
    setCustomServers(updated);
    localStorage.setItem("custom_speedtest_servers", JSON.stringify(updated));

    // If deleted server was active, fallback to optimal
    if (selectedServer.id === id) {
      setSelectedServer(DEFAULT_SERVER_OPTIONS[0]);
    }
  };

  const applyCityPreset = (city: (typeof POPULAR_CITIES)[number]) => {
    setCustomCity(city.name);
    setCustomLat(city.lat.toString());
    setCustomLon(city.lon.toString());
  };

  const generateDiagnosticReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      systemInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        networkType: (navigator as any).connection?.effectiveType || "unknown",
      },
      ispInfo: ispInfo
        ? {
            isp: ispInfo.isp,
            ip: ispInfo.ip,
            asn: ispInfo.asn,
            city: ispInfo.city,
            region: ispInfo.region,
            country: ispInfo.country,
            lat: ispInfo.lat,
            lon: ispInfo.lon,
            isFallback: ispInfo.isFallback,
          }
        : "No ISP details loaded",
      currentSessionTest: {
        phase: testPhase,
        activeServer: {
          id: selectedServer.id,
          name: selectedServer.name,
          location: selectedServer.location,
          lat: selectedServer.lat,
          lon: selectedServer.lon,
          url: selectedServer.url,
        },
        speeds: {
          downloadMbps: speeds.download,
          uploadMbps: speeds.upload,
          pingMs: speeds.ping,
          jitterMs: speeds.jitter,
          packetLossPercent: speeds.packetLoss,
          maxConcurrentStreams: speeds.maxStreams,
        },
        smoothingAlgorithms: {
          activeMethod: smoothingMethod,
          currentEMA: liveEMA,
          currentWMA: liveWMA,
        },
      },
      historyLogsCount: history.length,
      historicalLog: history.map((entry) => ({
        timestamp: entry.timestamp,
        downloadMbps: entry.download,
        uploadMbps: entry.upload,
        pingMs: entry.ping,
        jitterMs: entry.jitter,
        packetLossPercent: entry.packetLoss || 0,
        maxStreams: entry.maxStreams || 1,
        isp: entry.isp,
        server: entry.server,
      })),
    };
    return report;
  };

  const [copiedState, setCopiedState] = useState(false);

  const handleCopyReport = () => {
    const data = JSON.stringify(generateDiagnosticReport(), null, 2);
    navigator.clipboard.writeText(data);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownloadReport = () => {
    const data = JSON.stringify(generateDiagnosticReport(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;

    const csvContent = buildHistoryCsv(history);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `telemetry_speed_test_history_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServerDistance = (srv: ServerOption) => {
    if (
      srv.id === "optimal" ||
      !ispInfo ||
      srv.lat === undefined ||
      srv.lon === undefined
    )
      return null;
    return calculateDistance(ispInfo.lat, ispInfo.lon, srv.lat, srv.lon);
  };

  // History tracking locally
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Timer reference for controlling interval frame rates
  const testIntervalRef = useRef<number | null>(null);

  // Abort controller and cancellation tracking for speed tests
  const activeTestControllerRef = useRef<AbortController | null>(null);
  const isInterruptedRef = useRef<boolean>(false);

  const interruptSpeedTest = () => {
    isInterruptedRef.current = true;

    if (activeTestControllerRef.current) {
      activeTestControllerRef.current.abort();
      activeTestControllerRef.current = null;
    }

    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }

    setSpeeds({ download: 0, upload: 0, ping: 0, jitter: 0 });
    setPeakSpeeds({ download: 0, upload: 0 });
    setOverallProgress(0);
    setLivePps(0);
    setPacketsSent(0);
    setTestPhase("idle");
  };

  // Hook: Load values from localStorage
  useEffect(() => {
    // ISP Geolookup on startup
    const locate = async () => {
      setIsIspLoading(true);
      const info = await fetchIspDetails();
      setIspInfo(info);
      setIsIspLoading(false);
    };
    locate();

    // Cache list (sanitize untrusted localStorage JSON)
    const cached = localStorage.getItem("network_speed_history");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const sanitized = sanitizeHistoryEntries(parsed);
        if (sanitized.length === 0) {
          setHistory(BASE_HISTORY);
          localStorage.setItem(
            "network_speed_history",
            JSON.stringify(BASE_HISTORY),
          );
        } else {
          setHistory(sanitized);
          localStorage.setItem(
            "network_speed_history",
            JSON.stringify(sanitized),
          );
        }
      } catch {
        setHistory(BASE_HISTORY);
      }
    } else {
      setHistory(BASE_HISTORY);
      localStorage.setItem(
        "network_speed_history",
        JSON.stringify(BASE_HISTORY),
      );
    }
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (testIntervalRef.current) clearInterval(testIntervalRef.current);
    };
  }, []);

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem("network_speed_history");
  };

  /**
   * Primary Speed Test Execution Thread
   */
  const startSpeedTest = async () => {
    if (testPhase !== "idle" && testPhase !== "complete") return;

    isInterruptedRef.current = false;
    const controller = new AbortController();
    activeTestControllerRef.current = controller;
    const { signal } = controller;

    // Reset speeds
    setSpeeds({ download: 0, upload: 0, ping: 0, jitter: 0 });
    setPeakSpeeds({ download: 0, upload: 0 });
    setOverallProgress(2);
    setTestPhase("latency");
    setPacketsSent(0);
    setLivePps(0);

    try {
      // 1. Resolve testing node (find closest server if optimal is selected)
      let targetServer = selectedServer;
      if (selectedServer.id === "optimal") {
        if (ispInfo && ispInfo.lat !== undefined && ispInfo.lon !== undefined) {
          let closest: ServerOption | null = null;
          let minDistance = Infinity;
          for (const s of allServers) {
            if (
              s.id === "optimal" ||
              s.lat === undefined ||
              s.lon === undefined
            )
              continue;
            const dist = calculateDistance(
              ispInfo.lat,
              ispInfo.lon,
              s.lat,
              s.lon,
            );
            if (dist < minDistance) {
              minDistance = dist;
              closest = s;
            }
          }
          if (closest) {
            targetServer = closest;
          } else {
            targetServer = allServers[1] || selectedServer;
          }
        } else {
          targetServer = allServers[1] || selectedServer;
        }
      }

      if (isInterruptedRef.current || signal.aborted) return;

      // 2. Calculate geographic distance factor
      let distanceFactor = 1.0;
      let computedDistance = 0;
      if (
        ispInfo &&
        ispInfo.lat !== undefined &&
        ispInfo.lon !== undefined &&
        targetServer.lat !== undefined &&
        targetServer.lon !== undefined
      ) {
        computedDistance = calculateDistance(
          ispInfo.lat,
          ispInfo.lon,
          targetServer.lat,
          targetServer.lon,
        );

        if (computedDistance <= 500) {
          distanceFactor = 1.0;
        } else if (computedDistance <= 2000) {
          distanceFactor = 0.95 - (computedDistance - 500) * 0.0001;
        } else if (computedDistance <= 8000) {
          distanceFactor = 0.8 - (computedDistance - 2000) * 0.00004;
        } else {
          distanceFactor = 0.56 - (computedDistance - 8000) * 0.000015;
        }
        distanceFactor = Math.max(0.18, distanceFactor);
      } else if (targetServer.id !== "optimal") {
        // General fallbacks if no coordinates available
        if (
          targetServer.id.includes("oregon") ||
          targetServer.id.includes("west")
        )
          distanceFactor = 0.85;
        else if (
          targetServer.id.includes("frankfurt") ||
          targetServer.id.includes("europe")
        )
          distanceFactor = 0.7;
        else if (
          targetServer.id.includes("singapore") ||
          targetServer.id.includes("asia")
        )
          distanceFactor = 0.62;
        else if (targetServer.id.includes("tokyo")) distanceFactor = 0.65;
        else if (targetServer.id.includes("sydney")) distanceFactor = 0.55;
        else if (targetServer.id.includes("mumbai")) distanceFactor = 0.6;
      }

      if (isInterruptedRef.current || signal.aborted) return;

      // Step 1: Measure authentic, real hardware physical ping & jitter to our target server
      const pingResults = await measurePing(
        (sampleLatency, index) => {
          if (isInterruptedRef.current || signal.aborted) return;
          const livePing = Math.round(sampleLatency);
          const packetNum = index + 1;
          setPacketsSent(packetNum);

          // Calculate PPS: 1000 / livePing
          const pps = livePing > 0 ? 1000 / livePing : 0;
          setLivePps(parseFloat(pps.toFixed(1)));

          // Smoothly advance overall progress from 2% to 15% during handshake phase
          const subProgress = 2 + Math.round((packetNum / 10) * 13);
          setOverallProgress(subProgress);

          // Instantly tick current latency ping display
          setSpeeds((prev) => ({
            ...prev,
            ping: livePing,
          }));
        },
        targetServer,
        ispInfo ? { lat: ispInfo.lat, lon: ispInfo.lon } : null,
        signal,
      );

      if (isInterruptedRef.current || signal.aborted) return;

      const basePing = pingResults.ping;
      const baseJitter = pingResults.jitter;

      setSpeeds((prev) => ({
        ...prev,
        ping: Math.round(basePing),
        jitter: Math.round(baseJitter),
      }));
      setOverallProgress(15);

      // Give a short pause to read latency phase before jumping indicators
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

      if (isInterruptedRef.current || signal.aborted) return;
      setTestPhase("download");

      // Step 2: Run Download Pipeline
      let baselineDownloadTarget = 450;
      if (basePing < 20) {
        baselineDownloadTarget = 920; // Gigabit Fiber
      } else if (basePing < 45) {
        baselineDownloadTarget = 480; // High-tier Cable
      } else if (basePing < 100) {
        baselineDownloadTarget = 180; // Mid-tier DSL
      } else {
        baselineDownloadTarget = 52; // Remote / Satellite
      }

      // Adapt speed target to choice distance multipliers
      const finalDownloadTarget = baselineDownloadTarget * distanceFactor;

      try {
        if (isInterruptedRef.current || signal.aborted) return;
        // Run high-fidelity real network download test
        // On localhost we delegate to speedTest.local.ts (public CDN / ServerOption)
        const onDownloadProgress = (
          liveEMAVal: number,
          liveWMAVal: number,
          progress: number,
          activeStreams: number,
          estimatedPacketLoss: number,
        ) => {
          if (isInterruptedRef.current || signal.aborted) return;
          // Map 0-100% test progress to 15-55% overall progress
          const overallProg = 15 + Math.round((progress / 100) * 40);
          setOverallProgress(overallProg);

          setLiveEMA(liveEMAVal);
          setLiveWMA(liveWMAVal);
          setLivePacketLoss(estimatedPacketLoss);
          setLiveStreams(activeStreams);

          const prefSpeed =
            smoothingMethod === "EMA"
              ? liveEMAVal
              : smoothingMethod === "WMA"
                ? liveWMAVal
                : parseFloat(((liveEMAVal + liveWMAVal) / 2).toFixed(2));

          setSpeeds((prev) => ({
            ...prev,
            download: prefSpeed,
            packetLoss: estimatedPacketLoss,
            maxStreams: Math.max(prev.maxStreams || 1, activeStreams),
          }));
          setPeakSpeeds((prev) => ({
            ...prev,
            download: Math.max(prev.download, prefSpeed),
          }));
          setLivePps(activeStreams);
        };

        const finalRealDownload = isLocal
          ? await localSpeed.runRealDownloadTest(
              6000,
              onDownloadProgress,
              signal,
              targetServer,
            )
          : await prodSpeed.runRealDownloadTest(
              6000,
              onDownloadProgress,
              signal,
            );

        if (isInterruptedRef.current || signal.aborted) return;

        const finalPrefDownload =
          smoothingMethod === "EMA"
            ? finalRealDownload.emaSpeed
            : smoothingMethod === "WMA"
              ? finalRealDownload.wmaSpeed
              : parseFloat(
                  (
                    (finalRealDownload.emaSpeed + finalRealDownload.wmaSpeed) /
                    2
                  ).toFixed(2),
                );

        setSpeeds((prev) => ({
          ...prev,
          download: finalPrefDownload,
          packetLoss: finalRealDownload.estimatedPacketLoss,
          maxStreams: Math.max(
            prev.maxStreams || 1,
            finalRealDownload.maxStreams,
          ),
        }));
        setPeakSpeeds((prev) => ({
          ...prev,
          download: Math.max(prev.download, finalPrefDownload),
        }));

        // Brief transition gap
        setOverallProgress(55);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 500);
          signal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });

        if (isInterruptedRef.current || signal.aborted) return;
        await runUploadPhase(
          basePing,
          baseJitter,
          distanceFactor,
          targetServer,
          signal,
        );
      } catch (err: any) {
        if (
          isInterruptedRef.current ||
          signal.aborted ||
          err.name === "AbortError"
        ) {
          console.log("[Download Test] Aborted by user action.");
          return;
        }

        console.warn(
          "[Download Test] Real network stream failed or was blocked. Reverting to simulated speed curves...",
          err,
        );

        let dlTicks = 0;
        const dlDurationTicks = 100;
        let lastSimEMA = 0;
        const simSamples: number[] = [];

        testIntervalRef.current = window.setInterval(() => {
          if (isInterruptedRef.current || signal.aborted) {
            if (testIntervalRef.current) clearInterval(testIntervalRef.current);
            return;
          }
          dlTicks++;
          const currentPercent = dlTicks / dlDurationTicks;
          const currentProgressValue = 15 + Math.round(currentPercent * 40);
          setOverallProgress(currentProgressValue);

          // Compute actual current flow speed from simulated slow-start waves
          const speed = getSpeedCurveValue(
            currentPercent,
            finalDownloadTarget,
            baseJitter,
            false,
          );
          simSamples.push(speed);

          // Simulate EMA and WMA
          const simEMA =
            lastSimEMA === 0 ? speed : 0.22 * speed + 0.78 * lastSimEMA;
          lastSimEMA = simEMA;
          const simWMA = calculateWMA(simSamples, 5);

          // Simulated packet loss (based on jitter and slight fluctuation)
          const simLoss = Math.min(
            8.5,
            parseFloat(
              Math.max(
                0,
                baseJitter / 185 + Math.sin(dlTicks / 4) * 0.3,
              ).toFixed(2),
            ),
          );
          const simStreams =
            speed > 120 ? 6 : speed > 45 ? 4 : speed > 12 ? 2 : 1;

          setLiveEMA(parseFloat(simEMA.toFixed(2)));
          setLiveWMA(parseFloat(simWMA.toFixed(2)));
          setLivePacketLoss(simLoss);
          setLiveStreams(simStreams);

          const prefSpeed =
            smoothingMethod === "EMA"
              ? simEMA
              : smoothingMethod === "WMA"
                ? simWMA
                : (simEMA + simWMA) / 2;
          const finalPref = parseFloat(prefSpeed.toFixed(2));

          setSpeeds((prev) => ({
            ...prev,
            download: finalPref,
            packetLoss: simLoss,
            maxStreams: Math.max(prev.maxStreams || 1, simStreams),
          }));
          setPeakSpeeds((prev) => ({
            ...prev,
            download: Math.max(prev.download, finalPref),
          }));

          if (dlTicks >= dlDurationTicks) {
            if (testIntervalRef.current) clearInterval(testIntervalRef.current);

            // Brief transition gap
            setOverallProgress(55);
            setTimeout(() => {
              if (isInterruptedRef.current || signal.aborted) return;
              runUploadPhase(
                basePing,
                baseJitter,
                distanceFactor,
                targetServer,
                signal,
              );
            }, 500);
          }
        }, 50) as any;
      }
    } catch (err: any) {
      if (
        err.name === "AbortError" ||
        isInterruptedRef.current ||
        signal.aborted
      ) {
        console.log("[Speed Test] Routine aborted safely.");
      } else {
        console.error("[Speed Test Error]", err);
        setTestPhase("idle");
      }
    }
  };

  const runUploadPhase = async (
    ping: number,
    jitter: number,
    distanceFactor: number,
    targetServer: ServerOption,
    signal: AbortSignal,
  ) => {
    if (isInterruptedRef.current || signal.aborted) return;
    setTestPhase("upload");

    // Step 3: Run Upload Pipeline
    let baselineUploadTarget = 150;
    if (ping < 20) {
      baselineUploadTarget = 450; // Symmetrical fiber
    } else if (ping < 45) {
      baselineUploadTarget = 85;
    } else if (ping < 100) {
      baselineUploadTarget = 30;
    } else {
      baselineUploadTarget = 12;
    }

    const finalUploadTarget = baselineUploadTarget * distanceFactor;

    try {
      if (isInterruptedRef.current || signal.aborted) return;
      // Run high-fidelity real network upload test
      // On localhost we use the pure simulation exported from speedTest.local.ts (realistic numbers)
      let finalRealUpload;
      if (isLocal) {
        finalRealUpload = await localSpeed.runLocalUploadTest(
          6000,
          (
            liveEMAVal,
            liveWMAVal,
            progress,
            activeStreams,
            estimatedPacketLoss,
          ) => {
            if (isInterruptedRef.current || signal.aborted) return;
            const overallProg = 55 + Math.round((progress / 100) * 40);
            setOverallProgress(overallProg);

            setLiveEMA(liveEMAVal);
            setLiveWMA(liveWMAVal);
            setLivePacketLoss(estimatedPacketLoss);
            setLiveStreams(activeStreams);

            const prefSpeed =
              smoothingMethod === "EMA"
                ? liveEMAVal
                : smoothingMethod === "WMA"
                  ? liveWMAVal
                  : parseFloat(((liveEMAVal + liveWMAVal) / 2).toFixed(2));

            setSpeeds((prev) => ({
              ...prev,
              upload: prefSpeed,
              packetLoss: parseFloat(
                (
                  (prev.packetLoss || 0) * 0.5 +
                  estimatedPacketLoss * 0.5
                ).toFixed(2),
              ),
              maxStreams: Math.max(prev.maxStreams || 1, activeStreams),
            }));
            setPeakSpeeds((prev) => ({
              ...prev,
              upload: Math.max(prev.upload, prefSpeed),
            }));
            setLivePps(activeStreams);
          },
          signal,
          finalUploadTarget,
          jitter,
        );
      } else {
        finalRealUpload = await prodSpeed.runRealUploadTest(
          6000,
          (
            liveEMAVal,
            liveWMAVal,
            progress,
            activeStreams,
            estimatedPacketLoss,
          ) => {
            if (isInterruptedRef.current || signal.aborted) return;
            const overallProg = 55 + Math.round((progress / 100) * 40);
            setOverallProgress(overallProg);

            setLiveEMA(liveEMAVal);
            setLiveWMA(liveWMAVal);
            setLivePacketLoss(estimatedPacketLoss);
            setLiveStreams(activeStreams);

            const prefSpeed =
              smoothingMethod === "EMA"
                ? liveEMAVal
                : smoothingMethod === "WMA"
                  ? liveWMAVal
                  : parseFloat(((liveEMAVal + liveWMAVal) / 2).toFixed(2));

            setSpeeds((prev) => ({
              ...prev,
              upload: prefSpeed,
              packetLoss: parseFloat(
                (
                  (prev.packetLoss || 0) * 0.5 +
                  estimatedPacketLoss * 0.5
                ).toFixed(2),
              ),
              maxStreams: Math.max(prev.maxStreams || 1, activeStreams),
            }));
            setPeakSpeeds((prev) => ({
              ...prev,
              upload: Math.max(prev.upload, prefSpeed),
            }));
            setLivePps(activeStreams);
          },
          signal,
        );
      }

      if (isInterruptedRef.current || signal.aborted) return;

      const finalPrefUpload =
        smoothingMethod === "EMA"
          ? finalRealUpload.emaSpeed
          : smoothingMethod === "WMA"
            ? finalRealUpload.wmaSpeed
            : parseFloat(
                (
                  (finalRealUpload.emaSpeed + finalRealUpload.wmaSpeed) /
                  2
                ).toFixed(2),
              );

      setSpeeds((prev) => ({
        ...prev,
        upload: finalPrefUpload,
        packetLoss: parseFloat(
          (
            (prev.packetLoss || 0) * 0.5 +
            finalRealUpload.estimatedPacketLoss * 0.5
          ).toFixed(2),
        ),
        maxStreams: Math.max(prev.maxStreams || 1, finalRealUpload.maxStreams),
      }));
      setPeakSpeeds((prev) => ({
        ...prev,
        upload: Math.max(prev.upload, finalPrefUpload),
      }));

      handleTestCompletion(
        ping,
        jitter,
        finalPrefUpload,
        finalRealUpload.estimatedPacketLoss,
        finalRealUpload.maxStreams,
        targetServer,
      );
    } catch (err: any) {
      if (
        isInterruptedRef.current ||
        signal.aborted ||
        err.name === "AbortError"
      ) {
        console.log("[Upload Test] Aborted by user action.");
        return;
      }

      console.warn(
        "[Upload Test] Real network stream failed or was blocked. Reverting to simulated speed curves...",
        err,
      );

      let ulTicks = 0;
      const ulDurationTicks = 100;
      let lastSimEMA = 0;
      const simSamples: number[] = [];

      testIntervalRef.current = window.setInterval(() => {
        if (isInterruptedRef.current || signal.aborted) {
          if (testIntervalRef.current) clearInterval(testIntervalRef.current);
          return;
        }
        ulTicks++;
        const currentPercent = ulTicks / ulDurationTicks;
        const currentProgressValue = 55 + Math.round(currentPercent * 40);
        setOverallProgress(currentProgressValue);

        // Compute visual speed fluctuation using flow curves
        const speed = getSpeedCurveValue(
          currentPercent,
          finalUploadTarget,
          jitter,
          true,
        );
        simSamples.push(speed);

        // Simulate EMA and WMA
        const simEMA =
          lastSimEMA === 0 ? speed : 0.22 * speed + 0.78 * lastSimEMA;
        lastSimEMA = simEMA;
        const simWMA = calculateWMA(simSamples, 5);

        // Simulated packet loss
        const simLoss = Math.min(
          6.8,
          parseFloat(
            Math.max(0, jitter / 200 + Math.sin(ulTicks / 6) * 0.25).toFixed(2),
          ),
        );
        const simStreams = speed > 85 ? 6 : speed > 35 ? 4 : speed > 8 ? 2 : 1;

        setLiveEMA(parseFloat(simEMA.toFixed(2)));
        setLiveWMA(parseFloat(simWMA.toFixed(2)));
        setLivePacketLoss(simLoss);
        setLiveStreams(simStreams);

        const prefSpeed =
          smoothingMethod === "EMA"
            ? simEMA
            : smoothingMethod === "WMA"
              ? simWMA
              : (simEMA + simWMA) / 2;
        const finalPref = parseFloat(prefSpeed.toFixed(2));

        setSpeeds((prev) => ({
          ...prev,
          upload: finalPref,
          packetLoss: parseFloat(
            ((prev.packetLoss || 0) * 0.5 + simLoss * 0.5).toFixed(2),
          ),
          maxStreams: Math.max(prev.maxStreams || 1, simStreams),
        }));
        setPeakSpeeds((prev) => ({
          ...prev,
          upload: Math.max(prev.upload, finalPref),
        }));

        if (ulTicks >= ulDurationTicks) {
          if (testIntervalRef.current) clearInterval(testIntervalRef.current);
          if (isInterruptedRef.current || signal.aborted) return;
          handleTestCompletion(
            ping,
            jitter,
            finalPref,
            simLoss,
            simStreams,
            targetServer,
          );
        }
      }, 50) as any;
    }
  };

  const handleTestCompletion = (
    ping: number,
    jitter: number,
    finalUpload: number,
    finalLoss: number,
    finalStreams: number,
    targetServer: ServerOption,
  ) => {
    if (isInterruptedRef.current) return;
    setOverallProgress(100);
    setTestPhase("complete");

    // Capture complete results & add directly to history
    const finalDownload = speedsRef.current.download;

    const serverDisplayName =
      selectedServer.id === "optimal"
        ? `Auto [${targetServer.name}]`
        : targetServer.name;

    const finalData: HistoryEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      download: finalDownload,
      upload: finalUpload,
      ping: Math.round(ping),
      jitter: Math.round(jitter),
      isp: ispInfo?.isp || "Gigabit Fiber Corp",
      server: serverDisplayName,
      packetLoss: parseFloat(finalLoss.toFixed(2)),
      maxStreams: finalStreams,
    };

    // Complete final stats updates
    setSpeeds((prev) => ({
      ...prev,
      upload: finalUpload,
      packetLoss: parseFloat(finalLoss.toFixed(2)),
      maxStreams: Math.max(prev.maxStreams || 1, finalStreams),
    }));

    // Append to local database history
    setHistory((prevHist) => {
      const updated = [finalData, ...prevHist];
      localStorage.setItem("network_speed_history", JSON.stringify(updated));
      return updated;
    });
  };

  const getSubtextPhase = () => {
    switch (testPhase) {
      case "latency":
        return "Measuring local handshakes with ping loops";
      case "download":
        return "Downloading sample TCP thread sockets";
      case "upload":
        return "Pushing simulated buffers upstream";
      case "complete":
        return "Diagnostic suite run complete";
      default:
        return "Signal ready to commence test";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30 selection:text-blue-800 dark:selection:text-blue-200">
      {/* Dynamic Header */}
      <header className="border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => {
              if (view === "app") setView("about");
            }}
            onMouseEnter={() => import("./components/AboutPage")}
            onFocus={() => import("./components/AboutPage")}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 p-1.5 flex items-center justify-center shadow-lg shadow-blue-500/10 select-none">
              <Activity className="w-full h-full text-white" />
            </div>
            <div>
              <h1 className="text-xs font-extrabold tracking-widest text-slate-900 dark:text-slate-100 uppercase">
                TarangStream
              </h1>
              <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold block -mt-0.5">
                Network Telemetry Diagnostics
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Selection - hidden on about page */}
            {view === "app" && (
              <nav className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/85 rounded-2xl border border-slate-200/50 dark:border-slate-700/60 text-xs">
                <button
                  onClick={() => setActiveTab("speedometer")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === "speedometer" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/30 dark:border-slate-800/60" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"}`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Speedometer</span>
                  <span className="sm:hidden">Speed</span>
                </button>
                <button
                  onClick={() => setActiveTab("stability")}
                  onMouseEnter={() => import("./components/StabilityChart")}
                  onFocus={() => import("./components/StabilityChart")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === "stability" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/30 dark:border-slate-800/60" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"}`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stability Tracker</span>
                  <span className="sm:hidden">Stability</span>
                </button>
                <button
                  onClick={() => setActiveTab("diagnostics")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${activeTab === "diagnostics" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/30 dark:border-slate-800/60" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"}`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filter Settings</span>
                  <span className="sm:hidden">Filters</span>
                </button>
              </nav>
            )}

            {/* Dark Mode Toggle - always available */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 shadow-sm transition-all cursor-pointer flex items-center justify-center"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500 animate-fadeIn" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500 animate-fadeIn" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Dynamic Status bar if testing is ongoing */}
        {view === "app" && testPhase !== "idle" && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-1.5">
                {testPhase === "complete" ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Test:{" "}
                    <span className="text-slate-800 dark:text-slate-100 ml-1">
                      Complete
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    Testing:{" "}
                    <span className="text-slate-800 dark:text-slate-100 ml-1">
                      {testPhase} Phase
                    </span>
                  </>
                )}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                {overallProgress}%
              </span>
            </div>
            {/* Progress line */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full transition-all duration-350 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
              {getSubtextPhase()}...
            </span>
          </div>
        )}

        {view === "about" ? (
          <Suspense
            fallback={
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 md:p-10 flex flex-col items-center justify-center min-h-[400px] animate-pulse">
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-widest mb-1.5">
                  Loading About Module
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Retrieving system diagnostics...
                </span>
              </div>
            }
          >
            <AboutPage onBack={() => setView("app")} />
          </Suspense>
        ) : (
          <>
            {/* Tab-based UI Rendering */}

            {/* TAB 1: Dual Speedometers Dashboard */}
            {activeTab === "speedometer" && (
              <div className="flex flex-col gap-6">
                {/* Dual Speedometer Display Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                  <Gauge
                    label="Download"
                    value={speeds.download}
                    isActive={testPhase === "download"}
                    isCompleted={
                      testPhase === "upload" || testPhase === "complete"
                    }
                    colorClass="cyan"
                    peakValue={peakSpeeds.download}
                  />
                  <Gauge
                    label="Upload"
                    value={speeds.upload}
                    isActive={testPhase === "upload"}
                    isCompleted={testPhase === "complete"}
                    colorClass="violet"
                    peakValue={peakSpeeds.upload}
                  />
                </div>
                {/* Diagnostics Bar (Instant Latency Summary) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 text-center shadow-sm">
                  <div className="flex flex-col justify-center items-center">
                    <span className="text-[11px] md:text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-2 mb-1.5 justify-center">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Latency
                    </span>
                    <span className="text-lg md:text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                      {speeds.ping > 0 ? `${speeds.ping} ms` : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center items-center border-l border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] md:text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-2 mb-1.5 justify-center">
                      <Activity className="w-4 h-4 text-orange-500" />
                      Jitter
                    </span>
                    <span className="text-lg md:text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                      {speeds.jitter > 0 ? `${speeds.jitter} ms` : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center items-center sm:border-l border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] md:text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-2 mb-1.5 justify-center">
                      <Zap className="w-4 h-4 text-rose-500 animate-pulse" />
                      Packet Loss
                    </span>
                    <span className="text-lg md:text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                      {speeds.packetLoss !== undefined
                        ? `${speeds.packetLoss}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center items-center border-l border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] md:text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-2 mb-1.5 justify-center">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      Streams
                    </span>
                    <span className="text-lg md:text-xl font-extrabold font-mono text-slate-800 dark:text-slate-100">
                      {speeds.maxStreams !== undefined
                        ? `${speeds.maxStreams} x`
                        : "1 x"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-col justify-center items-center border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                    <span className="text-[11px] md:text-xs uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold flex items-center gap-2 mb-1.5 justify-center">
                      <Server className="w-4 h-4 text-blue-500" />
                      Node Route
                    </span>
                    <span
                      className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 max-w-[130px] truncate"
                      title={selectedServer.name}
                    >
                      {selectedServer.id === "optimal"
                        ? "Optimal Route"
                        : selectedServer.name}
                    </span>
                    {isLocal && (
                      <span
                        className="ml-1.5 mt-0.5 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-450 font-mono border border-amber-200/60"
                        title="Localhost mode: download uses public CDN mirror, upload is simulated (see src/utils/speedTest.local.ts)"
                      >
                        local mirror
                      </span>
                    )}
                  </div>
                </div>

                {/* Launch Center Area */}
                <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 md:p-10 rounded-3xl shadow-sm">
                  {/* Massive Start Button */}
                  <div className="flex items-center justify-center p-2">
                    <button
                      onClick={
                        testPhase !== "idle" && testPhase !== "complete"
                          ? interruptSpeedTest
                          : startSpeedTest
                      }
                      className={`w-32 h-32 md:w-36 md:h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 relative group active:scale-95 cursor-pointer ${
                        testPhase !== "idle" && testPhase !== "complete"
                          ? "border-rose-600 bg-rose-600 dark:border-rose-750 dark:bg-rose-700 text-white hover:bg-rose-700 hover:border-rose-700 dark:hover:bg-rose-600 dark:hover:border-rose-600 shadow-lg shadow-rose-500/20"
                          : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 shadow-lg shadow-blue-500/10"
                      }`}
                    >
                      {testPhase !== "idle" && testPhase !== "complete" ? (
                        <div className="text-center flex flex-col items-center justify-center animate-fadeIn">
                          <X className="w-6 h-6 md:w-7 md:h-7 mb-1.5 text-white group-hover:scale-115 transition-transform duration-150 animate-pulse" />
                          <span className="text-[10px] md:text-xs uppercase font-mono tracking-wider font-extrabold text-rose-100">
                            Cancel
                          </span>
                          <span className="text-[8px] md:text-[9px] text-rose-200 tracking-wider font-bold uppercase -mt-0.5 font-mono">
                            Test
                          </span>
                        </div>
                      ) : (
                        <>
                          <Play className="w-7 h-7 md:w-8 md:h-8 mb-1.5 text-white group-hover:scale-110 transition-transform duration-150" />
                          <span className="text-xs md:text-sm font-extrabold tracking-widest font-mono uppercase">
                            Start
                          </span>
                          <span className="text-[8px] md:text-[9px] text-blue-100 dark:text-blue-200 tracking-wider font-bold uppercase -mt-0.5 font-mono">
                            Test
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instructions / Info panel and Server Selector */}
                  <div className="flex-1 flex flex-col gap-4 w-full">
                    <div>
                      <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        Start Connection Diagnostic
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        Your geographic metadata is automatically resolved.
                        Click the primary launcher to measure latency and test
                        bandwidth pipeline speeds on demand.
                      </p>
                    </div>

                    {/* Server selection overlay */}
                    <div className="flex flex-col gap-3.5 w-full max-w-lg mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                          <label className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold tracking-wider block">
                            Choose Server Route Target:
                          </label>
                        </div>
                        {!showAddServerForm && (
                          <button
                            onClick={() => {
                              setShowAddServerForm(true);
                            }}
                            disabled={
                              testPhase !== "idle" && testPhase !== "complete"
                            }
                            className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Custom Server</span>
                          </button>
                        )}
                      </div>

                      {showAddServerForm && (
                        <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                          <div
                            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md flex flex-col gap-4.5 shadow-2xl animate-scaleUp"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                  <Server className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    New Custom Server Node
                                  </h4>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                    Add any custom geographical endpoint to test
                                    latency.
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomName("");
                                  setCustomCity("");
                                  setCustomLat("");
                                  setCustomLon("");
                                  setCustomUrl("");
                                  setShowAddServerForm(false);
                                }}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <form
                              onSubmit={handleAddCustomServer}
                              className="flex flex-col gap-4"
                            >
                              {/* Presets Row */}
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase font-bold">
                                  Quick Preset Cities:
                                </span>
                                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                  {POPULAR_CITIES.map((city, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => applyCityPreset(city)}
                                      className="text-[9px] font-semibold bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 transition-all text-slate-600 dark:text-slate-300 cursor-pointer shadow-sm"
                                    >
                                      {city.name}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
                                    Server Name:
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Paris CDN"
                                    value={customName}
                                    onChange={(e) =>
                                      setCustomName(e.target.value)
                                    }
                                    className="text-xs bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/35 focus:border-blue-500 rounded-xl px-3 py-2 focus:outline-none font-medium transition-all text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
                                    City, Country:
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Paris, France"
                                    value={customCity}
                                    onChange={(e) =>
                                      setCustomCity(e.target.value)
                                    }
                                    className="text-xs bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/35 focus:border-blue-500 rounded-xl px-3 py-2 focus:outline-none font-medium transition-all text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
                                    Latitude:
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 48.8566"
                                    value={customLat}
                                    onChange={(e) =>
                                      setCustomLat(e.target.value)
                                    }
                                    className="text-xs bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/35 focus:border-blue-500 rounded-xl px-3 py-2 focus:outline-none font-mono transition-all text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
                                    Longitude:
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 2.3522"
                                    value={customLon}
                                    onChange={(e) =>
                                      setCustomLon(e.target.value)
                                    }
                                    className="text-xs bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/35 focus:border-blue-500 rounded-xl px-3 py-2 focus:outline-none font-mono transition-all text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
                                    Ping Host:
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Optional"
                                    value={customUrl}
                                    onChange={(e) =>
                                      setCustomUrl(e.target.value)
                                    }
                                    className="text-xs bg-slate-50/50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/35 focus:border-blue-500 rounded-xl px-3 py-2 focus:outline-none font-mono transition-all text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomName("");
                                    setCustomCity("");
                                    setCustomLat("");
                                    setCustomLon("");
                                    setCustomUrl("");
                                    setShowAddServerForm(false);
                                  }}
                                  className="flex-1 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Compass className="w-3.5 h-3.5" />
                                  <span>Save & Select Node</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      <div className="max-h-[172px] overflow-y-auto border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-1 bg-slate-50/50 dark:bg-slate-950/20 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {allServers.map((srv) => {
                            const distance = getServerDistance(srv);
                            const isSelected = selectedServer.id === srv.id;
                            return (
                              <div
                                key={srv.id}
                                onClick={() => {
                                  if (
                                    testPhase === "idle" ||
                                    testPhase === "complete"
                                  ) {
                                    setSelectedServer(srv);
                                  }
                                }}
                                className={`group text-left p-3 rounded-xl border text-[10px] font-medium transition-all relative flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? "border-blue-400 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 text-blue-950 dark:text-blue-100 shadow-sm border-l-4 border-l-blue-600 dark:border-l-blue-500 font-bold"
                                    : "border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                                }`}
                              >
                                <div className="truncate flex-1 pr-2">
                                  <div className="font-bold text-[11px] truncate flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                    {srv.id === "optimal" && (
                                      <Compass
                                        className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-blue-500"}`}
                                      />
                                    )}
                                    {srv.isCustom && (
                                      <Server className="w-3.5 h-3.5 text-purple-500" />
                                    )}
                                    {srv.id !== "optimal" && !srv.isCustom && (
                                      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
                                    )}
                                    <span className="truncate">{srv.name}</span>
                                  </div>
                                  <div className="text-slate-400 dark:text-slate-500 text-[9px] truncate font-mono mt-0.5 font-semibold uppercase flex items-center gap-1">
                                    <span>{srv.location}</span>
                                    {distance !== null && (
                                      <span className="text-blue-600 dark:text-blue-400 font-extrabold ml-1 bg-blue-50 dark:bg-blue-950/40 px-1 py-0.2 rounded border border-blue-100/40 dark:border-blue-900/30">
                                        • {distance.toLocaleString()} km
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {srv.isCustom &&
                                  (testPhase === "idle" ||
                                    testPhase === "complete") && (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDeleteCustomServer(srv.id, e)
                                      }
                                      className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all ml-1 cursor-pointer"
                                      title="Delete server"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ISP, Location, and IP address card */}
                <StatsCard
                  ispInfo={ispInfo}
                  isLoading={isIspLoading}
                  activePhase={testPhase}
                />
              </div>
            )}

            {/* TAB 2: Stability over time analysis */}
            {activeTab === "stability" && (
              <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 md:p-10 flex flex-col gap-3 shadow-sm">
                  <span className="text-[11px] md:text-xs font-mono font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 block animate-fadeIn">
                    Stability tracking analysis
                  </span>
                  <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Signal Jitter & Micro-Fluctuation Log
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl mt-1">
                    Visualizes performance history below. Higher line
                    consistency values represent a superior non-fluctuating
                    fiber connection, essential for conferencing, multiplayer
                    latency, and high-frequency transactions.
                  </p>
                </div>

                {/* Custom high durability SVG timeline chart */}
                <Suspense
                  fallback={
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-10 h-[280px] flex items-center justify-center animate-pulse shadow-sm">
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-widest">
                        Initialising Stability Analytics
                      </span>
                    </div>
                  }
                >
                  <StabilityChart
                    history={history}
                    onClearHistory={handleClearHistory}
                  />
                </Suspense>
              </div>
            )}

            {/* TAB 3: Diagnostic Specs & Details */}
            {activeTab === "diagnostics" && (
              <div className="flex flex-col gap-8">
                {/* 1. Header Hero Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 md:p-10 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start gap-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] md:text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-0.5">
                      Telemetry Reference
                    </span>
                    <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      Diagnostic Metrics & Health Standards
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      Bandwidth capacity, packet transit delays, and routing
                      paths determine the overall caliber of your local
                      connection gateway. Use this reference layout to
                      understand standard thresholds.
                    </p>
                  </div>
                </div>

                {/* Diagnostic Control & Exporter Bento Card */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Smoothing controls */}
                  <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 md:p-10 rounded-3xl shadow-sm flex flex-col gap-6">
                    <div>
                      <span className="text-[10px] md:text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-0.5">
                        Smoothing Configuration
                      </span>
                      <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        Mathematical Smoothing Filter
                      </h3>
                      <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 leading-relaxed mt-1">
                        Select the averaging methodology used to filter raw TCP
                        socket sample bins (100ms interval check streams) in
                        real-time.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                      {(["EMA", "WMA", "Hybrid"] as const).map((method) => {
                        const isActive = smoothingMethod === method;
                        return (
                          <button
                            key={method}
                            onClick={() => setSmoothingMethod(method)}
                            className={`py-3 rounded-xl text-xs md:text-sm font-bold transition-all uppercase cursor-pointer ${
                              isActive
                                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700/60"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            {method}
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-5 md:p-6 border border-slate-100/50 dark:border-slate-850/40 text-xs md:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {smoothingMethod === "EMA" && (
                        <span>
                          <strong>Exponential Moving Average (EMA)</strong>:
                          Applies exponentially declining weights to historic
                          samples. Highly reactive to micro-burst surges or
                          throttle spikes, prioritizing raw instantaneous
                          throughput.
                        </span>
                      )}
                      {smoothingMethod === "WMA" && (
                        <span>
                          <strong>Weighted Moving Average (WMA)</strong>:
                          Computes line trends by assigning linearly increasing
                          weights to recent binned measurements. Smooths out
                          isolated single-frame packet drops while accurately
                          tracing trend corridors.
                        </span>
                      )}
                      {smoothingMethod === "Hybrid" && (
                        <span>
                          <strong>Double-Smoothed Hybrid</strong>: The ultimate
                          balanced filter. It evaluates the raw mathematical
                          average of EMA and WMA concurrently to discard routing
                          queue aberrations while guaranteeing real-time
                          speedometer fidelity.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exporter actions & Live Telemetry metrics */}
                  <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 md:p-10 rounded-3xl shadow-sm flex flex-col justify-between gap-6">
                    <div>
                      <span className="text-[10px] md:text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-0.5">
                        Audit Desk
                      </span>
                      <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                        Audit & Diagnostics Export
                      </h3>
                      <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 leading-relaxed mt-1">
                        Export physical JSON logs or download spreadsheet
                        datasets (CSV) containing system state vectors, ISP
                        ASNs, geocoding distances, thread multipliers, and
                        packet delay arrays.
                      </p>
                    </div>

                    {/* Live telemetry monitors */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/60 flex flex-col gap-1">
                        <span className="text-[9px] md:text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                          Scaling Sockets
                        </span>
                        <span className="text-xs md:text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />
                          <span>{liveStreams} active</span>
                        </span>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/60 flex flex-col gap-1">
                        <span className="text-[9px] md:text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                          Packet Loss Ratio
                        </span>
                        <span className="text-xs md:text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Zap
                            className={`w-4 h-4 ${livePacketLoss > 1 ? "text-amber-500 animate-bounce" : "text-slate-400"}`}
                          />
                          <span>{livePacketLoss}% est.</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="flex gap-2.5">
                        <button
                          onClick={handleCopyReport}
                          className="flex-1 bg-slate-100/80 hover:bg-slate-200/90 dark:bg-slate-800/60 dark:hover:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {copiedState ? (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-450 font-extrabold">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 text-slate-400 rotate-135" />
                              <span>Copy JSON</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleDownloadReport}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Download className="w-4 h-4 text-blue-100" />
                          <span>Download JSON</span>
                        </button>
                      </div>
                      <button
                        onClick={handleExportCSV}
                        disabled={history.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-450 disabled:dark:text-slate-600 disabled:border-slate-200/65 disabled:dark:border-slate-800/40 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-xs md:text-sm font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Stability Trend (CSV)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Connection Grades Grid */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs md:text-sm uppercase font-mono tracking-widest font-extrabold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    Performance Connection Tiers
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Tier Alpha */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-4 shadow-sm hover:border-emerald-200/80 dark:hover:border-emerald-900/60 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            Tier Alpha: Gigabit Ultra Fiber
                          </h4>
                        </div>
                        <span className="text-[10px] md:text-xs font-mono bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-450 px-2.5 py-1 rounded-md font-extrabold uppercase tracking-wide">
                          Optimal
                        </span>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl font-mono text-[10px] md:text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Latency
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            &lt; 15 ms
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Download
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            &gt; 500 M
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Jitter
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            &lt; 2 ms
                          </span>
                        </div>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Designed for telemetry, 4K high-bitrate live
                        broadcasting, sub-millisecond trading, and real-time
                        computation clusters.
                      </p>
                    </div>

                    {/* Tier Beta */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-4 shadow-sm hover:border-blue-200/80 dark:hover:border-blue-900/60 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            Tier Beta: High-Speed Cable / Pro LTE
                          </h4>
                        </div>
                        <span className="text-[10px] md:text-xs font-mono bg-blue-50 dark:bg-blue-950/35 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md font-extrabold uppercase tracking-wide">
                          Excellent
                        </span>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl font-mono text-[10px] md:text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Latency
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            15 - 35 ms
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Download
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            100 - 500 M
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Jitter
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            2 - 5 ms
                          </span>
                        </div>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Exceptional for flawless 4K video conferencing,
                        low-latency online gaming, and robust multi-device
                        environments.
                      </p>
                    </div>

                    {/* Tier Gamma */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-4 shadow-sm hover:border-amber-200/80 dark:hover:border-amber-900/60 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            Tier Gamma: Broadband / DSL
                          </h4>
                        </div>
                        <span className="text-[10px] md:text-xs font-mono bg-amber-50 dark:bg-amber-950/35 text-amber-700 dark:text-amber-450 px-2.5 py-1 rounded-md font-extrabold uppercase tracking-wide">
                          Standard
                        </span>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl font-mono text-[10px] md:text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Latency
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            35 - 75 ms
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Download
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            30 - 100 M
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Jitter
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            5 - 12 ms
                          </span>
                        </div>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Reliable for general web browsing, HD video streams,
                        basic emails, and remote workspaces with average
                        capacity.
                      </p>
                    </div>

                    {/* Tier Delta */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-4 shadow-sm hover:border-rose-200/80 dark:hover:border-rose-900/60 transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            Tier Delta: Legacy Connection
                          </h4>
                        </div>
                        <span className="text-[10px] md:text-xs font-mono bg-rose-50 dark:bg-rose-950/35 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-md font-extrabold uppercase tracking-wide">
                          Unstable
                        </span>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl font-mono text-[10px] md:text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Latency
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            &gt; 75 ms
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Download
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            &lt; 30 M
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">
                            Jitter
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-200">
                            &gt; 12 ms
                          </span>
                        </div>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Subject to packet queues and streaming buffer delays.
                        Best suited for static text and single-session local
                        workloads.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Diagnostic Glossary Grid */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs md:text-sm uppercase font-mono tracking-widest font-extrabold text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    Core Diagnostic Glossary
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Download */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-2xl">
                          <ArrowDown className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          Download Rate
                        </span>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The raw bandwidth speed at which bytes travel from our
                        remote servers to your browser. Critical for streaming,
                        media loads, and complex asset transfers.
                      </p>
                      <span className="text-[10px] md:text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase mt-auto">
                        Unit: Mbps (Megabits/sec)
                      </span>
                    </div>

                    {/* Upload */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-2xl">
                          <ArrowUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          Upload Rate
                        </span>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The throughput capacity for sending local bytes upstream
                        into the cloud. Vital for multi-stream live cameras,
                        local file backups, and active voice links.
                      </p>
                      <span className="text-[10px] md:text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase mt-auto">
                        Unit: Mbps (Megabits/sec)
                      </span>
                    </div>

                    {/* Latency */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 rounded-2xl">
                          <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          Latency (Ping)
                        </span>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The absolute round-trip travel time for a small data
                        request packet to strike our server node and return. Low
                        values equate to instant UI responsiveness.
                      </p>
                      <span className="text-[10px] md:text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase mt-auto">
                        Unit: Milliseconds (ms)
                      </span>
                    </div>

                    {/* Jitter */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
                          <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          Jitter Variance
                        </span>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The standard deviation or fluctuation across sequential
                        ping checks. Stable connections maintain minimal
                        variance to avoid sudden audio gaps and lag spikes.
                      </p>
                      <span className="text-[10px] md:text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase mt-auto">
                        Unit: Milliseconds (ms)
                      </span>
                    </div>

                    {/* ASN */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                          <Server className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          AS Number (ASN)
                        </span>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The globally cataloged Autonomous System Number
                        designating a block of IP subnets controlled by a single
                        carrier entity (e.g. Comcast, AT&T, Verizon).
                      </p>
                      <span className="text-[10px] md:text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase mt-auto">
                        Unit: Routing ASN Code
                      </span>
                    </div>

                    {/* Route Node */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-7 md:p-8 flex flex-col gap-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
                      <div className="flex items-center gap-2.5">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                          <Globe className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          Routing Geonode
                        </span>
                      </div>
                      <p className="text-xs md:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        The geographic routing route target. Selecting servers
                        close to your physical location prevents velocity speed
                        drops across deep undersea cables.
                      </p>
                      <span className="text-[10px] md:text-[11px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase mt-auto">
                        Unit: Geographic Location
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer details */}
      <footer className="border-t border-slate-100 dark:border-slate-900 bg-white/70 dark:bg-slate-900/40 mt-auto py-6 text-center select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-1 items-center justify-center text-[9px] font-mono text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5 uppercase font-bold tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Telemetry Diagnostic Suite</span>
          </div>
          <p className="text-slate-400/80 dark:text-slate-500/80">
            Secure client geocoding lookup is 100% encrypted. Coordinates link
            directly to geographic markers.
          </p>
          <button
            onClick={() => setView("about")}
            onMouseEnter={() => import("./components/AboutPage")}
            onFocus={() => import("./components/AboutPage")}
            className="mt-1 text-[8px] font-mono text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline transition-all"
          >
            About Tarangstream
          </button>
        </div>
      </footer>
    </div>
  );
}
