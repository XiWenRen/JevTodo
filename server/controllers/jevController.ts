import { GoogleGenAI } from "@google/genai";
import { writeJevLogEntry, readJevLogFile, clearJevLogFile, parseJevLogFile } from "../jevFileLogger.js";
import { resolveJevDateTime } from "../jevTimeHelper.js";
import { 
  buildDynamicTagCriteria, 
  buildScheduleContextAndHourCriteria, 
  buildDynamicTitleCriteria,
  getPersonalTagLedger
} from "../jevScheduleHelper.js";
import { extractUserIdFromReq } from "../auth.js";

/**
 * High-precision granular event matter tag generator.
 * Leverages Gemini AI prompt when configured, or high-precision matter rules as fallback.
 * Strictly avoids vague broad categories in favor of concrete event tags.
 */
export async function generateSpecificMatterTags(rawText: string, geminiKey?: string): Promise<string[]> {
  const explicitTags: string[] = [];
  const tagRegex = /#([\u4e00-\u9fa5\w-]+)/g;
  let match;
  while ((match = tagRegex.exec(rawText)) !== null) {
    if (!explicitTags.includes(match[1])) explicitTags.push(match[1]);
  }
  if (explicitTags.length >= 2) return explicitTags.slice(0, 3);

  // 1. If Gemini API Key is available, use Gemini 2.5 Flash
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
      .replace(/[，。！？；：、\s]+/g, ' ')
      .trim();

    const segments = cleaned.split(' ').filter(s => s.length >= 2);
    const forbiddenStarts = /^[要和跟同与给对把在从向让去到帮需想的得地了过着及]/;
    const forbiddenEnds = /[了呢吧啊吗呀哈哦一下一次的得地]$/;
    const blacklistedWords = ['工作', '测试', '生活', '学习', '其他', '待办', '任务', '事项', '日常'];

    for (const seg of segments) {
      const word = seg.slice(0, 4);
      if (!forbiddenStarts.test(word) && !forbiddenEnds.test(word) && !blacklistedWords.includes(word) && word.length >= 2) {
        inferred.push(word);
        break;
      }
    }

    if (inferred.length === 0) {
      inferred.push('重点事项');
    }
  }

  return inferred.slice(0, 2);
}

/**
 * Handle Jev Task Evaluation Endpoint
 */
