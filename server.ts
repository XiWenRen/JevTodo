import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
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

  /**
   * High-precision granular event matter tag generator.
   * Leverages Gemini AI prompt when configured, or high-precision matter rules as fallback.
   * Strictly avoids vague broad categories like "工作", "测试", "生活", "学习" in favor of concrete event tags.
   */
  async function generateSpecificMatterTags(rawText: string, geminiKey?: string): Promise<string[]> {
    const explicitTags: string[] = [];
    const tagRegex = /#([\u4e00-\u9fa5\w-]+)/g;
    let match;
    while ((match = tagRegex.exec(rawText)) !== null) {
      if (!explicitTags.includes(match[1])) explicitTags.push(match[1]);
    }
    if (explicitTags.length >= 2) return explicitTags.slice(0, 3);

    // 1. If Gemini API Key is available, use Gemini 2.5 Flash with the specialized matter tag prompt
    const activeGeminiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (activeGeminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: activeGeminiKey });
        const prompt = `你是一个精准的待办事项细化标签提取助手。
请根据用户输入的任务内容，提取 1 到 2 个【具体事件/业务细化标签】。

【极其重要的准则 - 严禁宽泛标签与语法残缺短语】：
1. 绝对严禁生成宽泛大类词，严禁输出：工作、测试、生活、学习、研发、运维、需求、管理、团队、人事、采购、财务、其他、日常、事项、待办、任务。
2. 绝对严禁提取带有介词、助词、连词、情态动词的错误残缺词组！
   - 严禁提取类似：“要和中台”、“跟前端”、“帮财务”、“把数据库”、“去医院”、“向领导”、“准备做”！
   - 必须剥离“要/和/跟/与/同/给/对/把/向/在/让/去/帮/需/完成/进行/准备/打算”等助词与介词，提取干净精准的【实体+动作】或【专有事项名称】。
3. 必须下钻到【具体业务对象/模块 + 具体动作】，或者是【明确的具体事件名称】。
   示例：
   - "今天要和中台完成同步" -> 标签：["中台同步"]
   - "下午跟前端对一下订单接口" -> 标签：["接口联调"]
   - "去把数据库做一次全量备份" -> 标签：["数据库备份"]
   - "生产环境 8080 端口网关告警 502，拉通运维排查修复" -> 标签：["网关排查", "502报警"]
   - "组织核心订单与退款测试用例评审，确认冒烟卡点" -> 标签：["用例评审", "冒烟测试"]
   - "完成供应链系统改造需求评审方案并锁定版本 PRD" -> 标签：["PRD终审", "供应链改造"]
   - "跟进结算微服务重构代码 CR 卡点与灰度发版计划" -> 标签：["代码审查", "灰度发版"]
   - "明天上午10点组织 SaaS 项目双周进度例会，更新燃尽图" -> 标签：["双周例会", "燃尽图"]
   - "提交 AI 算力服务器硬件采购申请与 3 家供应商比价单" -> 标签：["硬件采购", "供应商比价"]
   - "完成 2027 财年 IT 研发与云资源预算申报表" -> 标签：["预算申报", "云资源预算"]
   - "安排资深架构师技术终面及试用期 1on1" -> 标签：["架构师终面", "试用期1on1"]
   - "去山姆超市买牛排和水果" -> 标签：["超市采买"]
   - "周六上午去医院做胃镜检查" -> 标签：["胃镜检查"]
   - "每天背 50 个托福高频单词" -> 标签：["托福词汇"]

待办内容："${rawText}"

请严格以纯 JSON 格式输出，不要包含 markdown 代码块：
{"tags": ["具体标签1", "具体标签2"]}`;

        const resp = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });

        const textOutput = resp.text || "";
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
            const forbiddenStarts = /^[要和跟同与给对把在从向让去到帮需想的得地了过着及]/;
            const forbiddenEnds = /[了呢吧啊吗呀哈哦一下一次的得地]$/;
            const broadWords = ["工作", "测试", "生活", "学习", "其他", "待办", "任务", "事项", "日常"];

            const aiTags = parsed.tags.filter((t: any) => 
              typeof t === "string" && 
              t.trim().length >= 2 &&
              !broadWords.includes(t.trim()) &&
              !forbiddenStarts.test(t.trim()) &&
              !forbiddenEnds.test(t.trim())
            );
            if (aiTags.length > 0) {
              return [...explicitTags, ...aiTags].slice(0, 3);
            }
          }
        }
      } catch (err) {
        console.warn("Gemini tag generation error, fallback to local matter rules:", err);
      }
    }

    // 2. High-precision matter rules fallback
    const text = rawText.toLowerCase();
    const matterRules: Array<{ match: (t: string) => boolean; tag: string }> = [
      { match: t => /(502|500|503|404|宕机|崩溃|报警|告警|网关告警)/.test(t) && /(网关|端口|nginx|8080|排查|修复)/.test(t), tag: '网关排查' },
      { match: t => /(502|500|宕机|报警|告警|卡死|挂掉)/.test(t), tag: '502报警' },
      { match: t => /(生产环境|线上环境|高危|故障修复|紧急排查)/.test(t), tag: '生产排查' },
      { match: t => /(用例|测试用例)/.test(t) && /(评审|讨论|过例)/.test(t), tag: '用例评审' },
      { match: t => /(冒烟|卡点|阻塞|冒烟测试)/.test(t), tag: '冒烟测试' },
      { match: t => /(压测|压力测试|性能测试|吞吐量|tps)/.test(t), tag: '性能压测' },
      { match: t => /(回归|验收|预发验收|qa验证)/.test(t), tag: '回归验收' },
      { match: t => /(缺陷|bug|修复bug|提单)/.test(t), tag: 'Bug修复' },
      { match: t => /(退款|支付|订单)/.test(t) && /(测试|用例|验证)/.test(t), tag: '支付测试' },
      { match: t => /(prd|产品文档)/.test(t) && /(锁定|终审|定稿|签署)/.test(t), tag: 'PRD终审' },
      { match: t => /(供应链|分销|仓储)/.test(t) && /(改造|系统|重构)/.test(t), tag: '供应链改造' },
      { match: t => /(需求评审|方案评审|产品评审)/.test(t), tag: '需求评审' },
      { match: t => /(原型|交互稿|ui稿|高保真|figma)/.test(t), tag: '原型设计' },
      { match: t => /(代码cr|cr卡点|cr|review|代码评审|代码审查)/.test(t), tag: '代码审查' },
      { match: t => /(灰度|发版|发版计划|上线计划|发布版本)/.test(t), tag: '灰度发版' },
      { match: t => /(中台|数据中台|业务中台)/.test(t) && /(同步|对接|联调|打通|对齐)/.test(t), tag: '中台同步' },
      { match: t => /(中台|数据中台|业务中台)/.test(t) && /(改造|重构|演进|架构)/.test(t), tag: '中台改造' },
      { match: t => /(中台|数据中台|业务中台)/.test(t), tag: '中台对接' },
      { match: t => /(前端|后端|h5|web|app|客户端|服务端)/.test(t) && /(联调|对接|接口|对齐)/.test(t), tag: '接口联调' },
      { match: t => /(结算|支付|账单)/.test(t) && /(微服务|重构|服务化)/.test(t), tag: '微服务重构' },
      { match: t => /(架构演进|中台演进|技术预研|立项预研)/.test(t), tag: '架构演进' },
      { match: t => /(数据库迁移|分库分表|sql优化|索引重构)/.test(t), tag: '数据库迁移' },
      { match: t => /(数据库|mysql|redis|es|pgsql)/.test(t) && /(备份|容灾|快照|回档)/.test(t), tag: '数据库备份' },
      { match: t => /(数据|链路|状态)/.test(t) && /(双向同步|增量同步|数据同步|传输|推送)/.test(t), tag: '数据同步' },
      { match: t => /(接口联调|api对接|联调卡点)/.test(t), tag: '接口联调' },
      { match: t => /(领导|主管|总监|老总|组长)/.test(t) && /(汇报|对齐|进展|复盘)/.test(t), tag: '工作汇报' },
      { match: t => /(同城双活|跨机房|灾备迁移|灾备演练)/.test(t), tag: '双活灾备' },
      { match: t => /(机房迁移|机房割接|物理机搬迁)/.test(t), tag: '机房迁移' },
      { match: t => /(弱电|机架回收|废旧机架|机柜|弱电供应)/.test(t), tag: '机架回收' },
      { match: t => /(双周例会|双周进度|项目双周|进度例会)/.test(t), tag: '双周例会' },
      { match: t => /(燃尽图|燃尽图更新|甘特图)/.test(t), tag: '燃尽图' },
      { match: t => /(比价单|供应商比价|3家比价|三方比价)/.test(t), tag: '供应商比价' },
      { match: t => /(算力服务器|硬件采购|服务器采购|设备采购)/.test(t), tag: '硬件采购' },
      { match: t => /(预算申报|申报表|预算审批|财年预算)/.test(t), tag: '预算申报' },
      { match: t => /(云资源预算|it研发预算|公有云开销)/.test(t), tag: '云资源预算' },
      { match: t => /(技术终面|终面面谈|候选人终面|技术复试)/.test(t), tag: '架构师终面' },
      { match: t => /(试用期1on1|试用期面谈|试用期考核|转正答辩)/.test(t), tag: '试用期1on1' },
      { match: t => /(历史归档|老旧微服务|用例归档|归档目录)/.test(t), tag: '历史归档' },
      { match: t => /(胃镜|肠镜|体检报告|核酸|年度体检)/.test(t), tag: '医疗体检' },
      { match: t => /(挂号|门诊|三甲医院|看医生|就医)/.test(t), tag: '就医挂号' },
      { match: t => /(力量训练|深蹲|卧推|健身房打卡)/.test(t), tag: '力量训练' },
      { match: t => /(有氧慢跑|跑步打卡|5公里|晨跑)/.test(t), tag: '跑步锻炼' },
      { match: t => /(雅思|托福|四六级|背单词|单词打卡)/.test(t), tag: '外语备考' },
      { match: t => /(机票预订|高铁票|改签|订机票)/.test(t), tag: '票务预订' },
      { match: t => /(寄快递|取快递|顺丰|菜鸟驿站)/.test(t), tag: '快递处理' },
      { match: t => /(水电费|物业费|燃气费|生活缴费)/.test(t), tag: '生活缴费' },
      { match: t => /(山姆|盒马|超市买菜|生鲜采买)/.test(t), tag: '生鲜采买' }
    ];

    const inferred = [...explicitTags];
    for (const rule of matterRules) {
      if (inferred.length >= 2) break;
      if (rule.match(text)) {
        const hasOverlap = inferred.some(t => 
          t === rule.tag || (t.length >= 3 && rule.tag.length >= 3 && t.slice(0, 2) === rule.tag.slice(0, 2))
        );
        if (!hasOverlap) {
          inferred.push(rule.tag);
        }
      }
    }

    // Dynamic entity + action pairing
    if (inferred.length === 0) {
      const knownEntities = [
        '中台', '数据中台', '业务中台', '前端', '后端', '网关', '支付', '订单', '结算', '风控', '会员',
        '营销', '供应链', '仓储', '物流', '库存', '数据库', 'mysql', 'redis', 'k8s', '集群', '服务器',
        '云资源', '机房', '域名', '证书', '用例', '代码', '架构', '需求', 'prd', '原型', '报表',
        '发票', '合同', '供应商', '硬件', '算力', '面试', '招聘', '体检', '胃镜', '挂号', '门诊',
        '机票', '酒店', '快递', '账单'
      ];
      const knownActions = [
        '同步', '联调', '对接', '打通', '对齐', '重构', '改造', '演进', '迁移', '备份', '排查',
        '修复', '压测', '验收', '评审', '审查', '发版', '灰度', '上线', '部署', '申报', '比价',
        '采购', '报销', '审批', '对账', '核对', '复盘', '挂号', '预订', '采买'
      ];

      for (const ent of knownEntities) {
        if (text.includes(ent)) {
          for (const act of knownActions) {
            if (text.includes(act)) {
              const combined = `${ent}${act}`;
              if (!inferred.includes(combined)) {
                inferred.push(combined);
                break;
              }
            }
          }
        }
        if (inferred.length >= 2) break;
      }
    }

    if (inferred.length === 0) {
      const dynamicMatch = text.match(/(支付|订单|网关|中台|供应链|结算|机房|服务器|云资源|预算|用例|架构|合同|发票|论文|体检|机票)(改造|评审|排查|重构|申报|采购|迁移|比价|审批|测试|核算|检查|预订|同步|对接)/);
      if (dynamicMatch && dynamicMatch[0]) inferred.push(dynamicMatch[0]);
    }

    // Fallback: Strip stop words and prepositions
    if (inferred.length === 0) {
      const cleaned = text
        .replace(/(今天|明天|后天|大后天|昨晚|昨天|前天|上午|下午|晚上|早晨|早上|中午|夜里|这周|本周|下周|周[一二三四五六日天1-7]|\d+点|\d+分|点前|半前|分前|之后|之前|月底|月初|年中|年底)/g, '')
        .replace(/(要和|要跟|要去|要给|要与|要同|要对|要把|要向|要|和|跟|与|同|给|对|把|向|从|在|让|去|帮|需|需要|想要|打算|准备|负责|协助|组织|安排|进行|推进|落实|完成|做好|搞定|处理|搞好|弄好|请|一起|共同|一下|一次|一番|这件|这个|那个|相关|等等|以及|部分|还有|一个|一份|一项)/g, '')
        .trim();

      const matches = cleaned.match(/[\u4e00-\u9fa5]{2,5}/g);
      if (matches && matches.length > 0) {
        const forbiddenStarts = /^[要和跟同与给对把在从向让去到帮需想的得地了过着及]/;
        const forbiddenEnds = /[了呢吧啊吗呀哈哦一下一次的得地]$/;
        const blacklistedWords = ['待办', '事项', '任务', '工作', '测试', '生活', '学习', '我们', '大家', '然后', '而且', '但是', '或者', '这个', '那个', '一些', '重点'];

        for (const word of matches) {
          if (!forbiddenStarts.test(word) && !forbiddenEnds.test(word) && !blacklistedWords.includes(word) && word.length >= 2) {
            inferred.push(word);
            break;
          }
        }
      }

      if (inferred.length === 0) {
        inferred.push('重点事项');
      }
    }

    return inferred.slice(0, 2);
  }

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
                instructions: "该任务是否属于无实质意义的过期或冗余任务，建议清理或归档？重要辨析准则：不同时间段或不同日期的同类任务（例如下午3点开会与下午4点开会、今天开会与明天开会）属于不同时段的独立日程安排，绝非冗余或重复任务。",
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

            const specificTags = await generateSpecificMatterTags(text, req.body.geminiApiKey);

            return res.json({
              category,
              priority,
              urgencyScore,
              tags: specificTags,
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
      const isPastDay = /(昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|上周|上星期)/.test(lower);
      const isUrgentIncident = /(宕机|502|故障|报警|告警|p0|严重)/.test(lower);

      if (!isPastDay && (!hasFutureDay || isUrgentIncident) && /(今天|今晚|下午|上午|马上|立即|紧急|现在|开会|交差|deadline|宕机|告警|报警|502|卡点|阻塞|故障|冒烟)/.test(lower)) {
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

      const specificTags = await generateSpecificMatterTags(text, req.body.geminiApiKey);

      return res.json({
        category,
        priority,
        urgencyScore,
        tags: specificTags,
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
