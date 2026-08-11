import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const MAX_DOWNLOAD_CONNECTIONS_PER_IP = 8;
const MAX_API_REQUESTS_PER_MINUTE = 60;
const DOWNLOAD_STREAM_MAX_MS = 30_000;
const RATE_WINDOW_MS = 60_000;

const downloadConnections = new Map<string, number>();
const apiRequestLog = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (apiRequestLog.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_API_REQUESTS_PER_MINUTE) {
    apiRequestLog.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  apiRequestLog.set(ip, timestamps);
  return false;
}

function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(securityHeaders);

  // API Route: Download stream for real network testing
  app.get('/api/download', apiRateLimit, (req, res) => {
    const ip = getClientIp(req);
    const current = downloadConnections.get(ip) || 0;
    if (current >= MAX_DOWNLOAD_CONNECTIONS_PER_IP) {
      res.status(429).json({ error: 'Too many concurrent download streams from this client.' });
      return;
    }
    downloadConnections.set(ip, current + 1);

    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename=speedtest_download.bin',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    const chunkSize = 128 * 1024;
    const chunk = Buffer.alloc(chunkSize, 0);

    let isClosed = false;
    const streamStarted = Date.now();

    const releaseConnection = () => {
      if (isClosed) return;
      isClosed = true;
      const count = downloadConnections.get(ip) || 1;
      if (count <= 1) downloadConnections.delete(ip);
      else downloadConnections.set(ip, count - 1);
    };

    req.on('close', releaseConnection);
    res.on('close', releaseConnection);

    const streamTimeout = setTimeout(() => {
      if (!isClosed) {
        res.end();
        releaseConnection();
      }
    }, DOWNLOAD_STREAM_MAX_MS);

    function sendStream() {
      if (isClosed || Date.now() - streamStarted >= DOWNLOAD_STREAM_MAX_MS) {
        if (!isClosed) {
          res.end();
          releaseConnection();
        }
        return;
      }
      const ok = res.write(chunk);
      if (ok) {
        setImmediate(sendStream);
      } else {
        res.once('drain', sendStream);
      }
    }

    sendStream();

    res.on('finish', () => {
      clearTimeout(streamTimeout);
      releaseConnection();
    });
  });

  // API Route: Upload receiver for real network testing
  app.post('/api/upload', apiRateLimit, (req, res) => {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/octet-stream')) {
      res.status(400).json({ error: 'Invalid content type. Only application/octet-stream is allowed.' });
      return;
    }

    const contentLengthHeader = req.headers['content-length'];
    const maxAllowedSize = 2 * 1024 * 1024;

    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (isNaN(contentLength) || contentLength > maxAllowedSize) {
        res.status(413).json({ error: 'Payload too large. Max size allowed is 2MB.' });
        return;
      }
    }

    let bytesReceived = 0;
    let limitExceeded = false;

    req.on('data', (chunk) => {
      if (limitExceeded) return;

      bytesReceived += chunk.length;
      if (bytesReceived > maxAllowedSize) {
        limitExceeded = true;
        req.destroy();
        if (!res.headersSent) {
          res.status(413).json({ error: 'Payload too large. Upload aborted.' });
        }
      }
    });

    req.on('end', () => {
      if (limitExceeded) return;

      res.json({
        status: 'ok',
        bytesReceived,
        message: 'Upload processed successfully',
      });
    });

    req.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Vite] Running in development mode with HMR disabled on port 3000');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Production] Serving static distribution files');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TarangStream Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start server:', err);
});