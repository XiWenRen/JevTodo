/**
 * Jev Decision Model & Natural Language Parsing Utilities
 * Powered by TypeSafe Jev Decision Logic & Vercel AI Gateway
 */

import { TaskCategory, TaskPriority, JevDecision, TaskItem, JevCleanupItem, JevDuplicateCheckResult } from '../types';

const CHINESE_NUM_MAP: Record<string, number> = {
  '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12
};

export function parseChineseOrArabicHour(str: string): number | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (CHINESE_NUM_MAP[trimmed] !== undefined) {
    return CHINESE_NUM_MAP[trimmed];
  }
  return null;
}

/**
 * Matches hour and minute from strings supporting both Arabic digits and Chinese numerals
 * e.g. 下午3点, 下午三点, 16:00, 早上8点半, 晚上八点, 4点
 */
export const matchHoursMins = (str: string): { hour: number; minute: number } | null => {
  // 1. pm patterns: 下午3点, 下午三点, 晚上8点半, 晚上八点, 傍晚5点, 下午3:30, 昨晚8点, 今晚9点, 3pm
  const pmMatch = /(?:下午|晚上|夜里|傍晚|昨晚|今晚|明晚|pm)\s*(\d{1,2}|十一|十二|[一二两三四五六七八九十])\s*(?:点|:|：)?\s*(\d{1,2}|半|一刻|三刻)?/i.exec(str);
  if (pmMatch) {
    let h = parseChineseOrArabicHour(pmMatch[1]);
    if (h !== null) {
      if (h < 12) h += 12;
      let m = 0;
      if (pmMatch[2] === '半') m = 30;
      else if (pmMatch[2] === '一刻') m = 15;
      else if (pmMatch[2] === '三刻') m = 45;
      else if (pmMatch[2]) m = parseInt(pmMatch[2], 10) || 0;
      return { hour: h, minute: m };
    }
  }

  // 2. am patterns: 上午9点, 上午九点, 早上8点半, 早晨七点, 清晨6点, 昨早8点, 今早9点, am
  const amMatch = /(?:上午|早晨|早上|清晨|昨早|今早|明早|am)\s*(\d{1,2}|十一|十二|[一二两三四五六七八九十])\s*(?:点|:|：)?\s*(\d{1,2}|半|一刻|三刻)?/i.exec(str);
  if (amMatch) {
    let h = parseChineseOrArabicHour(amMatch[1]);
    if (h !== null) {
      if (h === 12) h = 0;
      let m = 0;
      if (amMatch[2] === '半') m = 30;
      else if (amMatch[2] === '一刻') m = 15;
      else if (amMatch[2] === '三刻') m = 45;
      else if (amMatch[2]) m = parseInt(amMatch[2], 10) || 0;
      return { hour: h, minute: m };
    }
  }

  // 3. Noon: 中午12点, 中午十二点, 中午1点
  const noonMatch = /中午\s*(\d{1,2}|十一|十二|[一二两三四五六七八九十])\s*(?:点|:|：)?\s*(\d{1,2}|半)?/i.exec(str);
  if (noonMatch) {
    let h = parseChineseOrArabicHour(noonMatch[1]);
    if (h !== null) {
      if (h === 1 || h === 2) h += 12;
      const m = noonMatch[2] === '半' ? 30 : noonMatch[2] ? parseInt(noonMatch[2], 10) || 0 : 0;
      return { hour: h, minute: m };
    }
  }

  // 4. Standard colon time: 14:00, 9:30, 15：30
  const standardTime = /(\d{1,2})[:：](\d{2})/.exec(str);
  if (standardTime) {
    return { hour: parseInt(standardTime[1], 10), minute: parseInt(standardTime[2], 10) };
  }

  // 5. Plain oclock: 4点, 四点, 3点半, 三点半
  const oclockMatch = /(\d{1,2}|十一|十二|[一二两三四五六七八九十])点(半|一刻|三刻)?/.exec(str);
  if (oclockMatch) {
    const h = parseChineseOrArabicHour(oclockMatch[1]);
    if (h !== null) {
      let m = 0;
      if (oclockMatch[2] === '半') m = 30;
      else if (oclockMatch[2] === '一刻') m = 15;
      else if (oclockMatch[2] === '三刻') m = 45;
      return { hour: h, minute: m };
    }
  }

  return null;
};

