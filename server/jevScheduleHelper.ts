/**
 * Schedule awareness and dynamic criteria builder for TypeSafe Jev System One
 */

export interface ScheduledTaskSummary {
  id?: string;
  title: string;
  dueDate?: string;
  dueDateIso?: string;
  dueTimestamp?: number;
  durationMinutes?: number; // e.g. cherryClock or default 45 min
}

/**
 * High-precision Subject & System Entity Extractor.
 * Identifies explicit core subjects, systems, platforms, middleware, projects, and apps.
 * e.g. "CRM系统", "OA系统", "ERP系统", "风控平台", "K8s集群", "MySQL", "工单系统", "飞书", "微信小程序", "用户中心"
 */
export function extractSubjectEntities(text: string): string[] {
  if (!text) return [];
  const entities: string[] = [];

  const leadingNoise = /^(按照|按|通过|使用|优化|修复|排查|升级|更新|核对|配置|处理|推进|搭建|重构|迁移|同步|对接|编写|撰写|检查|巡检|修改|完善|维护|接入|开发|测试|梳理|评估|设计|部署|上线|发布|管理|监控|查询|导出|录入|提交|复核|调优|在|从|到|把|将|给|对|向|和|跟|与|于)+/g;

  const addEntity = (candidate: string) => {
    if (!candidate) return;
    let clean = candidate.trim().replace(/^[#@\[【（("']+|[#@\]】）)"']+$/g, '');

    // If candidate contains intermediate prepositions like "组织架构到用户中心", split and take the noun part
    if (/(从|到|在|给|向|对于)/.test(clean)) {
      const parts = clean.split(/(?:从|到|在|给|向|对于)/);
      clean = parts[parts.length - 1];
    }

    clean = clean.replace(leadingNoise, '').trim();
    if (clean.length < 2 || clean.length > 15) return;

    const noiseWords = [
      '这个系统', '某个系统', '相关系统', '业务系统', '整个系统', '各个系统', '当前系统', '该系统', '此系统',
      '这个平台', '某个平台', '相关平台', '整个平台', '当前平台', '该平台',
      '中心', '系统', '平台', '服务', '模块', '应用', '项目', '计划', '任务', '事项'
    ];
    if (noiseWords.includes(clean)) return;
    if (!entities.includes(clean)) entities.push(clean);
  };

  // 1. Quoted / Bracketed entities: 【xxx】, “xxx”, "xxx", 「xxx」
  const bracketRegex = /[【「“"']([^【】「」“”"'\s]{2,12})[】」”"']/g;
  let bMatch;
  while ((bMatch = bracketRegex.exec(text)) !== null) {
    addEntity(bMatch[1]);
  }

  // 2. English / Acronym System & Platform combinations
  // e.g. CRM系统, OA系统, ERP平台, WMS系统, MES系统, BI系统, CDP中台, TMS系统, DMS系统, POS系统, SSO服务, CMS后台, K8s集群, CI流水线, API网关, APISIX网关
  const engSysRegex = /(?:^|[^a-zA-Z0-9])([A-Za-z0-9_-]{2,10}(?:系统|平台|服务|中心|模块|引擎|网关|底座|集群|组件|后台|前台|流水线|数据库|中台|应用|客户端|小程序|SDK|API))/g;
  let esMatch;
  while ((esMatch = engSysRegex.exec(text)) !== null) {
    addEntity(esMatch[1]);
  }

  // 3. Known enterprise acronyms (even without "系统" suffix, e.g. "在CRM中", "提交ERP审批")
  const acronyms = [/(?:^|[^a-zA-Z0-9])(CRM|OA|ERP|WMS|MES|BI|CDP|TMS|POS|SSO|CMS|PLM|SCM|BPM)(?:[^a-zA-Z0-9]|$)/gi];
  for (const ac of acronyms) {
    let aMatch;
    while ((aMatch = ac.exec(text)) !== null) {
      const upper = aMatch[1].toUpperCase();
      const withSys = `${upper}系统`;
      addEntity(withSys);
    }
  }

  // 4. Tech stack, Cloud, Database & Middleware subjects
  const techEntities = [
    'Kubernetes', 'K8s', 'Docker', 'Redis', 'MySQL', 'PostgreSQL', 'PgSQL', 'MongoDB',
    'Elasticsearch', 'Kafka', 'RabbitMQ', 'RocketMQ', 'Nginx', 'Kong', 'APISIX',
    'GitHub', 'GitLab', 'Jenkins', 'Linux', 'Apollo', 'Nacos', 'Dubbo',
    'Prometheus', 'Grafana', 'Flink', 'Spark', 'Hadoop', 'Hive', 'ClickHouse',
    '阿里云', '腾讯云', '华为云', 'AWS', 'Azure'
  ];
  for (const tech of techEntities) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:[^a-zA-Z0-9]|$)`, 'i');
    if (regex.test(text)) {
      addEntity(tech);
    }
  }

  // 5. Ecosystem & Collaboration Products
  const ecosystemEntities = [
    '飞书', '企业微信', '钉钉', '微信小程序', '小程序', '微信公众号', '公众号', '支付宝'
  ];
  for (const eco of ecosystemEntities) {
    if (text.includes(eco)) {
      addEntity(eco);
    }
  }

  // 6. Chinese System / Platform / Center / Middleware Nouns
  // e.g. 工单系统, 客服系统, 财务系统, 风控系统, 支付系统, 结算系统, 资产管理系统, 用户中心, 业务中台
  const cnSysRegex = /([\u4e00-\u9fa5]{2,8}(?:系统|平台|中台|服务|中心|模块|引擎|网关|后台|前台|底座|组件|流水线|数据库|数据仓库|应用|客户端|小程序|官网|门户|知识库|开放平台))/g;
  let cnMatch;
  while ((cnMatch = cnSysRegex.exec(text)) !== null) {
    addEntity(cnMatch[1]);
  }

  // 7. Projects, Campaigns and Initiatives
  // e.g. 星火计划, 618大促, 双11, 架构重构, 双活迁移
  const projectRegex = /([\u4e00-\u9fa5a-zA-Z0-9]{2,8}(?:项目|计划|重构|迁移|专项|大促|版本|迭代))/g;
  let pMatch;
  while ((pMatch = projectRegex.exec(text)) !== null) {
    addEntity(pMatch[1]);
  }

  // Deduplicate: if an entity is substring of a longer entity (e.g. 'K8s' vs 'K8s集群', or '小程序' vs '微信小程序'), keep the longer more specific entity
  const filtered = entities.filter(ent => {
    return !entities.some(other => other !== ent && other.includes(ent));
  });

  return filtered.slice(0, 3);
}

/**
 * Extract 1-2 prominent domain nouns / action phrases from raw input to serve as candidate tags.
 */
export function extractDomainKeywords(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .replace(/(今天|明天|后天|大后天|昨晚|昨天|前天|上午|下午|晚上|早晨|早上|中午|夜里|这周|本周|下周|周[一二三四五六日天1-7]|\d+点|\d+分|点前|半前|分前|之后|之前|月底|月初|年中|年底)/g, '')
    .replace(/(要和|要跟|要去|要给|要与|要同|要对|要把|要向|要|和|跟|与|同(?!步|意|事|学|样|类|行)|给|对|把|向|从|在|让|去|帮|需(?!求)|想要|打算|准备|负责|协助|安排|进行|推进|落实|完成|做好|搞定|处理|搞好|弄好|请|一起|共同|一下|一次|一番|这件|这个|那个|相关|等等|以及|还有|一个|一份|一项)/g, '')
    .trim();

  const domainPatterns = [
    /(数据同步|接口联调|慢SQL|死锁|性能优化|熔断降级|鉴权认证|黑名单|告警排查|报表导出|凭证核对|用例编写|灰度发布|容灾演练|对账单|漏洞修复|跨域配置|证书更新|网络抖动|集群扩容|备份恢复|权限配置|审批流|单点登录|打卡考勤|结算流程|购物车|组织架构|需求评审|方案设计|架构设计|代码审查|发版跟进|业务复盘|转正答辩|绩效面谈|架构评审|技术选型|采购审批|财务报销)/,
    /(支付|订单|网关|中台|供应链|结算|机房|服务器|云资源|预算|用例|架构|合同|发票|论文|体检|机票|疫苗|租房|财报|专利)(改造|评审|排查|重构|申报|采购|迁移|比价|审批|测试|核算|检查|预订|同步|对接|接种|缴纳|编写|申请)?/,
    /(方案|报告|调研|规划|复盘|总结|分享|面试|答辩|汇报)([a-zA-Z\u4e00-\u9fa5]{2,4})?/
  ];

  const results: string[] = [];
  for (const pat of domainPatterns) {
    const match = cleaned.match(pat);
    if (match && match[0] && match[0].length >= 2) {
      if (!results.includes(match[0])) {
        results.push(match[0]);
      }
    }
  }

  return results.slice(0, 2);
}

export interface EvolvingTag {
  name: string;
  usageCount: number;
  lastUsedAt: number;
  origin: 'user_created' | 'jev_minted' | 'seed';
}

/**
 * Personal Evolving Tag Ledger:
 * Automatically mints, tracks, ranks, and converges user personal tags over time
 * without requiring manual configuration or cold-start static dictionaries.
 */
export class PersonalTagLedger {
  private tags: Map<string, EvolvingTag> = new Map();

  constructor(initialTags?: (string | EvolvingTag)[]) {
    if (Array.isArray(initialTags)) {
      for (const t of initialTags) {
        if (typeof t === 'string') {
          this.recordTagUsage(t, 'seed');
        } else if (t && t.name) {
          this.tags.set(t.name, { ...t });
        }
      }
    }
  }

  recordTagUsage(name: string, origin: 'user_created' | 'jev_minted' | 'seed' = 'jev_minted'): string {
    const clean = name.trim().replace(/^#/, '');
    if (!clean || clean.length < 2 || clean.length > 15 || clean === '常规待办') return clean;

    // Fuzzy deduplication / canonicalization (e.g. CRM vs CRM系统)
    const targetKey = this.findCanonicalKey(clean) || clean;

    const existing = this.tags.get(targetKey);
    if (existing) {
      existing.usageCount += 1;
      existing.lastUsedAt = Date.now();
    } else {
      this.tags.set(targetKey, {
        name: targetKey,
        usageCount: 1,
        lastUsedAt: Date.now(),
        origin
      });
    }
    return targetKey;
  }

  private findCanonicalKey(candidate: string): string | null {
    if (this.tags.has(candidate)) return candidate;
    for (const key of this.tags.keys()) {
      if (key === `${candidate}系统` || candidate === `${key}系统`) {
        return key.length >= candidate.length ? key : candidate;
      }
    }
    return null;
  }

  getTopCandidates(inputText: string, maxLimit = 8): string[] {
    const entries = Array.from(this.tags.values());
    if (entries.length === 0) return [];

    const scored = entries.map(item => {
      let score = item.usageCount * 10;
      if (inputText && inputText.includes(item.name)) {
        score += 1000; // Directly mentioned in current text
      }
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxLimit).map(s => s.item.name);
  }

  getAllTags(): EvolvingTag[] {
    return Array.from(this.tags.values()).sort((a, b) => b.usageCount - a.usageCount);
  }

  getStats(): { totalTags: number; totalUsages: number; topTags: string[] } {
    const all = this.getAllTags();
    const totalUsages = all.reduce((sum, t) => sum + t.usageCount, 0);
    return {
      totalTags: all.length,
      totalUsages,
      topTags: all.slice(0, 8).map(t => `${t.name}(${t.usageCount})`)
    };
  }

  clear(): void {
    this.tags.clear();
  }
}

export const globalTagLedger = new PersonalTagLedger();

/**
 * Compose dynamic matter_tag criteria merging user tag ledger,
 * pre-extracted subject entities, domain keywords, and baseline fallbacks.
 */
export function buildDynamicTagCriteria(
  userTags?: string[],
  text: string = '',
  ledger: PersonalTagLedger = globalTagLedger
): Record<string, string> {
  const criteria: Record<string, string> = {};

  // 1. High-frequency / relevant tags from user's evolving ledger (up to 6)
  const ledgerTop = ledger.getTopCandidates(text, 6);
  for (const tag of ledgerTop) {
    if (!criteria[tag]) {
      criteria[tag] = `【常用业务标签】个人标签库已沉淀业务分类：与「${tag}」相关的日常工作、交付或技术事项`;
    }
  }

  // 2. Core Subject / System Entities dynamically mined from current text (Highest Priority)
  const subjectEntities = extractSubjectEntities(text);
  for (const ent of subjectEntities) {
    if (!criteria[ent] && Object.keys(criteria).length < 10) {
      const isKnown = ledgerTop.includes(ent);
      criteria[ent] = isKnown
        ? `【主体系统】已沉淀的核心主体系统「${ent}」相关事项`
        : `【新立主体候选】识别到文本中的新主体「${ent}」，若具备独立归档与业务价值请优先选取`;
    }
  }

  // 3. Explicit user-specific custom tags passed in request
  if (Array.isArray(userTags)) {
    for (const tag of userTags) {
      if (typeof tag === 'string') {
        const clean = tag.trim().replace(/^#/, '');
        if (clean && clean.length >= 2 && !criteria[clean] && Object.keys(criteria).length < 12) {
          criteria[clean] = `【自定义标签】与「${clean}」相关的日常工作或交付事项`;
        }
      }
    }
  }

  // 4. Domain Action Keywords extracted from current text
  const domainKws = extractDomainKeywords(text);
  for (const kw of domainKws) {
    if (!criteria[kw] && Object.keys(criteria).length < 13) {
      criteria[kw] = `【业务动作】与「${kw}」相关的具体业务动作、技术实现或执行事务`;
    }
  }

  // 5. Minimal general baseline categories (kept lean, max 3)
  const baselineCategories: Record<string, string> = {
    '技术方案': '系统架构设计、技术方案撰写、技术选型与评审',
    '生活琐事': '日常超市购物、生鲜买菜、生活缴费、家务打理',
    '常规待办': '其他未明确归类的常规工作或日常琐碎事项'
  };

  for (const [tag, desc] of Object.entries(baselineCategories)) {
    if (!criteria[tag] && Object.keys(criteria).length < 14) {
      criteria[tag] = desc;
    }
  }

  return criteria;
}

/**
 * Builds schedule context and dynamic target_hour criteria that marks conflicts and highlights free windows.
 */
export function buildScheduleContextAndHourCriteria(
  todayTasks?: ScheduledTaskSummary[],
  rawText: string = '',
  referenceDate: Date = new Date()
): {
  enrichedState: string;
  targetHourCriteria: Record<string, string>;
  freeWindowSummary: string;
} {
  const now = referenceDate || new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const nowStr = `${pad(currentHour)}:${pad(currentMinute)}`;

  // Parse occupied intervals for today
  const occupiedSlots: { startMin: number; endMin: number; title: string; label: string }[] = [];

  if (Array.isArray(todayTasks)) {
    for (const task of todayTasks) {
      if (!task || !task.title) continue;

      let startH: number | null = null;
      let startM = 0;

      // Extract hour from dueTimestamp or dueDateIso or dueDate string
      if (task.dueTimestamp) {
        const d = new Date(task.dueTimestamp);
        // Only if same day
        if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
          startH = d.getHours();
          startM = d.getMinutes();
        }
      } else if (task.dueDateIso) {
        const d = new Date(task.dueDateIso);
        if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
          startH = d.getHours();
          startM = d.getMinutes();
        }
      } else if (task.dueDate && task.dueDate.includes(':')) {
        const match = /(\d{1,2})[:：](\d{2})/.exec(task.dueDate);
        if (match) {
          startH = parseInt(match[1], 10);
          startM = parseInt(match[2], 10);
        }
      }

      if (startH !== null) {
        const duration = task.durationMinutes || 45;
        const startTotalMin = startH * 60 + startM;
        const endTotalMin = startTotalMin + duration;
        const endH = Math.floor(endTotalMin / 60);
        const endM = endTotalMin % 60;
        const label = `${pad(startH)}:${pad(startM)} - ${pad(endH)}:${pad(endM)}`;

        occupiedSlots.push({
          startMin: startTotalMin,
          endMin: endTotalMin,
          title: task.title,
          label
        });
      }
    }
  }

  // Sort occupied slots by start time
  occupiedSlots.sort((a, b) => a.startMin - b.startMin);

  // Compute free windows between 09:00 and 21:00
  const workDayStartMin = Math.max(9 * 60, currentHour * 60 + currentMinute); // from now or 9am
  const workDayEndMin = 21 * 60; // 21:00

  const freeWindows: string[] = [];
  let pointerMin = workDayStartMin;

  for (const slot of occupiedSlots) {
    if (slot.endMin <= pointerMin) continue;
    if (slot.startMin > pointerMin + 20) {
      // Free window before this slot
      const wStartH = Math.floor(pointerMin / 60);
      const wStartM = pointerMin % 60;
      const wEndH = Math.floor(slot.startMin / 60);
      const wEndM = slot.startMin % 60;
      freeWindows.push(`${pad(wStartH)}:${pad(wStartM)} - ${pad(wEndH)}:${pad(wEndM)}`);
    }
    pointerMin = Math.max(pointerMin, slot.endMin);
  }

  if (pointerMin < workDayEndMin) {
    const wStartH = Math.floor(pointerMin / 60);
    const wStartM = pointerMin % 60;
    freeWindows.push(`${pad(wStartH)}:${pad(wStartM)} - 21:00`);
  }

  const freeWindowSummary = freeWindows.length > 0 ? freeWindows.join('、') : '今日暂无充裕空闲';

  // Build target_hour criteria with conflict badges
  const targetHourCriteria: Record<string, string> = {};
  const standardHours = [
    { hour: 9, key: '09:00' },
    { hour: 10, key: '10:00' },
    { hour: 11, key: '11:00' },
    { hour: 14, key: '14:00' },
    { hour: 15, key: '15:00' },
    { hour: 16, key: '16:00' },
    { hour: 17, key: '17:00' },
    { hour: 18, key: '18:00' },
    { hour: 20, key: '20:00' },
    { hour: 21, key: '21:00' }
  ];

  let firstFreeWindowKey: string | null = null;

  for (const item of standardHours) {
    const slotMin = item.hour * 60;

    // 1. Is it in the past?
    if (item.hour < currentHour || (item.hour === currentHour && currentMinute > 25)) {
      targetHourCriteria[item.key] = `${item.key} (已过时，非推荐)`;
      continue;
    }

    // 2. Is it occupied by an existing task?
    const conflict = occupiedSlots.find(s => slotMin >= s.startMin && slotMin < s.endMin);
    if (conflict) {
      targetHourCriteria[item.key] = `${item.key} (已被「${conflict.title.slice(0, 10)}」占用，冲突)`;
      continue;
    }

    // 3. It is free!
    if (!firstFreeWindowKey) {
      firstFreeWindowKey = item.key;
      targetHourCriteria[item.key] = `${item.key} (首个充裕可用空闲窗口，强烈推荐优先排程)`;
    } else {
      targetHourCriteria[item.key] = `${item.key} (空闲时段，推荐排程)`;
    }
  }

  targetHourCriteria['未指定具体点钟'] = '全天任意时刻灵活处理，无需固定特定钟点';

  // Compose enriched state string
  let enrichedState = rawText;
  if (occupiedSlots.length > 0) {
    const occupiedLines = occupiedSlots.map(s => `- ${s.label} [已占用] ${s.title}`).join('\n');
    enrichedState = `【当前时间基准】${now.toLocaleDateString('zh-CN')} ${nowStr}\n【今日已有日程与占用】\n${occupiedLines}\n【今日可用空闲时段】\n${freeWindowSummary}\n\n【待排程新任务】\n用户输入: "${rawText}"`;
  }

  return {
    enrichedState,
    targetHourCriteria,
    freeWindowSummary
  };
}

/**
 * Extract clean task title candidates from raw input text by stripping tags,
 * temporal expressions, and conversational filler prefixes.
 * Returns criteria for Jev choice primitive and a high-confidence defaultTitle.
 */
export function buildDynamicTitleCriteria(rawText: string): {
  criteria: Record<string, string>;
  defaultTitle: string;
} {
  if (!rawText || !rawText.trim()) {
    return {
      criteria: { '待办事项': '默认常规待办事项' },
      defaultTitle: '待办事项'
    };
  }

  // 1. Remove hashtags
  let clean = rawText.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim();

  // 2. Remove standard date and time stamps
  clean = clean
    // Calendar dates e.g. 2026-09-24, 2026年9月24日, 9/24, 9月24日
    .replace(/(?:\d{4}[-/年.])?\d{1,2}[-/月.]\d{1,2}(?:日|号)?/g, '')
    // Relative day words
    .replace(/(?:大前天|前天|昨天|昨日|昨晚|昨早|今天|今日|今晚|今早|明天|明日|明早|明晚|后天|大后天)/g, '')
    // Weeks e.g. 这周五, 下周一, 周末, 礼拜天, 星期三
    .replace(/(?:这|本|下|上|这个|下个|上个)?(?:周|星期|礼拜)[一二三四五六日天1-7]/g, '')
    .replace(/(?:这周|本周|下周|上周|这星期|下星期|上星期|周末|工作日|平时|随时)/g, '')
    // Month/Year intervals
    .replace(/(?:下个月|下半年|今年|明年|年底|年初|月初|月底|未来|长期)/g, '')
    // Clock times e.g. 15:30, 3点半, 8点, 晚上8点, 下午3点45分
    .replace(/(?:上午|早晨|早上|清晨|中午|下午|傍晚|晚上|夜里|半夜|凌晨)?\s*(?:\d{1,2}|十一|十二|[一二两三四五六七八九十])\s*(?:点|:|：)\s*(?:\d{1,2}|半|一刻|三刻)?(?:分)?/g, '')
    .replace(/(?:上午|早晨|早上|清晨|中午|下午|傍晚|晚上|夜里|半夜|凌晨)/g, '')
    .replace(/\b\d{1,2}[:：]\d{2}\b/g, '')
    // Temporal prepositions / suffixes e.g. 之前, 之前要, 左右, 截至, 截止, 开始
    .replace(/(?:之前|前|之后|后|左右|截至|截止|开始|前要|后要)/g, '')
    // English temporal phrases
    .replace(/\b(?:today|tomorrow|yesterday|tonight|next week|this week|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?|before \d{1,2}(?::\d{2})?)\b/gi, '')
    .trim();

  // 3. Iteratively remove conversational filler prefixes, punctuation and reminder boilerplates
  let prevClean = '';
  while (prevClean !== clean) {
    prevClean = clean;
    clean = clean
      .replace(/^(?:随时|记得要|记得|别忘了|别忘记|请记得|一定要|务必|必须|提醒我|提醒一下|提醒|帮我|请帮我|麻烦|请|想要|想去|打算|准备要|计划|需要|快去|帮|去)\s*/, '')
      .replace(/^[，,。：:\s\-_/、]+|[，,。：:\s\-_/、]+$/g, '')
      .trim();
  }

  // If cleaning resulted in empty string, fallback to original stripped of tags
  const fallback = rawText.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim() || '待办事项';
  const primaryTitle = clean.length >= 2 ? clean : fallback;

  const candidates: string[] = [primaryTitle];

  // 4. Generate intelligent concise variants
  // Variant A: If contains location clause e.g. "在[某地]开会" -> generate variant without location
  const locMatch = primaryTitle.match(/^(.*?)(?:在[\u4e00-\u9fa5\w]{2,8}(?:咖啡厅|会议室|办公室|公司|食堂|家|店|馆|场|室|处|中心|楼))+(.*)$/);
  if (locMatch && locMatch[1] !== undefined && locMatch[2] !== undefined) {
    const withoutLoc = `${locMatch[1]}${locMatch[2]}`.replace(/[，,。：:\s\-_/、]+/g, ' ').trim();
    if (withoutLoc.length >= 2 && !candidates.includes(withoutLoc)) {
      candidates.push(withoutLoc);
    }
  }

  // Variant B: If contains "把/将...发给/同步给..." -> generate concise action variant e.g. "发送502排查报告给李经理"
  const sendMatch = primaryTitle.match(/^(?:把|将)(.+?)(?:发给|同步给|提交给|抄送给|发送给|递交给|给)(.+)$/);
  if (sendMatch && sendMatch[1].trim() && sendMatch[2].trim()) {
    const sendVariant = `发送${sendMatch[1].trim()}给${sendMatch[2].trim()}`;
    if (!candidates.includes(sendVariant)) {
      candidates.push(sendVariant);
    }
  }

  // Variant C: If action verb + topic is present e.g. "开会讨论Q4预算" vs "讨论Q4预算"
  const topicMatch = primaryTitle.match(/(?:开会|沟通|交流|同步|探讨|汇报)(?:讨论|评审|确定|确认|推进)?([\u4e00-\u9fa5\w-]{3,12})/);
  if (topicMatch && topicMatch[0] && topicMatch[0].length >= 4 && !candidates.includes(topicMatch[0])) {
    candidates.push(topicMatch[0]);
  }

  // Variant D: Fallback original stripped of hashtags if distinct
  if (fallback !== primaryTitle && !candidates.includes(fallback) && candidates.length < 4) {
    candidates.push(fallback);
  }

  // Build criteria map for Jev
  const criteria: Record<string, string> = {};
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (i === 0) {
      criteria[c] = `推荐核心标题：准确完整表达核心动作、参与人与目标事项`;
    } else if (i === 1) {
      criteria[c] = `凝练标题：精简修饰词与冗余环境信息，聚焦核心任务事件`;
    } else if (i === 2) {
      criteria[c] = `聚焦行动：突出核心议题或执行目标`;
    } else {
      criteria[c] = `备用标题：保留更多上下文信息的备选事项名称`;
    }
  }

  return {
    criteria,
    defaultTitle: primaryTitle
  };
}

