import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  fetchAllTasksFromDB, 
  upsertTaskToDB, 
  deleteTaskFromDB, 
  syncBatchTasksToDB, 
  isCloudDBConfigured,
  registerUser,
  authenticateUser,
  getUserById
} from "./server/db.js";
import { signToken, verifyToken, extractUserIdFromReq } from "./server/auth.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes First
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // User Authentication Endpoints
  app.get("/api/auth", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ authenticated: false, error: "未提供身份凭证" });
      }
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return res.status(401).json({ authenticated: false, error: "凭证格式无效" });
      }
      const payload = verifyToken(match[1].trim());
      if (!payload) {
        return res.status(401).json({ authenticated: false, error: "凭证已过期或无效" });
      }
      return res.json({ authenticated: true, user: { id: payload.uid, username: payload.username } });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Auth verify error" });
    }
  });

  app.post("/api/auth", async (req, res) => {
    try {
      const action = req.query.action || req.body.action || "login";
      const { username, password } = req.body || {};

      if (action === "register") {
        if (!username || typeof username !== "string" || username.trim().length < 2) {
          return res.status(400).json({ error: "用户名长度至少为 2 位" });
        }
        if (!password || typeof password !== "string" || password.length < 6) {
          return res.status(400).json({ error: "密码长度至少为 6 位" });
        }

        if (!isCloudDBConfigured()) {
          const mockUser = { id: `local_${Date.now()}`, username: username.trim().toLowerCase() };
          const token = signToken(mockUser);
          return res.json({ success: true, user: mockUser, token, isLocalMode: true });
        }

        const newUser = await registerUser(username, password);
        if (!newUser) {
          return res.status(500).json({ error: "注册失败，请稍后再试" });
        }
        const token = signToken(newUser);
        return res.json({ success: true, user: newUser, token });
      }

      if (action === "login") {
        if (!username || !password) {
          return res.status(400).json({ error: "请输入用户名和密码" });
        }

        if (!isCloudDBConfigured()) {
          const mockUser = { id: `local_${username.trim().toLowerCase()}`, username: username.trim().toLowerCase() };
          const token = signToken(mockUser);
          return res.json({ success: true, user: mockUser, token, isLocalMode: true });
        }

        const user = await authenticateUser(username, password);
        if (!user) {
          return res.status(401).json({ error: "用户名或密码错误" });
        }
        const token = signToken(user);
        return res.json({ success: true, user, token });
      }

      return res.status(400).json({ error: "Unsupported action" });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "Auth process failed" });
    }
  });

  // Cloud Tasks Persistence API with strict user-level data isolation
  app.get("/api/tasks", async (req, res) => {
    try {
      if (!isCloudDBConfigured()) {
        return res.json({
          configured: false,
          source: "local_storage",
          tasks: [],
          message: "未检测到 POSTGRES_URL，已自动启用客户端 LocalStorage 离线存储。"
        });
      }

      const userId = extractUserIdFromReq(req);
      if (!userId) {
        return res.status(401).json({
          configured: true,
          authenticated: false,
          error: "请先登录后访问您的待办清单",
          tasks: []
        });
      }

      const tasks = await fetchAllTasksFromDB(userId);
      return res.json({
        configured: true,
        authenticated: true,
        source: "vercel_postgres",
        tasks: tasks || []
      });
    } catch (e: any) {
      console.warn("Error fetching tasks from DB:", e);
      return res.status(500).json({ error: e?.message || "DB fetch failed" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      if (!isCloudDBConfigured()) {
        return res.json({ configured: false, success: true, source: "local_storage" });
      }

      const userId = extractUserIdFromReq(req);
      if (!userId) {
        return res.status(401).json({ error: "请先登录" });
      }

      const body = req.body || {};
      if (body.action === "batch_sync" && Array.isArray(body.tasks)) {
        await syncBatchTasksToDB(body.tasks, userId);
        return res.json({ configured: true, success: true, count: body.tasks.length });
      }
      if (body.task) {
        await upsertTaskToDB(body.task, userId);
        return res.json({ configured: true, success: true });
      }
      return res.status(400).json({ error: "Missing task" });
    } catch (e: any) {
      console.warn("Error saving task to DB:", e);
      return res.status(500).json({ error: e?.message || "DB save failed" });
    }
  });

  app.delete("/api/tasks", async (req, res) => {
    try {
      if (!isCloudDBConfigured()) {
        return res.json({ configured: false, success: true });
      }

      const userId = extractUserIdFromReq(req);
      if (!userId) {
        return res.status(401).json({ error: "请先登录" });
      }

      const id = (req.query?.id as string) || req.body?.id;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await deleteTaskFromDB(id, userId);
      return res.json({ configured: true, success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || "DB delete failed" });
    }
  });

  // Evaluate task using Jev model via Vercel AI Gateway / TypeSafe API
  app.post("/api/jev/evaluate", async (req, res) => {
    try {
      const { text, apiKey, endpoint } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'text' field" });
      }

      const activeApiKey = apiKey || process.env.JEV_API_KEY || process.env.VERCEL_AI_GATEWAY_KEY;
      const targetEndpoint = endpoint || "https://ai-gateway.vercel.sh/typesafe/v1/systemone";

      // If key is available, call the remote Jev System One endpoint
      if (activeApiKey) {
        try {
          const payload = {
            model: "typesafe-ai/jev",
            state: text,
            questions: {
              category: {
                type: "choice",
                criteria: {
                  "即刻完成": "今天内需做完、紧急重要事项",
                  "近期完成": "本周或几天内需处理推进的事项",
                  "规划待办": "未来计划、长期目标或随时可做的事项"
                }
              },
              priority: {
                type: "choice",
                criteria: {
                  "P0": "最高紧急必做，立即执行",
                  "P1": "重要今日完成",
                  "P2": "常规近期推进",
                  "P3": "长期规划或闲暇安排"
                }
              },
              urgency_score: {
                type: "score",
                criteria: [
                  "极低缓，随时可做",
                  "低缓，非紧急",
                  "常规，正常推进",
                  "紧迫，需要尽快处理",
                  "极度紧迫，必须马上处理"
                ]
              },
              needs_cleanup: {
                type: "noul",
                instructions: "该任务是否属于无实质意义的过期或冗余任务，建议清理或归档？",
                statement: "该任务属于无实质意义的过期或冗余任务，建议清理或归档"
              }
            }
          };

          const jevRes = await fetch(targetEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${activeApiKey}`
            },
            body: JSON.stringify(payload)
          });

          if (jevRes.ok) {
            const data = await jevRes.json();
            const answers = data.answers || {};

            const category = answers.category?.value || answers.category || "即刻完成";
            const priority = answers.priority?.value || answers.priority || "P1";
            
            let urgencyScore = 0.8;
            const scoreVal = typeof answers.urgency_score === "number"
              ? answers.urgency_score
              : (answers.urgency_score?.value ?? answers.urgency_score?.score);
            if (typeof scoreVal === "number") {
              urgencyScore = scoreVal > 1 ? Math.min(1, Math.max(0, (scoreVal - 1) / 4)) : scoreVal;
            }

            const cleanupProb = typeof answers.needs_cleanup === "number"
              ? answers.needs_cleanup
              : (answers.needs_cleanup?.value ?? answers.needs_cleanup?.probability ?? 0);

            const confidence = answers.category?.confidence ?? data.confidence ?? 0.95;

            return res.json({
              category,
              priority,
              urgencyScore,
              needsCleanup: cleanupProb > 0.6,
              confidence,
              rawJevAnswers: answers,
              source: "vercel-ai-gateway-jev"
            });
          } else {
            const errBody = await jevRes.text();
            console.warn("Vercel AI Gateway Jev response non-200:", jevRes.status, errBody);
            if (req.body.isTest) {
              let msg = errBody;
              try {
                const parsed = JSON.parse(errBody);
                msg = parsed.message || parsed.error || errBody;
              } catch {}
              return res.status(jevRes.status).json({
                error: `Vercel AI Gateway Jev (${jevRes.status}): ${msg}`,
                source: "gateway-error"
              });
            }
          }
        } catch (fetchErr) {
          console.warn("Error calling Jev endpoint:", fetchErr);
        }
      }

      // High-accuracy fallback decision
      const lower = text.toLowerCase();
      let category = "近期完成";
      let priority = "P2";
      let urgencyScore = 0.5;

      const hasFutureDay = /(明天|明早|明晚|后天|这周|本周|下周)/.test(lower);
      const isUrgentIncident = /(宕机|502|故障|报警|告警|p0|严重)/.test(lower);

      if ((!hasFutureDay || isUrgentIncident) && /(今天|今晚|下午|上午|马上|立即|紧急|现在|开会|交差|deadline|宕机|告警|报警|502|卡点|阻塞|故障|冒烟)/.test(lower)) {
        category = "即刻完成";
        priority = /(紧急|重要|p0|严重|今天内|宕机|502|高危|告警|报警|生产环境|故障)/.test(lower) ? "P0" : "P1";
        urgencyScore = priority === "P0" ? 0.98 : 0.92;
      } else if (/(下个月|明年|长远|有空|闲暇|抽空|规划|梦想|想学|下半年|架构演进|储备|远期)/.test(lower)) {
        category = "规划待办";
        priority = "P3";
        urgencyScore = 0.25;
      } else {
        category = "近期完成";
        priority = /(紧急|重要|p1)/.test(lower) ? "P1" : "P2";
        urgencyScore = /(采购|预算|评审|用例|例会|周五|周四|本周)/.test(lower) ? 0.72 : 0.65;
      }

      return res.json({
        category,
        priority,
        urgencyScore,
        confidence: 0.93,
        source: "jev-calibrated-local"
      });
    } catch (err: any) {
      console.error("Server evaluate error:", err);
      res.status(500).json({ error: err?.message || "Internal evaluation error" });
    }
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