/**
 * Natural language date/time parser for Chinese and standard inputs
 */
export function extractDateTime(input: string): { dueDate?: string; dueDateIso?: string; cleanTitle: string } {
  const now = new Date();
  let targetDate = new Date();
  let hasDate = false;
  let cleanTitle = input;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const timeInfo = matchHoursMins(input);
  const defaultHour = timeInfo ? timeInfo.hour : 18;
  const defaultMin = timeInfo ? timeInfo.minute : 0;

  if (/(今天|今晚|今日)/.test(input)) {
    hasDate = true;
    targetDate.setHours(defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(今天|今晚|今日)/g, '');
  } else if (/(明天|明早|明晚)/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(timeInfo ? timeInfo.hour : 10, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(明天|明早|明晚)/g, '');
  } else if (/后天/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() + 2);
    targetDate.setHours(defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/后天/g, '');
  } else if (/(昨天|昨日|昨晚|昨早)/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() - 1);
    targetDate.setHours(timeInfo ? timeInfo.hour : 10, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(昨天|昨日|昨晚|昨早)/g, '');
  } else if (/大前天/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() - 3);
    targetDate.setHours(timeInfo ? timeInfo.hour : 10, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/大前天/g, '');
  } else if (/(前天|前日|前晚)/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() - 2);
    targetDate.setHours(timeInfo ? timeInfo.hour : 10, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(前天|前日|前晚)/g, '');
  } else if (/(?:上周|上星期)([一二三四五六日天1-7])/.test(input)) {
    hasDate = true;
    const dayMap: Record<string, number> = {
      '一': 1, '1': 1, '二': 2, '2': 2, '三': 3, '3': 3,
      '四': 4, '4': 4, '五': 5, '5': 5, '六': 6, '6': 6,
      '日': 0, '天': 0, '7': 0
    };
    const dayMatch = /(?:上周|上星期)([一二三四五六日天1-7])/.exec(input);
    if (dayMatch && dayMap[dayMatch[1]] !== undefined) {
      const targetDay = dayMap[dayMatch[1]];
      const currentDay = now.getDay();
      let diff = currentDay - targetDay;
      if (diff <= 0) diff += 7;
      targetDate.setDate(now.getDate() - diff);
      targetDate.setHours(defaultHour, defaultMin, 0, 0);
    }
    cleanTitle = cleanTitle.replace(/(?:上周|上星期)[一二三四五六日天1-7]/g, '');
  } else if (/(这周|本周|周|星期)([一二三四五六日天1-7])/.test(input)) {
    hasDate = true;
    const dayMap: Record<string, number> = {
      '一': 1, '1': 1, '二': 2, '2': 2, '三': 3, '3': 3,
      '四': 4, '4': 4, '五': 5, '5': 5, '六': 6, '6': 6,
      '日': 0, '天': 0, '7': 0
    };
    const dayMatch = /(?:这周|本周|周|星期)([一二三四五六日天1-7])/.exec(input);
    if (dayMatch && dayMap[dayMatch[1]] !== undefined) {
      const targetDay = dayMap[dayMatch[1]];
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      targetDate.setDate(now.getDate() + diff);
      targetDate.setHours(defaultHour, defaultMin, 0, 0);
    }
    cleanTitle = cleanTitle.replace(/(这周|本周|周|星期)[一二三四五六日天1-7]/g, '');
  } else if (/下周([一二三四五六日天1-7])/.test(input)) {
    hasDate = true;
    const dayMap: Record<string, number> = {
      '一': 1, '1': 1, '二': 2, '2': 2, '三': 3, '3': 3,
      '四': 4, '4': 4, '五': 5, '5': 5, '六': 6, '6': 6,
      '日': 0, '天': 0, '7': 0
    };
    const dayMatch = /下周([一二三四五六日天1-7])/.exec(input);
    if (dayMatch && dayMap[dayMatch[1]] !== undefined) {
      const targetDay = dayMap[dayMatch[1]];
      const currentDay = now.getDay();
      let diff = targetDay - currentDay + 7;
      targetDate.setDate(now.getDate() + diff);
      targetDate.setHours(defaultHour, defaultMin, 0, 0);
    }
    cleanTitle = cleanTitle.replace(/下周[一二三四五六日天1-7]/g, '');
  } else if (/(\d+)小时后/.test(input)) {
    hasDate = true;
    const hours = parseInt(/(\d+)小时后/.exec(input)![1], 10);
    targetDate = new Date(now.getTime() + hours * 3600 * 1000);
    cleanTitle = cleanTitle.replace(/\d+小时后/g, '');
  } else if (/(\d+)天后/.test(input)) {
    hasDate = true;
    const days = parseInt(/(\d+)天后/.exec(input)![1], 10);
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/\d+天后/g, '');
  } else if (/下个月/.test(input)) {
    hasDate = true;
    targetDate.setMonth(targetDate.getMonth() + 1);
    cleanTitle = cleanTitle.replace(/下个月/g, '');
  } else if (/下半年/.test(input)) {
    hasDate = true;
    targetDate.setMonth(targetDate.getMonth() + 6);
    cleanTitle = cleanTitle.replace(/下半年/g, '');
  } else if (timeInfo) {
    // If only specific time is provided without day (e.g. 15:00 or 下午3点) -> assume today if not passed, else tomorrow
    hasDate = true;
    targetDate.setHours(timeInfo.hour, timeInfo.minute, 0, 0);
    if (targetDate.getTime() < now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1); // Next occurrence
    }
  }

  // Remove the matched time substring from title if exists
  cleanTitle = cleanTitle
    .replace(/(?:下午|晚上|夜里|傍晚|上午|早晨|早上|清晨|中午)?\s*(?:\d{1,2}|十一|十二|[一二两三四五六七八九十])\s*(?:点|:|：)?\s*(?:\d{1,2}|半|一刻|三刻)?(?:分)?/g, '')
    .trim();

  if (!hasDate) {
    return { cleanTitle: input.trim() };
  }

  const y = targetDate.getFullYear();
  const m = pad(targetDate.getMonth() + 1);
  const d = pad(targetDate.getDate());
  const hh = pad(targetDate.getHours());
  const mm = pad(targetDate.getMinutes());

  const isToday = targetDate.toDateString() === now.toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = targetDate.toDateString() === yesterday.toDateString();

  const beforeYesterday = new Date();
  beforeYesterday.setDate(now.getDate() - 2);
  const isBeforeYesterday = targetDate.toDateString() === beforeYesterday.toDateString();

  let humanDueDate = '';
  if (isToday) {
    humanDueDate = `今天 ${hh}:${mm}`;
  } else if (isTomorrow) {
    humanDueDate = `明天 ${hh}:${mm}`;
  } else if (isYesterday) {
    humanDueDate = `昨天 ${hh}:${mm}`;
  } else if (isBeforeYesterday) {
    humanDueDate = `前天 ${hh}:${mm}`;
  } else {
    humanDueDate = `${m}-${d} ${hh}:${mm}`;
  }

  return {
    dueDate: humanDueDate,
    dueDateIso: `${y}-${m}-${d}T${hh}:${mm}:00`,
    cleanTitle: cleanTitle.length > 0 ? cleanTitle : input.trim()
  };
}

