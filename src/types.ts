export type TestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'complete';

export interface SpeedData {
  download: number; // in Mbps
  upload: number; // in Mbps
  ping: number; // in ms
  jitter: number; // in ms
  packetLoss?: number; // Estimated packet loss ratio in %
  maxStreams?: number; // Max parallel connection streams achieved
}

export interface IspInfo {
  ip: string;
  isp: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  asn?: string;
  countryCode?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string; // ISO String
  download: number;
  upload: number;
  ping: number;
  jitter: number;
  packetLoss?: number; // Estimated packet loss in %
  maxStreams?: number; // Max connections used
  isp: string;
  server: string;
}

export interface ServerOption {
  id: string;
  name: string;
  location: string;
  distance?: number; // in km
  lat?: number;
  lon?: number;
  url?: string;
  isCustom?: boolean;
}
