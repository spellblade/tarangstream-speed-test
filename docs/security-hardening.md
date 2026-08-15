# Security hardening

How TarangStream limits abuse, and **how to verify** each control. Add a subsection here when a new hardening item lands.

Related: [Setup](setup.md) (env vars), [SECURITY.md](../SECURITY.md) (how to *report* a vulnerability).

## TRUST_PROXY and X-Forwarded-For

Rate limits and per-IP download caps key off the client IP from `getClientIp`.

| `TRUST_PROXY` | Client IP used |
|---------------|----------------|
| Unset / anything other than `1`, `true`, `yes` | Socket address only (`X-Forwarded-For` ignored) |
| `1`, `true`, or `yes` (case-insensitive) | First `X-Forwarded-For` hop, else socket |

Enable **only** behind a reverse proxy that overwrites or appends `X-Forwarded-For` itself. Otherwise clients can spoof the header and reset limits.

`GET /api/health` is **not** rate-limited. Use **`POST /api/upload`** for the checks below.

`dotenv` is **not** loaded in `server.ts` yet. Set `TRUST_PROXY` on the process (prefix the command or Codespaces env). A line in `.env` alone does nothing.

### Verify in GitHub Codespaces (or any local terminal)

**1. Open the repo** in a Codespace (or clone locally). Use branch `feature/security` (or whichever commit contains the TRUST_PROXY change).

```bash
git fetch origin
git checkout feature/security
git pull origin feature/security
npm ci
```

**2. Confirm the commit**

```bash
git log -1 --oneline
```

Expect something like: `fix: honor X-Forwarded-For only when TRUST_PROXY is set`

**3. Default — XFF must be ignored**

Terminal 1:

```bash
npm run dev
```

Terminal 2 (same machine). Use **`127.0.0.1`**, not the public forwarded Codespaces URL (extra proxies can add their own XFF):

```bash
for i in $(seq 1 61); do
  code=$(curl -s -o /tmp/body.txt -w "%{http_code}" \
    -X POST "http://127.0.0.1:3000/api/upload" \
    -H "Content-Type: application/octet-stream" \
    -H "X-Forwarded-For: 203.0.113.$i" \
    --data-binary "x")
  echo "$i $code $(cat /tmp/body.txt)"
done
```

**Pass:** around request **61** you get **429** and `Too many requests`. Spoofed IPs still share one socket address, so the 60/minute cap applies.

Wait about **one minute** before repeating this loop, or the window is still full.

**4. TRUST_PROXY on — XFF is used**

Stop the server (`Ctrl+C` in terminal 1). Start:

```bash
TRUST_PROXY=true npm run dev
```

Run the **same** loop in terminal 2.

**Pass:** you should **not** hit 429 as soon (each `203.0.113.$i` is a separate bucket).

**5. Unit tests (optional)**

Does not require the server or `TRUST_PROXY` in the shell:

```bash
npm test -- src/utils/rateLimit.test.ts
```

## Upload concurrency

`POST /api/upload` allows at most **8** concurrent streams per client IP (same default as download). Further in-flight uploads get **429** with `Too many concurrent upload streams from this client.`

This is **not** the same as the 60/minute rate limit (`Too many requests`). Invalid content-type (400) or oversize `Content-Length` (413) do **not** take a concurrency slot.

### Verify

Prefer the automated test (holds two uploads, third expects 429). Does not need `npm run dev`:

```bash
npm test -- src/server/apiApp.test.ts
```

**Pass:** the case `returns 429 when concurrent upload streams exceed the per-IP cap` succeeds.

Manual `/dev/tcp` hold-open snippets are optional and often flaky in Codespaces (`exec` can close the shell; the live server cap is **8**, so two held uploads will not 429 a third request). Use `npm test` as the source of truth.

## Rate-limit map prune

The in-memory limiter keeps timestamps per IP. When every timestamp for an IP is older than the 60-second window, that **IP key is deleted** so the map does not grow without bound (important if `TRUST_PROXY` is on and clients send many `X-Forwarded-For` values).

### Verify

No running server required:

```bash
npm test -- src/utils/rateLimit.test.ts
```

**Pass:** all cases succeed, including `drops the IP key after the sliding window is empty` (about **12** tests in that file).

## Later checks

More procedures will be added here as further items land (CSP, abort listeners, generic upload errors, and so on).