/**
 * Extract flomo-style tags from input or automatically infer relevant tags
 */
export function extractFlomoTags(input: string): { tags: string[]; remainingText: string } {
  const explicitTags: string[] = [];
  // Match #tag or #工作
  const tagRegex = /#([\u4e00-\u9fa5\w-]+)/g;
  let match;
  let remainingText = input;

  while ((match = tagRegex.exec(input)) !== null) {
    if (!explicitTags.includes(match[1])) {
      explicitTags.push(match[1]);
    }
  }

  // Clean explicit tags from text
  remainingText = remainingText.replace(tagRegex, '').trim();

  // If user provided explicit tags, keep them
  const inferredTags = [...explicitTags];

  // Auto-infer semantic category tags (flomo style)
  const lower = input.toLowerCase();

  const rules: Array<{ keywords: string[]; tag: string }> = [
    { keywords: ['运维', '服务器', 'cpu', '宕机', '告警', '报警', '502', '机房', '迁移', '割接', '专线', '双活', '备份', '集群', 'nginx', 'ssl', '证书', '生产环境', '生产'], tag: '运维' },
    { keywords: ['测试', '用例', '测试用例', 'qa', '缺陷', '冒烟', '压测', '回归', 'bug'], tag: '测试' },
    { keywords: ['需求', 'prd', '需求评审', '原型', '功能清单', '业务方'], tag: '需求' },
    { keywords: ['代码', '开发', '研发', '重构', '发版', '上线', '分支', 'cr', 'review', 'api', '前端', '后端', 'git', '架构'], tag: '研发' },
    { keywords: ['预算', '申报', '预算申报', '成本', '财年', '资金', '审批预算', '采购预算'], tag: '预算' },
    { keywords: ['采购', '采购申请', '服务器采购', '询价', '比价', '供应商', '合同', '硬件采购', '商务'], tag: '采购' },
    { keywords: ['立项', '立项申请', '可行性', '答辩', '项目启动', '立项书', '方案汇报'], tag: '立项' },
    { keywords: ['人员', '人员管理', '招聘', '面试', '1on1', '绩效', '转正', '团建', '交接', '排期', '资源协调', '人事'], tag: '团队' },
    { keywords: ['项目', '项目进度', '进度', '里程碑', '周报', '站会', '风险', '卡点', '交付', '延期', '燃尽图', '管理'], tag: '项目' },
    { keywords: ['机房迁移', '双活迁移', '跨机房', '灾备迁移'], tag: '机房迁移' },
    { keywords: ['开会', '会议', '汇报', '方案', '评审', '客户', '合同', '周报', '产品', '发票', '财报'], tag: '工作' },
    { keywords: ['学习', '阅读', '读书', '背单词', '英语', '课程', '练习', '论文', '笔记', '复习', '考试'], tag: '学习' },
    { keywords: ['买', '超市', '购物', '缴纳', '水电', '打扫', '寄快递', '取快递', '充值', '做饭', '洗衣服'], tag: '生活' },
    { keywords: ['体检', '医院', '吃药', '看病', '挂号', '药店', '牙医', '检查', '就医'], tag: '健康' },
    { keywords: ['跑步', '健身', '瑜伽', '散步', '运动', '骑行', '游泳', '打球', '暴汗'], tag: '运动' },
    { keywords: ['聚餐', '聚会', '约饭', '看电影', '生日', '送礼', '聊天', '约会'], tag: '社交' },
    { keywords: ['账单', '报销', '还款', '转账', '理财', '投资', '记账'], tag: '财务' },
    { keywords: ['机票', '酒店', '旅行', '车票', '高铁', '出差', '攻略'], tag: '出行' }
  ];

  for (const rule of rules) {
    if (inferredTags.length >= 3) break;
    if (rule.keywords.some(k => lower.includes(k)) && !inferredTags.includes(rule.tag)) {
      inferredTags.push(rule.tag);
    }
  }

  if (inferredTags.length === 0) {
    inferredTags.push('待办');
  }

  return {
    tags: inferredTags,
    remainingText: remainingText.length > 0 ? remainingText : input
  };
}

