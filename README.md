# TarangStream — Advanced Network Speed & Stability Diagnostics

[![Version](https://img.shields.io/badge/version-0.1.2-blue.svg)](VERSION)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> Full-stack browser diagnostics for download, upload, latency, and jitter — built with React, TypeScript, and Express.

TarangStream is a high-performance network diagnostics utility. It provides real-time download/upload speeds, latency (ping), jitter, and packet-loss estimates using multi-stream testing pipelines and mathematical smoothing (EMA / WMA / Hybrid).

## Quick Start

**Prerequisites:** Node.js 18+ and npm.

```bash
npm install
npm run dev      # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

| Command | Purpose |
|---------|---------|
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Unit tests (Vitest; also run in CI) |
| `npm run build` | Vite client + bundled Express server |
| `npm start` | Serve production build |

## Branches

| Branch | Role |
|--------|------|
| `master` | Stable / releases |
| `develop` | Integration |
| `staging` | Optional pre-release |
| `feature/*` | Feature work |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Documentation

- [Docs home](docs/index.md)
- [Setup](docs/setup.md)
- [Architecture](docs/architecture.md)
- [Usage](docs/usage.md)
- [Coding standards](docs/coding-standards.md)
- [Measurement methodology](docs/measurement-methodology.md)
- [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [License (MIT)](LICENSE)

---

## Core Features & Architectural Enhancements

### 1. Robust Upload and Download Dials
*   **1000ms Sliding Window Integration**: Replaced raw 100ms micro-slices with a continuous sliding window algorithm. This filters out bursty network spikes, stabilizes the real-time dials, and aligns dial movement with the user's overall average bandwidth.
*   **Fail-Safe Simulation Fallback**: If regional servers or firewalls disrupt standard XHR pipelines, the engine seamlessly triggers a realistic simulated fallback so that the user experience is never interrupted.

### 2. High-Speed UI & Instant Theme Transitions
*   **Zero-Transition Theme Toggle**: Dark and light mode shifts are executed instantly. By temporarily disabling CSS transitions on demand, we eliminate the sluggish 300ms–500ms delay that standard stylesheets impose during state updates.
*   **Background Component Prefetching**: Tab content (such as the Stability Chart) and the About Page are prefetched in the background after the initial page mount. This makes view changes and page loads completely instantaneous upon clicking.

### 3. Server-Side Security & Payload Validation
*   **Upload Guardrails**: The Express backend enforces strict incoming limits to prevent abuse:
    *   **Max 2MB Limits**: The `/api/upload` endpoint rejects payloads exceeding 2MB using standard `Content-Length` inspection.
    *   **Dynamic Stream Disconnection**: If an upload stream attempts to sneak extra data past headers, the server immediately destroys the TCP connection (`req.destroy()`) and halts resource consumption.
    *   **Header Verification**: Strictly validates the `Content-Type` to be `application/octet-stream`.

### 4. Mathematical Smoothing Modes
*   **EMA (Exponential Moving Average)**: Prioritizes recent data points to show instant fluctuations.
*   **WMA (Weighted Moving Average)**: Linearly weights historical samples, offering a smooth middle ground.
*   **Hybrid**: A mathematically balanced average of both metrics to display stable progress.

---

## 📁 Project Structure

```text
├── server.ts               # Production Express API server, upload receiver, & static router
├── src/
│   ├── App.tsx             # Primary orchestrator, UI layout, & speed test manager
│   ├── types.ts            # Core TypeScript interfaces & type definitions
│   ├── components/
│   │   ├── Gauge.tsx          # High-performance SVG speed dials with animated sub-arcs
│   │   ├── StabilityChart.tsx # Real-time line charts tracking current test jitter & latency
│   │   ├── StatsCard.tsx      # Diagnostic detail grids (Jitter, Packet Loss, Streams)
│   │   └── AboutPage.tsx      # Comprehensive description & tech stack documentation
│   └── utils/
│       ├── speedTest.ts       # Cloud-run production real-world speed diagnostics engine
│       └── speedTest.local.ts # Simulators and fallbacks for local/developer environments
```

---

## 🛠️ Installation & Execution

### Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **npm**

### Quick Start
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Start development server**:
    ```bash
    npm run dev
    ```
3.  **Build production assets**:
    ```bash
    npm run build
    ```
4.  **Run production server**:
    ```bash
    npm run start
    ```

---

## 🛡️ Security Details
Our diagnostics engine executes in a fully sandboxed client-server architecture. 
*   **No local disk writes**: All uploaded chunks are discarded in-memory instantly on arrival.
*   **CORS & Content Guardrails**: Standard security headers are configured inside the custom Express engine.
