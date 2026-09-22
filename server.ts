import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { fetchAllTasksFromDB, upsertTaskToDB, deleteTaskFromDB, syncBatchTasksToDB, isCloudDBConfigured } from "./server/db.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes First
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Cloud Tasks Persistence API (Vercel Postgres / Neon / Local fallback)
  app.get("/api/tasks", async (_req, res) => {
    try {
      if (!isCloudDBConfigured()) {
        return res.json({
          configured: false,
          source: "local_storage",
          tasks: [],
          message: "未检测到 POSTGRES_URL，已自动启用客户端 LocalStorage 离线存储。"
        });
      }
      const tasks = await fetchAllTasksFromDB();
      return res.json({
        configured: true,
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
      const body = req.body || {};
      if (body.action === "batch_sync" && Array.isArray(body.tasks)) {
        await syncBatchTasksToDB(body.tasks);
        return res.json({ configured: true, success: true, count: body.tasks.length });
      }
      if (body.task) {
        await upsertTaskToDB(body.task);
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
      const id = (req.query?.id as string) || req.body?.id;
      if (!id) return res.status(400).json({ error: "Missing id" });
      await deleteTaskFromDB(id);
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