/**
 * Calibrated Jev Decision Engine
 * When Jev API key is configured, queries Vercel AI Gateway / TypeSafe Jev model.
 * Otherwise, uses high-speed local decision matching to provide instant responses.
 */
export async function evaluateWithJev(
  rawInput: string,
  options?: { apiKey?: string; endpoint?: string }
): Promise<JevDecision> {
  const { dueDate, dueDateIso, cleanTitle } = extractDateTime(rawInput);
  const { tags, remainingText } = extractFlomoTags(cleanTitle);

  // If user provided an API key, call the backend /api/jev/evaluate endpoint
  if (options?.apiKey) {
    try {
      const res = await fetch('/api/jev/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawInput,
          apiKey: options.apiKey,
          endpoint: options.endpoint
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.category) {
          return {
            category: data.category,
            priority: data.priority || 'P1',
            urgencyScore: data.urgencyScore ?? 0.8,
            tags: data.tags && data.tags.length > 0 ? data.tags : tags,
            dueDate: data.dueDate || dueDate,
            dueDateIso: data.dueDateIso || dueDateIso,
            confidence: data.confidence ?? 0.94,
            rawJevAnswers: data.rawJevAnswers,
            source: 'jev-api'
          };
        }
      }
    } catch (err) {
      console.warn('Jev API request failed, falling back to local Jev engine:', err);
    }
  }

  // Local Jev Decision Engine (System One decision emulation)
  // Jev evaluates category: '即刻完成' | '近期完成' | '规划待办'
  const text = rawInput.toLowerCase();

  let category: TaskCategory = '近期完成';
  let priority: TaskPriority = 'P2';
  let urgencyScore = 0.5;
  let confidence = 0.92;

  const instantKeywords = ['立刻', '马上', '今天', '紧急', '赶紧', '现在', '急', '今晚', '下班前', '下午', '上午', '尽快', '开会', '抢票', '宕机', '告警', '报警', '502', '卡点', '阻塞', '故障', '冒烟'];
  const plannedKeywords = ['下个月', '明年', '长期', '规划', '学习', '考证', '计划', '买房', '旅行计划', '抽空', '以后', '未来', '有空', '下半年', '架构演进', '长远', '储备', '远期'];
  const highPriorityKeywords = ['紧急', '重要', '严重', '致命', '客户', '合同', '上交', '截止', 'deadline', '扣款', '宕机', '502', '高危', '告警', '报警', 'p0', '生产环境', '故障', '网关告警'];

  const hasFutureDay = /(明天|明早|明晚|后天|这周|本周|下周)/.test(text);
  const isPastDay = /(昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|上周|上星期)/.test(text);
  const isUrgentIncident = /(宕机|502|故障|报警|告警|p0|严重)/.test(text);

  const isInstant = !isPastDay && (!hasFutureDay || isUrgentIncident) && (instantKeywords.some(k => text.includes(k)) || (dueDate && dueDate.includes('今天')));
  const isPlanned = plannedKeywords.some(k => text.includes(k)) || (!dueDate && text.includes('想') && text.length > 10);

  if (isInstant) {
    category = '即刻完成';
    urgencyScore = highPriorityKeywords.some(k => text.includes(k)) ? 0.98 : 0.92;
    priority = highPriorityKeywords.some(k => text.includes(k)) ? 'P0' : 'P1';
    confidence = 0.96;
  } else if (isPlanned) {
    category = '规划待办';
    urgencyScore = 0.25;
    priority = 'P3';
    confidence = 0.91;
  } else {
    category = '近期完成';
    urgencyScore = /(采购|预算|评审|用例|例会|周五|周四|本周)/.test(text) ? 0.72 : 0.65;
    priority = /(紧急|重要|p1)/.test(text) ? 'P1' : 'P2';
    confidence = 0.92;
  }

  return {
    category,
    priority,
    urgencyScore,
    tags,
    dueDate: dueDate || (category === '即刻完成' ? '今天 18:00' : undefined),
    dueDateIso,
    confidence,
    source: 'jev-hybrid-engine'
  };
}