export async function handleJevEvaluate(req: any, res: any) {
  const requestStart = Date.now();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, apiKey, endpoint, triggerType, allowFallback, userTags, existingSchedule } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Missing or invalid 'text' field" });
    }

    const ALLOWED_JEV_ENDPOINTS = [
      "https://api.typesafe.ai/v1/systemone",
      "https://api.typesafe.ai/v1/preview"
    ];
    const requestedEndpoint = (endpoint && typeof endpoint === "string") ? endpoint.trim() : "";
    let targetEndpoint = "https://api.typesafe.ai/v1/systemone";

    if (requestedEndpoint) {
      if (ALLOWED_JEV_ENDPOINTS.includes(requestedEndpoint)) {
        targetEndpoint = requestedEndpoint;
      } else {
        // SSRF & Credential Exfiltration Guard:
        // 1. If not in whitelist, user MUST provide their own apiKey.
        if (!apiKey) {
          return res.status(403).json({ error: "安全拦截：未列入官方白名单的第三方端点必须由客户端自行提供专属 API Key，禁止继承服务端全局 Key" });
        }
        // 2. Reject internal / cloud metadata networks
        try {
          const parsed = new URL(requestedEndpoint);
          const host = parsed.hostname.toLowerCase();
          if (host === 'localhost' || host === '127.0.0.1' || host === '169.254.169.254' || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.16.') || host === '0.0.0.0') {
            return res.status(403).json({ error: "安全拦截：禁止访问内网或云元数据服务地址" });
          }
          targetEndpoint = requestedEndpoint;
        } catch {
          return res.status(400).json({ error: "无效的目标端点 URL" });
        }
      }
    }

    const isWhitelisted = ALLOWED_JEV_ENDPOINTS.includes(targetEndpoint);
    const activeApiKey = apiKey ? apiKey.trim() : (isWhitelisted ? (process.env.JEV_API_KEY || process.env.VERCEL_AI_GATEWAY_KEY) : undefined);
    const maskedKey = activeApiKey ? `${activeApiKey.slice(0, 10)}...${activeApiKey.slice(-6)} (长${activeApiKey.length})` : '(未提供)';

    let lastGatewayError: string | null = null;
    let sentPayload: any = null;

    // User-scoped tag ledger
    const userId = extractUserIdFromReq(req) || 'default';
    const userLedger = getPersonalTagLedger(userId);

    // 1. Build dynamic tag criteria (user custom tags + input-extracted keywords + baseline)
    const matterTagCriteria = buildDynamicTagCriteria(userTags, text, userLedger);

    // 2. Build schedule-aware context and dynamic target_hour criteria with conflict badges
    const { enrichedState, targetHourCriteria, freeWindowSummary } = buildScheduleContextAndHourCriteria(existingSchedule, text);

    // 3. Build dynamic clean title criteria and candidates
    const { criteria: titleCriteria, defaultTitle } = buildDynamicTitleCriteria(text);

    if (activeApiKey) {
      try {
        const payload = {
          model: "jev-latest",
          state: enrichedState,
          questions: {
            task_title: {
              type: "choice",
              instructions: "请从以下候选名称中挑选出最适合作待办卡片名称的标题（核心语义完整、精简准确、去除时间、标签与口语修饰）：",
              criteria: titleCriteria
            },
            category: {
              type: "choice",
              instructions: "该待办事项应该属于哪个执行时机分类？",
              criteria: {
                "即刻完成": "今天内需做完、紧急重要事项",
                "近期完成": "本周或几天内需处理推进的事项",
                "规划待办": "未来计划、长期目标或随时可做的事项"
              }
            },
            matter_tag: {
              type: "choice",
              instructions: "该待办事项最匹配的业务事件、技术领域或【核心主体系统/平台】标签是什么？（若任务明确提及某系统、平台、组件或业务主体，优先选取该主体系统标签）：",
              criteria: matterTagCriteria
            },
            time_scope: {
              type: "choice",
              instructions: "根据任务内容判断，该待办事项应该安排在何时完成？",
              criteria: {
                "今天": "今天内需要处理或完成（包括今天上午、下午、今晚、立即、马上）",
                "明天": "明天需要处理或推进（包括明早、明晚）",
                "后天": "后天需要处理或推进",
                "本周内": "本周内某个工作日（周一至周五、周末前）",
                "下周": "下周需要推进处理的事项",
                "长期规划": "下个月、下半年、明年或长期未来规划",
                "随时待办": "未指定具体日期或随时可做的事项"
              }
            },
            time_slot: {
              type: "choice",
              instructions: "该任务是否有明确的执行时段倾向？（优先选择未冲突的空闲时段）",
              criteria: {
                "上午": "上午时段（08:00 - 12:00）",
                "中午": "中午时段（12:00 - 13:00）",
                "下午": "下午时段（13:00 - 18:00）",
                "晚上": "晚间时段（18:00 - 23:00）",
                "全天灵活": "全天任意时间或未指定特定时段"
              }
            },
            target_hour: {
              type: "choice",
              instructions: "结合今日日程占用与空闲时段，为该任务推荐选择最佳执行开始点钟（优先避开冲突安排在空闲窗口；若任务无需固定钟点可全天灵活推进请选未指定）：",
              criteria: targetHourCriteria
            },
            urgency_score: {
              type: "score",
              instructions: "该任务的紧迫程度评分（0为极低缓，4为极度紧迫）",
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
              instructions: "该任务是否属于无实质意义的过期或冗余任务，建议清理或归档？重要辨析准则：不同时间段或不同日期的同类任务属于不同时段的独立日程安排，绝非冗余或重复任务。"
            }
          }
        };
        sentPayload = payload;

        const fetchStart = Date.now();
        const jevRes = await fetch(targetEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeApiKey}`
          },
          body: JSON.stringify(payload)
        });
        const gatewayDuration = Date.now() - fetchStart;

        if (jevRes.ok) {
          const data = await jevRes.json();
          const answers = data.answers || {};

          // Clean title
          const chosenTitle = answers.task_title?.choice || answers.task_title?.value;
          const cleanTitle = (chosenTitle && titleCriteria[chosenTitle]) ? chosenTitle : defaultTitle;

          const category = answers.category?.choice || answers.category?.value || answers.category || "即刻完成";
          
          let urgencyScore = 0.8;
          const scoreVal = typeof answers.urgency_score === "number"
            ? answers.urgency_score
            : (answers.urgency_score?.score ?? answers.urgency_score?.value);
          if (typeof scoreVal === "number") {
            urgencyScore = scoreVal > 1 ? Math.min(1, Math.max(0, scoreVal / 4)) : scoreVal;
          }

          // Matter Tag
          let matterTag = answers.matter_tag?.choice || answers.matter_tag?.value || answers.matter_tag;
          if (matterTag && matterTagCriteria[matterTag]) {
            matterTag = matterTag.trim().replace(/^#/, "");
          } else {
            matterTag = null;
          }

          // Mint tag into user's evolving ledger
          if (matterTag) {
            userLedger.recordTagUsage(matterTag, 'jev_minted');
          }

          const tags: string[] = [];
          if (matterTag) tags.push(matterTag);

          // Supplemental explicit tags
          const explicitMatches = text.match(/#([\u4e00-\u9fa5\w-]+)/g);
          if (explicitMatches) {
            for (const t of explicitMatches) {
              const clean = t.replace("#", "");
              if (!tags.includes(clean)) tags.push(clean);
            }
          }

          // Time slot & target hour
          const chosenTimeScope = answers.time_scope?.choice || answers.time_scope?.value;
          const chosenTimeSlot = answers.time_slot?.choice || answers.time_slot?.value;
          const chosenTargetHour = answers.target_hour?.choice || answers.target_hour?.value;

          const { dueDate, dueTimestamp } = resolveJevDateTime(
            text, 
            category, 
            chosenTimeScope, 
            chosenTimeSlot, 
            chosenTargetHour
          );

          const cleanupProb = answers.needs_cleanup?.probability ?? 0;
          const confidence = data.confidence ?? 0.96;

          writeJevLogEntry({
            triggerType,
            inputText: text,
            targetEndpoint,
            apiKeyMasked: maskedKey,
            status: "SUCCESS",
            statusCode: 200,
            durationMs: gatewayDuration,
            requestPayload: payload,
            result: { cleanTitle, category, urgencyScore, tags, dueDate, dueTimestamp, confidence, source: "typesafe-jev-systemone" }
          });

          return res.json({
            cleanTitle,
            category,
            urgencyScore,
            tags,
            dueDate,
            dueTimestamp,
            needsCleanup: cleanupProb > 0.6,
            freeWindowSummary,
            confidence,
            rawJevAnswers: answers,
            source: "typesafe-jev-systemone",
            requestPayload: payload,
            durationMs: gatewayDuration,
            evolvingLedgerStats: userLedger.getStats()
          });
        } else {
          const errBody = await jevRes.text();
          lastGatewayError = `HTTP ${jevRes.status}: ${errBody}`;
          console.warn(`⚠️ [网关响应异常]: HTTP ${jevRes.status} (${gatewayDuration}ms) - ${errBody.slice(0, 180)}`);

          if (req.body?.isTest) {
            let msg = errBody;
            try {
              const parsed = JSON.parse(errBody);
              msg = parsed.message || parsed.error || errBody;
            } catch {}
            return res.status(jevRes.status).json({
              error: `TypeSafe Jev (${jevRes.status}): ${msg}`,
              source: "gateway-error"
            });
          }
        }
      } catch (fetchErr: any) {
        lastGatewayError = fetchErr?.message || String(fetchErr);
        console.warn("⚠️ [网关连接异常]:", lastGatewayError);
      }
    }

    // Fallback handling
    if (allowFallback !== true) {
      const errMsg = lastGatewayError || "未配置有效 JEV_API_KEY，且已在设置中关闭本地降级";
      writeJevLogEntry({
        triggerType,
        inputText: text,
        targetEndpoint,
        apiKeyMasked: maskedKey,
        status: "FAILED (Fallback disabled)",
        statusCode: 502,
        durationMs: Date.now() - requestStart,
        requestPayload: sentPayload,
        error: errMsg
      });
      return res.status(502).json({
        error: errMsg,
        source: "jev-failed",
        allowFallback: false
      });
    }

    // Cherry Local Calibrated Engine fallback
    const lower = text.toLowerCase();
    let category = "近期完成";
    let urgencyScore = 0.5;

    const hasFutureDay = /(明天|明早|明晚|后天|这周|本周|下周)/.test(lower);
    const isPastDay = /(昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|上周|上星期)/.test(lower);
    const isUrgentIncident = /(宕机|502|故障|报警|告警|严重)/.test(lower);

    if (!isPastDay && (!hasFutureDay || isUrgentIncident) && /(今天|今晚|下午|上午|马上|立即|紧急|现在|开会|交差|deadline|宕机|告警|报警|502|卡点|阻塞|故障|冒烟)/.test(lower)) {
      category = "即刻完成";
      urgencyScore = /(紧急|重要|严重|今天内|宕机|502|高危|告警|报警|生产环境|故障)/.test(lower) ? 0.98 : 0.92;
    } else if (/(下个月|明年|长远|有空|闲暇|抽空|规划|梦想|想学|下半年|架构演进|储备|远期)/.test(lower)) {
      category = "规划待办";
      urgencyScore = 0.25;
    } else {
      category = "近期完成";
      urgencyScore = /(采购|预算|评审|用例|例会|周五|周四|本周)/.test(lower) ? 0.72 : 0.65;
    }

    const specificTags = await generateSpecificMatterTags(text, req.body?.geminiApiKey);
    for (const t of specificTags) {
      userLedger.recordTagUsage(t, 'jev_minted');
    }
    const totalElapsed = Date.now() - requestStart;

    writeJevLogEntry({
      triggerType,
      inputText: text,
      targetEndpoint,
      apiKeyMasked: maskedKey,
      status: "FALLBACK (Cherry Local Engine)",
      durationMs: totalElapsed,
      requestPayload: sentPayload,
      result: { cleanTitle: defaultTitle, category, urgencyScore, tags: specificTags, source: "cherry-calibrated-local" },
      error: lastGatewayError || "Fallback to Cherry local engine"
    });

    return res.json({
      cleanTitle: defaultTitle,
      category,
      urgencyScore,
      tags: specificTags,
      confidence: 0.93,
      source: "cherry-calibrated-local",
      gatewayError: lastGatewayError,
      requestPayload: sentPayload,
      durationMs: totalElapsed
    });
  } catch (err: any) {
    console.error("Server evaluate error:", err);
    return res.status(500).json({ error: err?.message || "Internal evaluation error" });
  }
}

/**
 * Handle Jev Log Inspection & Download
 * Enforces production 404 security rule to prevent sensitive task leakage
 */
export function handleJevLogs(req: any, res: any) {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProd) {
    return res.status(404).json({ error: "Endpoint not found" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.query?.clear === "true") {
    clearJevLogFile();
    return res.type("text/plain; charset=utf-8").send("Jev log file cleared.\n");
  }
  if (req.query?.format === "json" || req.headers?.accept?.includes("application/json")) {
    const keyFilter = typeof req.query?.key === "string" ? req.query.key : undefined;
    const parsed = parseJevLogFile(keyFilter);
    return res.json(parsed);
  }
  const logs = readJevLogFile();
  return res.type("text/plain; charset=utf-8").send(logs);
}

/**
 * Handle Jev User-Scoped Tag Ledger Stats
 */
export function handleJevTagLedger(req: any, res: any) {
  const userId = extractUserIdFromReq(req) || 'default';
  const ledger = getPersonalTagLedger(userId);
  return res.json({
    stats: ledger.getStats(),
    tags: ledger.getAllTags()
  });
}
