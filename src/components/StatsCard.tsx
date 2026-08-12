import { useState } from "react";
import { IspInfo } from "../types";
import {
  Globe,
  Copy,
  Check,
  MapPin,
  Radio,
  Compass,
  Wifi,
  ExternalLink,
} from "lucide-react";

interface StatsCardProps {
  ispInfo: IspInfo | null;
  isLoading: boolean;
  activePhase: string;
}

export default function StatsCard({
  ispInfo,
  isLoading,
  activePhase,
}: StatsCardProps) {
  const [copied, setCopied] = useState(false);

  const copyIpToClipboard = () => {
    if (!ispInfo?.ip) return;
    navigator.clipboard.writeText(ispInfo.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm animate-pulse">
        <div className="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-16 bg-slate-50 dark:bg-slate-950 rounded-xl" />
          <div className="h-16 bg-slate-50 dark:bg-slate-950 rounded-xl" />
          <div className="h-16 bg-slate-50 dark:bg-slate-950 rounded-xl" />
        </div>
      </div>
    );
  }

  // Fallback default details in case the fetch hasn't completed or loaded
  const details = ispInfo || {
    ip: "Looking up IP..",
    isp: "Scanning Carrier Network",
    city: "Detecting Location",
    region: "—",
    country: "—",
    lat: 37.7749,
    lon: -122.4194,
    asn: "AS—",
    countryCode: "US",
  };

  const mapUrl = `https://www.google.com/maps?q=${details.lat},${details.lon}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden transition-all duration-300">
      {/* Decorative Network Grid Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 pb-5 mb-6">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-blue-500" />
          <span className="text-[11px] md:text-xs uppercase tracking-widest font-mono text-slate-400 dark:text-slate-500 font-extrabold">
            Network Environment details
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          <Wifi className="w-4 h-4 text-slate-400 dark:text-slate-550" />
          <span className="text-[10px] md:text-[11px] font-mono text-slate-505 dark:text-slate-400 uppercase font-bold">
            IPv4 Detected
          </span>
        </div>
      </div>

      {/* Desktop bento grid breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module 1: ISP Details representation */}
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-7 flex flex-col justify-between hover:border-slate-250 dark:hover:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-950/80 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold tracking-wider">
              Internet Service Provider
            </span>
            <Radio
              className={`w-4 h-4 text-blue-500 ${activePhase !== "idle" ? "animate-pulse" : ""}`}
            />
          </div>
          <div className="mt-3">
            <h4
              className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight truncate"
              title={details.isp}
            >
              {details.isp}
            </h4>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1.5 block font-medium">
              AS Identifier:{" "}
              <span className="text-slate-600 dark:text-slate-300 font-bold">
                {details.asn || "AS7922"}
              </span>
            </span>
          </div>
        </div>

        {/* Module 2: External Client IP Address Address (Copy Actionable) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-7 flex flex-col justify-between hover:border-slate-250 dark:hover:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-950/80 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold tracking-wider">
              Public IP Address
            </span>
            <button
              onClick={copyIpToClipboard}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
              title="Copy IP Address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="mt-3">
            <h4 className="text-base font-bold font-mono text-slate-800 dark:text-slate-100 tracking-tight block truncate select-all">
              {details.ip}
            </h4>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1.5 block font-medium">
              Type:{" "}
              <span className="text-slate-600 dark:text-slate-300 font-bold">
                Broadband/Dynamic
              </span>
            </span>
          </div>
        </div>

        {/* Module 3: Municipal Location details (Map link integration) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-6 md:p-7 flex flex-col justify-between hover:border-slate-250 dark:hover:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-950/80 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-bold tracking-wider">
              Municipal Locale
            </span>
            <a
              href={mapUrl}
              target="_blank"
              referrerPolicy="no-referrer"
              className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all flex items-center gap-0.5"
              title="View on Google Maps"
            >
              <MapPin className="w-4 h-4" />
            </a>
          </div>
          <div className="mt-3">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight truncate">
              {details.city}, {details.region}
            </h4>
            <a
              href={mapUrl}
              target="_blank"
              referrerPolicy="no-referrer"
              className="group text-xs font-mono text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all font-medium"
            >
              <Compass className="w-3.5 h-3.5 text-slate-400 dark:text-slate-550 group-hover:text-blue-500 transition-colors" />
              Coords: {details.lat.toFixed(4)}, {details.lon.toFixed(4)}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