/**
 * Jev Batch Task Re-ranker and Periodic Stale Cleanup Advisor
 */
export function analyzeTasksWithJev(tasks: TaskItem[]): {
  rankedTasks: TaskItem[];
  cleanupList: JevCleanupItem[];
  adviceSummary: string;
  overdueCount: number;
  coreTodayCount: number;
} {
  const now = Date.now();
  const cleanupList: JevCleanupItem[] = [];
  let overdueCount = 0;

  // Clone tasks for evaluation
  const evaluated = tasks.map(task => {
    let stale = false;
    let cleanupSuggested = false;
    let cleanupReason = '';

    // Check overdue
    if (task.dueDateIso) {
      const dueTime = new Date(task.dueDateIso).getTime();
      if (!task.completed && dueTime < now) {
        overdueCount++;
      }
    }

    // Staleness heuristic: uncompleted for > 5 days or created > 7 days ago with low priority
    const ageDays = (now - task.createdAt) / (1000 * 60 * 60 * 24);
    if (!task.completed && ageDays > 5 && task.category === '即刻完成') {
      stale = true;
      cleanupSuggested = true;
      cleanupReason = `已创建 ${Math.floor(ageDays)} 天仍未完成，Jev 建议顺延至近期或归档`;
      cleanupList.push({
        task,
        suggestedAction: 'defer',
        reason: cleanupReason,
        confidence: 0.88
      });
    } else if (!task.completed && ageDays > 14 && task.priority === 'P3') {
      stale = true;
      cleanupSuggested = true;
      cleanupReason = `处于规划中已超 2 周未推进，建议清理或重新激活`;
      cleanupList.push({
        task,
        suggestedAction: 'archive',
        reason: cleanupReason,
        confidence: 0.93
      });
    }

    return {
      ...task,
      isStale: stale,
      cleanupSuggested,
      cleanupReason
    };
  });

  // Priority order mapping
  const priorityWeight: Record<TaskPriority, number> = {
    P0: 4,
    P1: 3,
    P2: 2,
    P3: 1
  };

  const rankedTasks = [...evaluated].sort((a, b) => {
    // Uncompleted first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // High priority first
    const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (pDiff !== 0) return pDiff;
    // Urgency score
    return (b.urgencyScore || 0) - (a.urgencyScore || 0);
  });

  const coreTodayCount = tasks.filter(t => t.category === '即刻完成' && !t.completed).length;

  let adviceSummary = '';
  if (coreTodayCount === 0 && tasks.length > 0) {
    adviceSummary = '今日核心即刻任务已全部清空，状态极佳！可挑选 1-2 项近期事项推进。';
  } else if (overdueCount > 0) {
    adviceSummary = `检测到 ${overdueCount} 项任务已临近或超出预定时间，Jev 建议优先处理并清理停滞事项。`;
  } else if (coreTodayCount > 4) {
    adviceSummary = `今日即刻完成项达 ${coreTodayCount} 件，负荷稍高，Jev 建议聚焦前 3 项核心。`;
  } else {
    adviceSummary = `当前任务节律合理，优先专注 P0/P1 即刻完成事项。`;
  }

  return {
    rankedTasks,
    cleanupList,
    adviceSummary,
    overdueCount,
    coreTodayCount
  };
}

