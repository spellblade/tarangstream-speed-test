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

## Environment variables

Copy [`.env.example`](../.env.example) if you maintain a local `.env` (gitignored).

| Variable | Purpose |
|----------|---------|
| `PORT` | Documented as optional server port (default **3000**) |
| `NODE_ENV` | `development` uses Vite middleware; `production` serves static `dist/` |
| `TRUST_PROXY` | When `1`, `true`, or `yes`, honor `X-Forwarded-For` for rate limits and download caps. **Default off.** Enable only behind a trusted reverse proxy. |

How to verify `TRUST_PROXY` (Codespaces or local): [Security hardening](security-hardening.md).

**Note:** As of 0.1.0, `server.ts` selects production vs development from `NODE_ENV` but the listen port is **hardcoded to 3000**. Treat `PORT` in `.env.example` as intended configuration until the server reads `process.env.PORT`. The `dotenv` package is listed in dependencies; ensure it is loaded if you rely on a `.env` file.

## Localhost vs deployed behavior

| Environment | Download | Upload |
|-------------|----------|--------|
| **localhost** (`localhost`, `127.0.0.1`, etc.) | Public CDN mirrors via `speedTest.local.ts` (e.g. Hetzner `1GB.bin`) | Simulated curves (local upload to `/api/upload` is not the primary path) |
| **Non-localhost** | Same-origin `/api/download` streams | Real `/api/upload` measurements |

See [Architecture](architecture.md) and [Measurement methodology](measurement-methodology.md).

## Troubleshooting

### Port already in use

Another process is bound to port 3000. Stop it or change the port in `server.ts` until env-based `PORT` is wired.

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

The API rate-limits clients (roughly 60 requests/minute) and caps concurrent download streams per IP. Wait and retry, or reduce parallel test spam during development.

## Next steps

- [Usage](usage.md) — run a test and read the UI  
- [Architecture](architecture.md) — how pieces connect  
