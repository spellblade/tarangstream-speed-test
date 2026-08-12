# Usage

## Start the app

See [Setup](setup.md). Open the app (default **http://localhost:3000**).

## Run a speed test

1. Optionally choose a **server** (Automatic Optimal Node or a regional preset).  
2. Click the primary **Start** control.  
3. Watch phases: **latency** → **download** → **upload** → **complete**.  
4. To stop early, use **Cancel** (aborts in-flight requests and clears timers).

While a test runs, the status bar shows the current phase and overall progress percentage.

## Reading the UI

### Gauges

- **Download** and **Upload** dials show live Mbps (and peak when available).  
- Status chips: `idle` / `active` / `complete` track which phase is running.  
- Needle position uses a non-linear scale (more resolution at lower Mbps).

### Latency and quality cards

- **Latency** (or **Latency (est.)** when modeled rather than fully probed)  
- **Jitter**  
- Estimated **packet loss** and stream counts when available  

### Measurement mode badges

| Badge | Meaning |
|-------|---------|
| Live | Real measurement path (no special badge in many builds) |
| Local dev / local-mirror | Localhost CDN download and/or simulated upload |
| Simulated | Results from fallback curves after real I/O failed |

Treat simulated and local-mirror results as **indicative**, not as a lab-grade WAN report.

## Servers

- **Automatic Optimal Node** picks a nearby preset using ISP coordinates when available.  
- Presets are fixed cloud/CDN-style locations for distance-aware latency targets.  
- **Custom servers** can store a name, city, optional coordinates, and optional public **http(s)** URL for ping probes. Private/localhost URLs should be rejected by validation.

## Smoothing modes

During a test, displayed speeds can follow:

| Mode | Behavior |
|------|----------|
| **EMA** | Exponential moving average — more reactive |
| **WMA** | Weighted moving average — smoother recent window |
| **Hybrid** | Blend of EMA and WMA |

Prefer Hybrid for a stable dial; use EMA if you want more flicker that tracks bursts.

## History and export

- Completed tests append to **local history** (browser `localStorage`, capped).  
- Clear history from the UI when offered.  
- **CSV** export for spreadsheet analysis.  
- **JSON** diagnostic report (and clipboard copy when the browser allows).

History stays on the device; it is not uploaded to a TarangStream cloud.

## Theme

Use the **dark / light** toggle in the header. Preference is stored in `localStorage`.

## Tabs

- **Speedometer** — main gauges and start control  
- **Stability** — historical chart (lazy-loaded)  
- **Diagnostics / filters** — advanced smoothing and export tools  
- **About** — product background (lazy-loaded)  

## Tips

- Close bandwidth-heavy apps for cleaner live tests.  
- On localhost, download traffic may hit **public CDN mirrors** — see [Measurement methodology](measurement-methodology.md).  
- If results look unrealistic, check for a **simulated** badge and retry on a non-localhost host with a healthy `/api/*` path.

## Related docs

- [Setup](setup.md)  
- [Architecture](architecture.md)  
- [Measurement methodology](measurement-methodology.md)  