/**
 * Jev Intelligent Batch Task Splitter
 * Automatically parses long input text, multi-line blocks, numbered lists,
 * bullet points, and delimited clauses into individual task candidate strings.
 */
export function splitTasksWithJev(rawInput: string): string[] {
  if (!rawInput || !rawInput.trim()) return [];

  const text = rawInput.trim();

  // 1. First, split by newlines (if multi-line text)
  const lines = text.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);

  const candidates: string[] = [];

  // Patterns that define list item prefixes
  const prefixRegex = /^(?:(?:\d+|[一二三四五六七八九十]+)[\.、\)]|\([0-9]+\)|[①-⑩]|[-•*+])\s*/;

  // Header lines to ignore if they appear alone (e.g. "今日待办清单：", "TODO List:")
  const isHeaderLine = (line: string): boolean => {
    const stripped = line.replace(/[:：]$/, '').trim().toLowerCase();
    const headers = [
      '今日待办', '今日任务', '待办清单', '任务清单', '工作安排', '本周计划', '待办事项', 
      '待办', 'todo', 'todos', 'task list', 'tasks', 'action items', '备忘录', '会议纪要', '事项列表', '工作事项'
    ];
    return headers.includes(stripped) || (line.endsWith('：') && line.length < 8);
  };

  for (const line of lines) {
    if (isHeaderLine(line)) {
      continue;
    }

    // Check if line contains inline numbered lists like: "1. 买牛奶 2. 去取快递 3. 晚上开会"
    const inlineNumberedMatch = line.match(/(?:^|\s+)(?:\d+[\.、\)]|\([0-9]+\)|[①-⑩])\s+/g);
    if (inlineNumberedMatch && inlineNumberedMatch.length >= 2) {
      const parts = line.split(/(?:^|\s+)(?:\d+[\.、\)]|\([0-9]+\)|[①-⑩])\s+/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (part && !isHeaderLine(part)) {
          candidates.push(part);
        }
      }
      continue;
    }

    // Check if line contains semicolons with multiple tasks: "明天下午2点发版；周五前提交周报"
    if (/[;；]/.test(line)) {
      const parts = line.split(/[;；]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts.every(p => p.length >= 3)) {
        for (const part of parts) {
          const clean = part.replace(prefixRegex, '').trim();
          if (clean && !isHeaderLine(clean)) {
            candidates.push(clean);
          }
        }
        continue;
      }
    }

    // Standard line: clean list prefix
    const cleanLine = line.replace(prefixRegex, '').trim();
    if (cleanLine && !isHeaderLine(cleanLine)) {
      candidates.push(cleanLine);
    }
  }

  // If user entered a single sentence with natural language conjunctions like "还有" / "另外"
  if (candidates.length === 1 && candidates[0].length > 25) {
    const single = candidates[0];
    const conjMatch = single.split(/(?:[，,]\s*(?:另外|还有|顺便|并且|以及)|;\s*)/i).map(s => s.trim()).filter(Boolean);
    if (conjMatch.length >= 2 && conjMatch.every(s => s.length >= 4)) {
      return conjMatch;
    }
  }

  return candidates.length > 0 ? candidates : [text];
}

