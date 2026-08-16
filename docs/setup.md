# Setup

## Prerequisites

- **Node.js** 18 or newer (CI uses **Node 22**)
- **npm** (bundled with Node)

On WSL, prefer a Linux Node install (for example via [nvm](https://github.com/nvm-sh/nvm)) so `npm` does not resolve to a Windows install under `/mnt/c/...`.

## Clone and install

```bash
git clone https://github.com/spellblade/tarangstream-speed-test.git
cd tarangstream-speed-test
npm install
```

## Development

```bash
npm run dev
```

- Starts Express with Vite middleware (HMR-friendly SPA).
- Default URL: **http://localhost:3000**
- Listen address is `0.0.0.0` (reachable on the LAN if the host firewall allows it).

Useful scripts:

| Command | Purpose |
|---------|---------|
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Unit tests via Vitest (single run; also run in CI) |
| `npm run test:watch` | Vitest watch mode |
| `npm run build` | Vite client build + esbuild server bundle |
| `npm start` | Run production server (`node dist/server.cjs`) |
| `npm run clean` | Remove build artifacts (see `package.json`) |

## Production

```bash
npm run build
npm start
```

- Client assets are written under `dist/`.
- Server is bundled to `dist/server.cjs`.
- When `NODE_ENV=production`, Express serves static files from `dist/` and falls back to `index.html` for SPA routes.

### Render

[render.yaml](../render.yaml) defines a Node web service named **tarangstream**. Create it once in the Render dashboard (**New** → **Blueprint**, or a Web Service pointed at this repo).

| Setting | Value |
|---------|--------|
| Branch | `master` (promote from `develop` first) |
| Build | `npm ci --include=dev && npm run build` |
| Start | `npm start` |
| Health check | `/api/health` |
| Env | `NODE_ENV=production`, `TRUST_PROXY=true` |

Render sets `PORT`. Use a **Starter** instance (always-on). The Free plan sleeps when idle and will distort ping and throughput. Pick a region close to you (Singapore is usually closest from India).

After the first deploy:

1. `curl -sS https://<service>.onrender.com/api/health` should return `{"status":"ok",...}`.
2. Open the site and run one full test. The badge should be **live**, not `local-mirror` or `simulated`.
3. About footer should show the current app version (for example `TarangStream v1.0.1`).

## Environment variables

Copy [`.env.example`](../.env.example) if you maintain a local `.env` (gitignored).

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (default **3000**). Must be digits 1–65535; invalid values fall back to 3000. |
| `NODE_ENV` | `development` uses Vite middleware; `production` serves static `dist/` |
| `TRUST_PROXY` | When `1`, `true`, or `yes`, honor `X-Forwarded-For` for rate limits and download caps. **Default off.** Enable only behind a trusted reverse proxy. |

`server.ts` loads [`.env`](../.env.example) via `dotenv` at startup. Process env still wins over the file.

How to verify `TRUST_PROXY`: [Security hardening](security-hardening.md).

How to verify `PORT`: `npm test -- src/utils/listenPort.test.ts`, then `PORT=4000 npm run dev` and `curl -sI http://127.0.0.1:4000/api/health` (expect 200). Default `npm run dev` still uses 3000.

## Localhost vs deployed behavior

| Environment | Download | Upload |
|-------------|----------|--------|
| **localhost** (`localhost`, `127.0.0.1`, etc.) | Public CDN mirrors via `speedTest.local.ts` (e.g. Hetzner `1GB.bin`) | Simulated curves (local upload to `/api/upload` is not the primary path) |
| **Non-localhost** | Same-origin `/api/download` streams | Real `/api/upload` measurements |

See [Architecture](architecture.md) and [Measurement methodology](measurement-methodology.md).

## Troubleshooting

### Port already in use

Another process is bound to the listen port (default 3000). Stop it or start with a different port, e.g. `PORT=4000 npm run dev`.

### `tsc` / `npm` not found (WSL + Windows Node)

If `which npm` points at `/mnt/c/Program Files/nodejs/npm`, install Node inside WSL and put it first on `PATH`. Then re-run `npm install` in the project so `node_modules` matches the Linux toolchain.

### Build fails after dependency updates

```bash
rm -rf node_modules
npm ci
npm run lint
npm run build
```

### Rate limiting (429)

The API rate-limits clients (roughly 60 requests/minute) and caps concurrent download **and upload** streams per IP (default 8 each). Wait and retry, or reduce parallel test spam during development. See [Security hardening](security-hardening.md).

## Next steps

- [Usage](usage.md) — run a test and read the UI  
- [Architecture](architecture.md) — how pieces connect  
