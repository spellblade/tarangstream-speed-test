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

## Later checks

More procedures will be added here as further items land (upload concurrency cap, CSP, map pruning, and so on).
