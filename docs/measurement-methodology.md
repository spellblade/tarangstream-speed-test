# Measurement methodology

How TarangStream estimates network performance, and what the numbers do **not** mean.

## Overview

Tests run primarily **in the browser** against either:

- Same-origin Express endpoints (`/api/download`, `/api/upload`), or  
- On **localhost**, public download mirrors (and often **simulated** upload), or  
- **Simulated** curves if real streams fail  

Results are useful for relative comparisons and UX diagnostics. They are not a substitute for lab equipment or ISP SLA tools.

## Metrics

| Metric | Method (as implemented) | Unit |
|--------|-------------------------|------|
| **Latency (ping)** | Series of lightweight HTTP probes (e.g. HEAD / cache-busted requests); may fall back to distance-based estimates + local noise | ms |
| **Jitter** | Variation across successive latency samples (mean absolute consecutive difference style) | ms |
| **Download** | Parallel `fetch` streams of binary data; ~100 ms sampling; ~1 s rolling window Mbps; EMA / WMA smoothing; optional multi-stream scaling | Mbps |
| **Upload** | Parallel upload of generated payloads (XHR) to `/api/upload`, or simulated curve on localhost / failure | Mbps |
| **Packet loss** | Heuristic from stall ratio and sample variance — **not** ICMP or kernel loss counters | % (estimate) |
| **Streams** | Count of concurrent download or upload connections used during the phase | count |

## Test phases

1. **Latency** — several samples (on the order of 10), brief inter-sample delay  
2. **Download** — fixed-duration streaming test (on the order of several seconds)  
3. **Upload** — fixed-duration upload or simulation  
4. **Complete** — final values stored in history  

Overall progress is mapped across phases (latency, then download, then upload). Dial needles track **Mbps**, not the same units as the top progress percentage.

## Smoothing

| Method | Role |
|--------|------|
| **EMA** | Exponential moving average of recent samples (more reactive) |
| **WMA** | Weighted moving average over a short window (smoother) |
| **Hybrid** | Combination of EMA and WMA for the displayed preferred speed |

Outlier trimming may be applied when computing final phase averages.

## Measurement modes

| Mode | Download source | Upload source |
|------|-----------------|---------------|
| **live** | Same-origin `/api/download` (typical non-localhost) | Real `/api/upload` |
| **local-mirror** | Public CDN file (e.g. Hetzner regional `1GB.bin`) | Simulated |
| **simulated** | Synthetic speed curve | Synthetic speed curve |

Always check UI badges when comparing runs.

## ISP and geolocation

The client may query public geo/IP HTTP APIs to show ISP name, city, and coordinates. Lookups can fail (network, rate limits, CORS). Fallbacks may use timezone heuristics and mark data as fallback. Coordinates feed “optimal server” distance estimates and estimated latency when direct probes are weak.

## Server-side constraints (download / upload)

When using the bundled Express API:

- Upload body type limited to `application/octet-stream`  
- Upload size capped (on the order of **2 MB** per request)  
- Download stream duration capped  
- Per-IP rate limits and concurrent download stream caps  

These protect the host; they can also **cap measured upload** relative to a true bulk uplink test.

## Limitations and caveats

1. **Browser path only** — middleboxes, VPN, Wi‑Fi power save, and CPU throttling affect results.  
2. **Estimated latency** — if probes fail or CORS/`no-cors` timing is coarse, displayed latency may be partly modeled.  
3. **Packet loss is estimated** — derived from throughput stalls/variance, not lost IP packets.  
4. **Localhost CDN downloads** transfer real bytes from third-party mirrors; they measure path to that mirror, not necessarily to your Express host. Do not hammer public mirrors.  
5. **Simulation** intentionally fabricates smooth curves for UX when live I/O cannot run.  
6. **History** is local to the browser and is not a signed audit log.  

## Fair use

- Use public speed mirrors only as intended for short tests.  
- Do not automate continuous high-rate abuse against third-party CDNs or your own production hosts without capacity planning.  
- Respect rate-limit responses (`429`).

## Changing methodology

If you alter sampling windows, formulas, or endpoints:

1. Update this document  
2. Note the change under `[Unreleased]` in [CHANGELOG.md](../CHANGELOG.md)  
3. Consider bumping version if published results would be incomparable  

## Related docs

- [Architecture](architecture.md)  
- [Usage](usage.md)  
- [Coding standards](coding-standards.md)  
