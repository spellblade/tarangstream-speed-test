import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApiApp } from "./src/server/apiApp";
import { resolveListenPort } from "./src/utils/listenPort";

async function startServer() {
  const app = createApiApp();
  const PORT = resolveListenPort();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`[Vite] Running in development mode on port ${PORT}`);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Production] Serving static distribution files");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TarangStream Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server Error] Failed to start server:", err);
});
