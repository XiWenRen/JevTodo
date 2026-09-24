import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import { handleAuthRequest } from "./server/controllers/authController.js";
import { handleTasksRequest } from "./server/controllers/tasksController.js";
import { handleOperationLogsRequest } from "./server/controllers/operationLogsController.js";
import { 
  handleJevEvaluate, 
  handleJevLogs, 
  handleJevTagLedger 
} from "./server/controllers/jevController.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const httpServer = http.createServer(app);

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // User Authentication Endpoints
  app.all("/api/auth", handleAuthRequest);

  // Cloud Tasks Persistence API
  app.all("/api/tasks", handleTasksRequest);

  // Cloud Operation Logs Persistence API
  app.all("/api/operation-logs", handleOperationLogsRequest);

  // Jev Task Evaluation Endpoint
  app.post("/api/jev/evaluate", handleJevEvaluate);

  // Jev Tag Ledger API
  app.get("/api/jev/tagledger", handleJevTagLedger);

  // Jev Log File API (Strictly 404 in production per security policy)
  app.get("/api/jev/logs", handleJevLogs);

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