export interface ExtractedTimeFeature {
  hour: number | null; // 0-23
  minute: number | null;
  dayMarker: string | null; // '今天' | '明天' | '后天' | '周一' ...
  hasTimeOrDate: boolean;
}

/**
 * Extracts structured time and date features for semantic conflict checking
 */
export function extractTimeFeature(text: string, dueDate?: string): ExtractedTimeFeature {
  const combined = `${text} ${dueDate || ''}`;
  const hoursMins = matchHoursMins(combined);

  let dayMarker: string | null = null;
  const dayMatch = /(今天|今日|今晚|今早|明天|明早|明晚|昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|后天|这周[一二三四五六日天1-7]|本周[一二三四五六日天1-7]|下周[一二三四五六日天1-7]|上周[一二三四五六日天1-7]|周[一二三四五六日天1-7]|星期[一二三四五六日天1-7])/.exec(combined);
  if (dayMatch) {
    let d = dayMatch[1];
    d = d.replace(/^(这周|本周)/, '周');
    if (d === '今日' || d === '今晚' || d === '今早') d = '今天';
    if (d === '明早' || d === '明晚') d = '明天';
    if (d === '昨日' || d === '昨晚' || d === '昨早') d = '昨天';
    if (d === '前日' || d === '前晚') d = '前天';
    dayMarker = d;
  }

  return {
    hour: hoursMins ? hoursMins.hour : null,
    minute: hoursMins ? hoursMins.minute : null,
    dayMarker,
    hasTimeOrDate: hoursMins !== null || dayMarker !== null
  };
}

/**
 * Normalizes title text by stripping tags, common time phrases (including Chinese numerals), and noise words.
 */
function normalizeForDuplicateCheck(text: string): string {
  let s = text.toLowerCase();
  // Strip tags #...
  s = s.replace(/#[\u4e00-\u9fa5\w-]+/g, '');
  // Strip common time indicators
  s = s.replace(/(今天|今日|今晚|今早|明天|明早|明晚|昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|后天|这周|下周|上周|本周|星期[一二三四五六日天]|周[一二三四五六日天1-7]|上午|下午|晚上|夜里|中午|傍晚|清晨|早晨|早上)/g, '');
  // Strip hour/minute representations (both Arabic numbers and Chinese numerals)
  s = s.replace(/(?:\d{1,2}|十一|十二|[一二两三四五六七八九十])\s*(?:点|:|：)?\s*(?:\d{1,2}|半|一刻|三刻)?(?:分)?/g, '');
  s = s.replace(/\d{1,2}[:：]\d{2}/g, '');
  // Strip common prefix/action filler
  s = s.replace(/^(记得|需要|去|把|要|请|帮忙|准备|尽快|马上|立刻)/g, '');
  // Strip punctuation and whitespace
  s = s.replace(/[\s\-_，。！？!?,.:：;；/\\()[\]（）【】"“”'‘’]/g, '');
  return s.trim();
}

/**
 * Computes character bigram dice similarity (0 to 1)
 */
function computeDiceSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  if (str1.length < 2 || str2.length < 2) {
    return str1 === str2 || str1.includes(str2) || str2.includes(str1) ? 0.8 : 0;
  }

  const getBigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);

  let intersection = 0;
  for (const [bg, count1] of bg1.entries()) {
    const count2 = bg2.get(bg) || 0;
    intersection += Math.min(count1, count2);
  }

  const total = (str1.length - 1) + (str2.length - 1);
  return (2 * intersection) / total;
}

/**
 * High-precision Jev Duplicate Task Detector
 * Evaluates whether a new candidate task is duplicate or semantically overlapping with existing tasks.
 * Strictly respects time differences: tasks at different hours (e.g. 3 PM vs 4 PM) are distinct schedule entries, NOT duplicates.
 */
export function detectDuplicateWithJev(
  newInput: string,
  existingTasks: TaskItem[]
): JevDuplicateCheckResult {
  if (!newInput || !newInput.trim() || existingTasks.length === 0) {
    return { isDuplicate: false, similarity: 0, reason: '' };
  }

  const normNew = normalizeForDuplicateCheck(newInput);
  if (!normNew || normNew.length < 2) {
    return { isDuplicate: false, similarity: 0, reason: '' };
  }

  const featNew = extractTimeFeature(newInput);

  let bestMatch: TaskItem | null = null;
  let highestSim = 0;
  let matchReason = '';

  // Check uncompleted tasks first (most relevant), then completed tasks
  const sortedTasks = [...existingTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  for (const task of sortedTasks) {
    const normExisting = normalizeForDuplicateCheck(task.title || task.rawInput);
    if (!normExisting || normExisting.length < 2) continue;

    const featExisting = extractTimeFeature(task.title || task.rawInput, task.dueDate);

    // 1. Strict Hour / Clock Time Conflict Check:
    // e.g. "下午三点开会" (hour=15) vs "下午4点开会" (hour=16)
    // If BOTH have an explicit hour and the hours are DIFFERENT:
    // They are happening at different times! They are distinct schedule events, NEVER duplicates.
    if (featNew.hour !== null && featExisting.hour !== null && featNew.hour !== featExisting.hour) {
      continue;
    }

    // 2. Strict Day / Date Conflict Check:
    // e.g. "今天开会" vs "明天开会", "周二开会" vs "周四开会"
    // If BOTH have an explicit day marker and they are DIFFERENT:
    // They are scheduled on different days, NEVER duplicates.
    if (featNew.dayMarker && featExisting.dayMarker && featNew.dayMarker !== featExisting.dayMarker) {
      continue;
    }

    // 3. Short Action Safeguard:
    // For very short actions (<= 3 chars, e.g. "开会", "买菜", "体检", "打卡", "跑步", "吃饭"):
    // If one task specifies a time (e.g. 下午4点) and the other task is generic without any time,
    // they should not be falsely treated as duplicates.
    if ((normNew.length <= 3 || normExisting.length <= 3) && (featNew.hasTimeOrDate !== featExisting.hasTimeOrDate)) {
      continue;
    }

    let sim = 0;

    // A. Exact match on normalized string
    if (normNew === normExisting) {
      // If both had explicit same hour (e.g. both 15:00) or neither had time
      sim = 1.0;
    } 
    // B. Substring inclusion
    else if (normNew.includes(normExisting) || normExisting.includes(normNew)) {
      const shorter = Math.min(normNew.length, normExisting.length);
      const longer = Math.max(normNew.length, normExisting.length);
      const ratio = shorter / longer;

      // For very short substrings (e.g. 2 chars like "开会"), avoid triggering high similarity
      // unless there is significant overlap
      if (shorter <= 2) {
        sim = 0.50 * ratio;
      } else if (shorter >= 4) {
        sim = 0.72 + 0.25 * ratio;
      } else {
        sim = 0.60 + 0.25 * ratio;
      }
    } 
    // C. Dice bigram coefficient
    else {
      sim = computeDiceSimilarity(normNew, normExisting);
    }

    // Boost similarity if core domain keywords (flomo tags or domain nouns) strongly match
    const keywords = ['周报', '机房迁移', '预算', '申报', '用例', '测试', '评审', '上线', '体检', '发版', '宕机', '502', '采购', '合同'];
    const hasSharedKeyword = keywords.some(k => normNew.includes(k) && normExisting.includes(k));
    if (hasSharedKeyword && sim >= 0.5) {
      sim = Math.min(1.0, sim + 0.18);
    }

    // Give slight boost to uncompleted active tasks vs completed
    const effectiveSim = task.completed ? sim * 0.9 : sim;

    if (effectiveSim > highestSim) {
      highestSim = effectiveSim;
      bestMatch = task;

      if (sim >= 0.95) {
        matchReason = `与已有待办「${task.title}」内容完全一致`;
      } else if (sim >= 0.8) {
        matchReason = `与已有待办「${task.title}」高度重合（相似度 ${(sim * 100).toFixed(0)}%）`;
      } else {
        matchReason = `与已有待办「${task.title}」疑似重复（相似度 ${(sim * 100).toFixed(0)}%）`;
      }
    }
  }

  // Duplicate threshold: >= 0.72
  const isDuplicate = highestSim >= 0.72 && bestMatch !== null;

  return {
    isDuplicate,
    matchedTask: bestMatch || undefined,
    similarity: highestSim,
    reason: matchReason
  };
}
