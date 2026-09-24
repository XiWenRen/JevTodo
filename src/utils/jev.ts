/**
 * Jev Decision Model & Natural Language Parsing Utilities
 * Powered by TypeSafe Jev Decision Logic & Vercel AI Gateway
 */

import { TaskCategory, JevDecision, TaskItem, JevCleanupItem, JevDuplicateCheckResult } from '../types';
export type { JevDecision };

function maskApiKey(key?: string): string {
  if (!key) return '(未配置)';
  if (key.length <= 16) return '******';
  return `${key.slice(0, 10)}...${key.slice(-6)}`;
}

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
export function extractDateTime(input: string, referenceDate: Date = new Date()): {
  dueDate?: string;
  dueDateIso?: string;
  dueTimestamp?: number;
  cleanTitle: string;
} {
  const now = referenceDate || new Date();
  let targetDate = new Date(now.getTime());
  let hasDate = false;
  let cleanTitle = input;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const timeInfo = matchHoursMins(input);
  const defaultHour = timeInfo ? timeInfo.hour : 18;
  const defaultMin = timeInfo ? timeInfo.minute : 0;

  // 1. Explicit calendar date: e.g. 2026-09-23, 2026年9月23日, 2026/09/23
  const fullDateMatch = /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/.exec(input);
  const shortDateMatch = !fullDateMatch ? /(\d{1,2})[-/.月](\d{1,2})日?/.exec(input) : null;

  if (fullDateMatch) {
    hasDate = true;
    const year = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10) - 1;
    const day = parseInt(fullDateMatch[3], 10);
    targetDate = new Date(year, month, day, defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/g, '');
  } else if (shortDateMatch && !/(?:周|星期)[1-7]/.test(input)) {
    hasDate = true;
    const year = now.getFullYear();
    const month = parseInt(shortDateMatch[1], 10) - 1;
    const day = parseInt(shortDateMatch[2], 10);
    targetDate = new Date(year, month, day, defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(\d{1,2})[-/.月](\d{1,2})日?/g, '');
  } else if (/(今天|今晚|今日)/.test(input)) {
    hasDate = true;
    targetDate.setHours(defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(今天|今晚|今日)/g, '');
  } else if (/(明天|明早|明晚)/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(timeInfo ? timeInfo.hour : 10, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/(明天|明早|明晚)/g, '');
  } else if (/大后天/.test(input)) {
    hasDate = true;
    targetDate.setDate(targetDate.getDate() + 3);
    targetDate.setHours(defaultHour, defaultMin, 0, 0);
    cleanTitle = cleanTitle.replace(/大后天/g, '');
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

  const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const nowDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.round((targetDayStart - nowDayStart) / (24 * 3600 * 1000));

  let humanDueDate = '';
  if (dayDiff === 0) {
    humanDueDate = `今天 ${hh}:${mm}`;
  } else if (dayDiff === 1) {
    humanDueDate = `明天 ${hh}:${mm}`;
  } else if (dayDiff === 2) {
    humanDueDate = `后天 ${hh}:${mm}`;
  } else if (dayDiff === -1) {
    humanDueDate = `昨天 ${hh}:${mm}`;
  } else if (dayDiff === -2) {
    humanDueDate = `前天 ${hh}:${mm}`;
  } else if (y === now.getFullYear()) {
    humanDueDate = `${m}-${d} ${hh}:${mm}`;
  } else {
    humanDueDate = `${y}-${m}-${d} ${hh}:${mm}`;
  }

  const dueTimestamp = targetDate.getTime();
  const dueDateIso = `${y}-${m}-${d}T${hh}:${mm}:00`;

  return {
    dueDate: humanDueDate,
    dueDateIso,
    dueTimestamp,
    cleanTitle: cleanTitle.length > 0 ? cleanTitle : input.trim()
  };
}

export interface FormattedDueDate {
  hasDueDate: boolean;
  displayDate: string; // Dynamic relative or calendar string e.g. "昨天 14:00", "今天 14:00", "明天 10:00"
  fullExactDate: string; // Full concrete timestamp e.g. "2026-09-22 14:00"
  isOverdue: boolean;
  diffHours: number;
  colorClass: string;
  dotClass: string;
  relativeDesc: string; // e.g. "已逾期 20h", "已逾期 1天", "30分钟内", "今日稍晚"
  concreteTimestamp?: number;
}

/**
 * Dynamically formats a task's due date relative to the current live time.
 * If a task was due yesterday at 14:00, it dynamically displays as "昨天 14:00" with "已逾期 20h",
 * never statically stuck on "今天 14:00".
 */
export function formatDynamicDueDate(
  task: {
    dueDate?: string;
    dueDateIso?: string;
    dueTimestamp?: number;
    createdAt?: number;
  },
  referenceNow: Date = new Date()
): FormattedDueDate {
  if (!task.dueDate && !task.dueDateIso && !task.dueTimestamp) {
    return {
      hasDueDate: false,
      displayDate: '',
      fullExactDate: '',
      isOverdue: false,
      diffHours: 0,
      colorClass: 'text-[var(--text-sub)]',
      dotClass: 'bg-[var(--text-faint)]',
      relativeDesc: ''
    };
  }

  // 1. Resolve concrete target timestamp
  let dueMs: number | null = null;
  if (typeof task.dueTimestamp === 'number' && !isNaN(task.dueTimestamp) && task.dueTimestamp > 0) {
    dueMs = task.dueTimestamp;
  } else if (task.dueDateIso) {
    const t = new Date(task.dueDateIso).getTime();
    if (!isNaN(t)) dueMs = t;
  }

  // 2. If dueMs still not found, check task.dueDate
  if (!dueMs && task.dueDate) {
    // If it's pure fuzzy planning text like "下个月" / "下半年" / "稍后规划" / "长期"
    if (/(下个月|下半年|明年|稍后规划|规划中|待定|长期)/.test(task.dueDate)) {
      return {
        hasDueDate: true,
        displayDate: task.dueDate,
        fullExactDate: '规划中无具体时间',
        isOverdue: false,
        diffHours: 9999,
        colorClass: 'text-[var(--text-sub)]',
        dotClass: 'bg-[var(--text-faint)]',
        relativeDesc: ''
      };
    }

    // Try parsing task.dueDate using task.createdAt as reference if available
    const refDate = task.createdAt ? new Date(task.createdAt) : referenceNow;
    const parsed = extractDateTime(task.dueDate, refDate);
    if (parsed.dueTimestamp) {
      dueMs = parsed.dueTimestamp;
    }
  }

  if (!dueMs) {
    return {
      hasDueDate: true,
      displayDate: task.dueDate || '',
      fullExactDate: task.dueDate || '',
      isOverdue: false,
      diffHours: 0,
      colorClass: 'text-[var(--text-sub)]',
      dotClass: 'bg-[var(--text-faint)]',
      relativeDesc: ''
    };
  }

  // 3. We have a concrete dueMs! Calculate dynamic relative text against referenceNow
  const targetDate = new Date(dueMs);
  const nowMs = referenceNow.getTime();
  const diffHours = (dueMs - nowMs) / (1000 * 60 * 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth() + 1;
  const d = targetDate.getDate();
  const hh = pad(targetDate.getHours());
  const mm = pad(targetDate.getMinutes());
  const timeStr = `${hh}:${mm}`;

  const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const nowDayStart = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate()).getTime();
  const dayDiff = Math.round((targetDayStart - nowDayStart) / (24 * 3600 * 1000));

  let dynamicDay = '';
  if (dayDiff === 0) {
    dynamicDay = `今天 ${timeStr}`;
  } else if (dayDiff === 1) {
    dynamicDay = `明天 ${timeStr}`;
  } else if (dayDiff === 2) {
    dynamicDay = `后天 ${timeStr}`;
  } else if (dayDiff === -1) {
    dynamicDay = `昨天 ${timeStr}`;
  } else if (dayDiff === -2) {
    dynamicDay = `前天 ${timeStr}`;
  } else if (y === referenceNow.getFullYear()) {
    dynamicDay = `${m}月${d}日 ${timeStr}`;
  } else {
    dynamicDay = `${y}年${m}月${d}日 ${timeStr}`;
  }

  const fullExactDate = `${y}-${pad(m)}-${pad(d)} ${timeStr}`;

  // 4. Determine status & overdue
  if (diffHours < 0) {
    const hoursPast = Math.abs(diffHours);
    let desc = '';
    if (hoursPast >= 48) {
      desc = `已逾期 ${Math.floor(hoursPast / 24)}天`;
    } else if (hoursPast >= 24) {
      desc = '已逾期 1天';
    } else if (hoursPast >= 1) {
      desc = `已逾期 ${Math.round(hoursPast)}h`;
    } else {
      const minsPast = Math.max(1, Math.round(hoursPast * 60));
      desc = `已逾期 ${minsPast}m`;
    }
    return {
      hasDueDate: true,
      displayDate: dynamicDay,
      fullExactDate,
      isOverdue: true,
      diffHours,
      colorClass: 'text-rose-500 font-medium',
      dotClass: 'bg-rose-500',
      relativeDesc: desc,
      concreteTimestamp: dueMs
    };
  }

  if (diffHours <= 2) {
    const mins = Math.max(1, Math.round(diffHours * 60));
    return {
      hasDueDate: true,
      displayDate: dynamicDay,
      fullExactDate,
      isOverdue: false,
      diffHours,
      colorClass: 'text-amber-500 font-medium',
      dotClass: 'bg-amber-500',
      relativeDesc: `${mins}分钟内`,
      concreteTimestamp: dueMs
    };
  }

  if (diffHours <= 12) {
    return {
      hasDueDate: true,
      displayDate: dynamicDay,
      fullExactDate,
      isOverdue: false,
      diffHours,
      colorClass: 'text-sky-400 font-normal',
      dotClass: 'bg-sky-400',
      relativeDesc: '今日稍晚',
      concreteTimestamp: dueMs
    };
  }

  if (diffHours <= 48) {
    return {
      hasDueDate: true,
      displayDate: dynamicDay,
      fullExactDate,
      isOverdue: false,
      diffHours,
      colorClass: 'text-emerald-400/90 font-normal',
      dotClass: 'bg-emerald-400',
      relativeDesc: '近两天',
      concreteTimestamp: dueMs
    };
  }

  return {
    hasDueDate: true,
    displayDate: dynamicDay,
    fullExactDate,
    isOverdue: false,
    diffHours,
    colorClass: 'text-[var(--text-sub)]',
    dotClass: 'bg-[var(--text-faint)]',
    relativeDesc: '',
    concreteTimestamp: dueMs
  };
}

/**
 * Extract flomo-style tags from input or automatically infer granular matter-specific tags.
 * Prohibits vague generic tags like "工作", "测试", "生活", "学习" in favor of concrete event tags.
 */
export function extractFlomoTags(input: string): { tags: string[]; remainingText: string } {
  const explicitTags: string[] = [];
  // Match #tag
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
  if (inferredTags.length >= 2) {
    return {
      tags: inferredTags.slice(0, 3),
      remainingText: remainingText.length > 0 ? remainingText : input
    };
  }

  const text = input.toLowerCase();

  // Fine-grained matter/event rules (sorted by specificity, strictly avoiding broad categories like "工作", "测试")
  const matterRules: Array<{ match: (t: string) => boolean; tag: string }> = [
    // 1. Alert & Incident Response
    { match: t => /(502|500|503|404|宕机|崩溃|报警|告警|网关告警)/.test(t) && /(网关|端口|nginx|8080|排查|修复)/.test(t), tag: '网关排查' },
    { match: t => /(502|500|宕机|报警|告警|卡死|挂掉)/.test(t), tag: '502报警' },
    { match: t => /(生产环境|线上环境|高危|故障修复|紧急排查)/.test(t), tag: '生产排查' },

    // 2. Testing & Quality Assurance
    { match: t => /(用例|测试用例)/.test(t) && /(评审|讨论|过例)/.test(t), tag: '用例评审' },
    { match: t => /(冒烟|卡点|阻塞|冒烟测试)/.test(t), tag: '冒烟测试' },
    { match: t => /(压测|压力测试|性能测试|吞吐量|tps)/.test(t), tag: '性能压测' },
    { match: t => /(回归|验收|预发验收|qa验证)/.test(t), tag: '回归验收' },
    { match: t => /(缺陷|bug|修复bug|提单)/.test(t), tag: 'Bug修复' },
    { match: t => /(退款|支付|订单)/.test(t) && /(测试|用例|验证)/.test(t), tag: '支付测试' },

    // 3. Product & Requirements
    { match: t => /(prd|产品文档)/.test(t) && /(锁定|终审|定稿|签署)/.test(t), tag: 'PRD终审' },
    { match: t => /(供应链|分销|仓储)/.test(t) && /(改造|系统|重构)/.test(t), tag: '供应链改造' },
    { match: t => /(需求评审|方案评审|产品评审)/.test(t), tag: '需求评审' },
    { match: t => /(原型|交互稿|ui稿|高保真|figma)/.test(t), tag: '原型设计' },
    { match: t => /(需求拆解|功能清单|业务架构)/.test(t), tag: '需求拆解' },

    // 4. Code & Architecture
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

    // 5. Infrastructure & Operations
    { match: t => /(同城双活|跨机房|灾备迁移|灾备演练)/.test(t), tag: '双活灾备' },
    { match: t => /(机房迁移|机房割接|物理机搬迁)/.test(t), tag: '机房迁移' },
    { match: t => /(弱电|机架回收|废旧机架|机柜|弱电供应)/.test(t), tag: '机架回收' },
    { match: t => /(ssl证书|域名解析|https|证书更新)/.test(t), tag: '证书维护' },
    { match: t => /(容器集群|k8s|docker|集群扩容)/.test(t), tag: '集群调度' },

    // 6. Project Management & Routine
    { match: t => /(双周例会|双周进度|项目双周|进度例会)/.test(t), tag: '双周例会' },
    { match: t => /(燃尽图|燃尽图更新|甘特图)/.test(t), tag: '燃尽图' },
    { match: t => /(延期风险|项目风险|卡点跟进)/.test(t), tag: '风险评估' },
    { match: t => /(里程碑|阶段交付|交付节点)/.test(t), tag: '里程碑交付' },
    { match: t => /(项目复盘|复盘会|经验总结)/.test(t), tag: '项目复盘' },
    { match: t => /(立项申请|roi效益|立项申报)/.test(t), tag: '立项预研' },

    // 7. Finance & Procurement
    { match: t => /(比价单|供应商比价|3家比价|三方比价)/.test(t), tag: '供应商比价' },
    { match: t => /(算力服务器|硬件采购|服务器采购|设备采购)/.test(t), tag: '硬件采购' },
    { match: t => /(预算申报|申报表|预算审批|财年预算)/.test(t), tag: '预算申报' },
    { match: t => /(云资源预算|it研发预算|公有云开销)/.test(t), tag: '云资源预算' },
    { match: t => /(差旅报销|发票贴票|报销单|费用审批)/.test(t), tag: '费用报销' },
    { match: t => /(合同审批|盖章流程|法务审查|法务合规)/.test(t), tag: '合同审批' },

    // 8. HR & Team
    { match: t => /(技术终面|终面面谈|候选人终面|技术复试)/.test(t), tag: '架构师终面' },
    { match: t => /(试用期1on1|试用期面谈|试用期考核|转正答辩)/.test(t), tag: '试用期1on1' },
    { match: t => /(招聘面试|简历筛选|初试筛选)/.test(t), tag: '招聘面试' },
    { match: t => /(绩效评定|okr对齐|kpi考核)/.test(t), tag: '绩效考核' },

    // 9. Personal, Health, Study, Living
    { match: t => /(历史归档|老旧微服务|用例归档|归档目录)/.test(t), tag: '历史归档' },
    { match: t => /(胃镜|肠镜|体检报告|核酸|年度体检)/.test(t), tag: '医疗体检' },
    { match: t => /(挂号|门诊|三甲医院|看医生|就医)/.test(t), tag: '就医挂号' },
    { match: t => /(力量训练|深蹲|卧推|健身房打卡)/.test(t), tag: '力量训练' },
    { match: t => /(有氧慢跑|跑步打卡|5公里|晨跑)/.test(t), tag: '跑步锻炼' },
    { match: t => /(雅思|托福|四六级|背单词|单词打卡)/.test(t), tag: '外语备考' },
    { match: t => /(毕业论文|论文开题|论文答辩|开题报告)/.test(t), tag: '论文写作' },
    { match: t => /(机票预订|高铁票|改签|订机票)/.test(t), tag: '票务预订' },
    { match: t => /(酒店预订|民宿|出差行程)/.test(t), tag: '行程预订' },
    { match: t => /(寄快递|取快递|顺丰|菜鸟驿站)/.test(t), tag: '快递处理' },
    { match: t => /(水电费|物业费|燃气费|生活缴费)/.test(t), tag: '生活缴费' },
    { match: t => /(山姆|盒马|超市买菜|生鲜采买)/.test(t), tag: '生鲜采买' }
  ];

  for (const rule of matterRules) {
    if (inferredTags.length >= 2) break;
    if (rule.match(text)) {
      // Avoid pushing redundant tags for the same domain entity (e.g. 中台同步 vs 中台对接)
      const hasOverlap = inferredTags.some(t => 
        t === rule.tag || (t.length >= 3 && rule.tag.length >= 3 && t.slice(0, 2) === rule.tag.slice(0, 2))
      );
      if (!hasOverlap) {
        inferredTags.push(rule.tag);
      }
    }
  }

  // Dynamic semantic entity + action extractor (e.g. 中台 + 同步 -> 中台同步, 数据库 + 备份 -> 数据库备份)
  if (inferredTags.length === 0) {
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
            if (!inferredTags.includes(combined)) {
              inferredTags.push(combined);
              break;
            }
          }
        }
      }
      if (inferredTags.length >= 2) break;
    }
  }

  // Dynamic regex pattern matching for [Entity] + [Action]
  if (inferredTags.length === 0) {
    const dynamicMatches = [
      /(支付|订单|网关|中台|供应链|结算|机房|服务器|云资源|预算|用例|架构|合同|发票|论文|体检|机票)(改造|评审|排查|重构|申报|采购|迁移|比价|审批|测试|核算|检查|预订|同步|对接)/,
      /(开会|讨论|跟进|调研|汇报|复盘)([a-zA-Z\u4e00-\u9fa5]{2,6})/
    ];
    for (const dm of dynamicMatches) {
      const res = text.match(dm);
      if (res && res[0]) {
        inferredTags.push(res[0]);
        break;
      }
    }
  }

  // Strict fallback: Aggressively strip time words, prepositions, conjunctions, auxiliary verbs
  // Prevents invalid garbled phrases like "要和中台", "跟前端", "帮测试"
  if (inferredTags.length === 0) {
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
          inferredTags.push(word);
          break;
        }
      }
    }

    if (inferredTags.length === 0) {
      inferredTags.push('重点事项');
    }
  }

  return {
    tags: inferredTags.slice(0, 2),
    remainingText: remainingText.length > 0 ? remainingText : input
  };
}

/**
 * Calibrated Jev Decision Engine
 * When Jev API key is configured, queries Vercel AI Gateway / TypeSafe Jev model.
 * Otherwise, uses high-speed local decision matching to provide instant responses.
 */
export interface EvaluateWithJevOptions {
  apiKey?: string;
  endpoint?: string;
  triggerType?: 'preview' | 'create_task' | 'manual';
  allowFallback?: boolean;
  userTags?: string[];
  existingSchedule?: Array<{
    id?: string;
    title: string;
    dueDate?: string;
    dueDateIso?: string;
    dueTimestamp?: number;
    durationMinutes?: number;
  }>;
}

export async function evaluateWithJev(
  rawInput: string,
  options?: EvaluateWithJevOptions
): Promise<JevDecision> {
  const startTime = performance.now();
  const allowFallback = options?.allowFallback === true;

  // Check if API key is provided directly or via env
  const effectiveApiKey =
    options?.apiKey ||
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_JEV_API_KEY as string)) ||
    '';
  const triggerType = options?.triggerType || 'preview';
  let targetEndpoint = options?.endpoint || 'https://api.typesafe.ai/v1/systemone';
  if (targetEndpoint.includes('ai-gateway.vercel.sh')) {
    targetEndpoint = 'https://api.typesafe.ai/v1/systemone';
  }
  const maskedKey = maskApiKey(effectiveApiKey);

  // If user provided an API key or env var is present, call the backend /api/jev/evaluate endpoint
  if (effectiveApiKey) {
    try {
      const res = await fetch('/api/jev/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawInput,
          apiKey: effectiveApiKey,
          endpoint: targetEndpoint,
          triggerType,
          allowFallback,
          userTags: options?.userTags,
          existingSchedule: options?.existingSchedule
        })
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        if (data && data.category) {
          const finalDecision: JevDecision = {
            category: data.category,
            urgencyScore: data.urgencyScore ?? 0.8,
            tags: data.tags && data.tags.length > 0 ? data.tags : ['常规待办'],
            cleanTitle: data.cleanTitle,
            dueDate: data.dueDate,
            dueDateIso: data.dueDateIso,
            dueTimestamp: data.dueTimestamp,
            freeWindowSummary: data.freeWindowSummary,
            confidence: data.confidence ?? 0.94,
            rawJevAnswers: data.rawJevAnswers,
            source: data.source || 'typesafe-jev-systemone'
          };

          const isJev = finalDecision.source === 'typesafe-jev-systemone' || finalDecision.source.includes('jev');
          console.groupCollapsed(
            `%c[${isJev ? 'Jev AI 智能解析' : 'Cherry 本地解析'}]%c ${triggerType === 'preview' ? '⚡ 1s实时预测' : '🚀 任务创建评估'}: "${rawInput}" %c(${durationMs}ms) [${finalDecision.source}]`,
            `background: ${isJev ? '#06b6d4' : '#f43f5e'}; color: white; padding: 1px 6px; border-radius: 3px; font-weight: bold;`,
            'color: inherit; font-weight: normal;',
            'color: #06b6d4; font-weight: bold;'
          );
          console.log('📌 输入文本:', rawInput);
          console.log('🎯 提炼任务名称:', finalDecision.cleanTitle || '(未指定)');
          console.log('🔑 使用 Key:', maskedKey);
          console.log('🌐 决策来源:', finalDecision.source);
          console.log('🎯 分类结果:', finalDecision.category);
          console.log('⚡ 紧迫评分:', finalDecision.urgencyScore);
          console.log('🏷️ 细化标签 (Jev):', finalDecision.tags);
          console.log('⏰ 任务时间 (Jev):', finalDecision.dueDate || '无明确时限');
          if (data.requestPayload) console.log('📤 交互 Payload:', data.requestPayload);
          if (data.gatewayError) console.warn('⚠️ 远端告警/降级原因:', data.gatewayError);
          console.log('📦 完整响应:', data);
          console.groupEnd();

          return finalDecision;
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Jev AI] 接口响应非 200: HTTP ${res.status}`, errText);
        if (!allowFallback) {
          throw new Error(`Jev 智能决策失败 (HTTP ${res.status}): ${errText}`);
        }
      }
    } catch (err) {
      console.warn('Jev API request failed:', err);
      if (!allowFallback) {
        throw err;
      }
    }
  } else if (!allowFallback) {
    throw new Error('未配置有效 Jev API Key，且偏好设置中已禁止降级');
  }

  // Fallback to local Cherry Engine (only if allowFallback is true)
  const { dueDate, dueDateIso, dueTimestamp, cleanTitle } = extractDateTime(rawInput);
  const { tags } = extractFlomoTags(cleanTitle);
  const text = rawInput.toLowerCase();

  let category: TaskCategory = '近期完成';
  let urgencyScore = 0.5;
  let confidence = 0.92;

  const instantKeywords = ['立刻', '马上', '今天', '紧急', '赶紧', '现在', '急', '今晚', '下班前', '下午', '上午', '尽快', '开会', '抢票', '宕机', '告警', '报警', '502', '卡点', '阻塞', '故障', '冒烟'];
  const plannedKeywords = ['下个月', '明年', '长期', '规划', '学习', '考证', '计划', '买房', '旅行计划', '抽空', '以后', '未来', '有空', '下半年', '架构演进', '长远', '储备', '远期'];
  const highUrgencyKeywords = ['紧急', '重要', '严重', '致命', '客户', '合同', '上交', '截止', 'deadline', '扣款', '宕机', '502', '高危', '告警', '报警', '生产环境', '故障', '网关告警'];

  const hasFutureDay = /(明天|明早|明晚|后天|这周|本周|下周)/.test(text);
  const isPastDay = /(昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|上周|上星期)/.test(text);
  const isUrgentIncident = /(宕机|502|故障|报警|告警|严重)/.test(text);

  const isInstant = !isPastDay && (!hasFutureDay || isUrgentIncident) && (instantKeywords.some(k => text.includes(k)) || (dueDate && dueDate.includes('今天')));
  const isPlanned = plannedKeywords.some(k => text.includes(k)) || (!dueDate && text.includes('想') && text.length > 10);

  if (isInstant) {
    category = '即刻完成';
    urgencyScore = highUrgencyKeywords.some(k => text.includes(k)) ? 0.98 : 0.92;
    confidence = 0.96;
  } else if (isPlanned) {
    category = '规划待办';
    urgencyScore = 0.25;
    confidence = 0.91;
  } else {
    category = '近期完成';
    urgencyScore = /(采购|预算|评审|用例|例会|周五|周四|本周)/.test(text) ? 0.72 : 0.65;
    confidence = 0.92;
  }

  const defaultDueMs = category === '即刻完成' ? new Date().setHours(18, 0, 0, 0) : undefined;
  const defaultIso = category === '即刻完成' ? `${new Date().toISOString().slice(0, 10)}T18:00:00` : undefined;

  const durationMs = Math.round(performance.now() - startTime);
  const localDecision: JevDecision = {
    category,
    urgencyScore,
    tags,
    cleanTitle: cleanTitle || undefined,
    dueDate: dueDate || (category === '即刻完成' ? '今天 18:00' : undefined),
    dueDateIso: dueDateIso || defaultIso,
    dueTimestamp: dueTimestamp || defaultDueMs,
    confidence,
    source: 'cherry-calibrated-local'
  };

  console.groupCollapsed(
    `%c[Cherry 智能解析]%c 本地降级引擎评估: "${rawInput}" %c(${durationMs}ms)`,
    'background: #f43f5e; color: white; padding: 1px 6px; border-radius: 3px; font-weight: bold;',
    'color: inherit; font-weight: normal;',
    'color: #06b6d4; font-weight: bold;'
  );
  console.log('📌 输入文本:', rawInput);
  console.log('🎯 分类结果:', localDecision.category);
  console.log('🏷️ 细化标签:', localDecision.tags);
  console.groupEnd();

  return localDecision;
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
    const dynamicDate = formatDynamicDueDate(task, new Date(now));
    if (!task.completed && dynamicDate.isOverdue) {
      overdueCount++;
    }

    // Staleness heuristic: uncompleted for > 5 days or created > 7 days ago
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
    } else if (!task.completed && ageDays > 14 && task.category === '规划待办') {
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

  const categoryWeight: Record<TaskCategory, number> = {
    '即刻完成': 3,
    '近期完成': 2,
    '规划待办': 1
  };

  const rankedTasks = [...evaluated].sort((a, b) => {
    // Uncompleted first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Category urgency first
    const catDiff = categoryWeight[b.category] - categoryWeight[a.category];
    if (catDiff !== 0) return catDiff;
    // Urgency score
    const uDiff = (b.urgencyScore || 0) - (a.urgencyScore || 0);
    if (uDiff !== 0) return uDiff;
    // Due date (earlier first)
    if (a.dueTimestamp && b.dueTimestamp) return a.dueTimestamp - b.dueTimestamp;
    if (a.dueTimestamp) return -1;
    if (b.dueTimestamp) return 1;
    return b.createdAt - a.createdAt;
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
    adviceSummary = `当前任务节律合理，优先专注「即刻完成」核心事项。`;
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

/**
 * Check if an uncompleted task in '近期完成' or '规划待办' has entered the current day's execution window
 * and is eligible for Jev re-evaluation and roll-forward into '即刻完成'.
 */
export function isTaskEligibleForJevEvolution(task: TaskItem): boolean {
  if (task.completed) return false;
  if (task.category === '即刻完成') return false;

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const endOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  // 1. Concrete due timestamp is today or earlier
  if (task.dueTimestamp && task.dueTimestamp <= endOfTodayMs) {
    return true;
  }

  // 2. ISO date is today or earlier
  if (task.dueDateIso) {
    const isoDatePart = task.dueDateIso.slice(0, 10);
    if (isoDatePart <= todayStr) {
      return true;
    }
  }

  // 3. Due date text indicates today / overdue / past relative date
  if (task.dueDate) {
    if (task.dueDate.includes('今天') || task.dueDate.includes('已逾期') || task.dueDate.includes('昨天')) {
      return true;
    }
    // If it mentions "明天" but the task was created or updated BEFORE today (i.e. yesterday's tomorrow has arrived)
    if (task.dueDate.includes('明天') && (task.createdAt < startOfTodayMs || task.updatedAt < startOfTodayMs)) {
      return true;
    }
  }

  return false;
}

/**
 * Re-evaluates a matured task using Jev AI System One, transitioning it into '即刻完成'
 * with freshly calibrated urgencyScore, updated natural due date strings and tags.
 */
export async function evolveTaskWithJev(
  task: TaskItem,
  options?: { apiKey?: string; endpoint?: string; allowFallback?: boolean }
): Promise<{ updatedTask: TaskItem; changed: boolean }> {
  // Strip obsolete relative day prefixes like "明天", "明早", "后天"
  const cleanTitle = task.title.replace(/^(明天|明早|明晚|后天|今天)\s*/, '');
  const prompt = `【日程演化审查】当前实际时间是：今天。待办事项：「${cleanTitle}」，原定安排时间为：${task.dueDate || '今天'}。该事项今天已进入执行窗口，请判定其在今天的执行分类、时间与紧迫度。`;

  const decision = await evaluateWithJev(prompt, {
    apiKey: options?.apiKey,
    endpoint: options?.endpoint,
    triggerType: 'manual',
    allowFallback: options?.allowFallback
  });

  const nextCategory = decision.category || '即刻完成';
  const updatedTask: TaskItem = {
    ...task,
    category: nextCategory,
    urgencyScore: decision.urgencyScore ?? 0.88,
    tags: Array.from(new Set([...task.tags, ...(decision.tags || [])])),
    dueDate: decision.dueDate || (nextCategory === '即刻完成' ? '今天' : task.dueDate),
    dueDateIso: decision.dueDateIso || task.dueDateIso,
    dueTimestamp: decision.dueTimestamp || task.dueTimestamp,
    updatedAt: Date.now()
  };

  const changed = updatedTask.category !== task.category || updatedTask.dueDate !== task.dueDate;
  return { updatedTask, changed };
}

/**
 * Batch-evaluates eligible candidate tasks using Jev AI in parallel.
 */
export async function batchEvolveTasksWithJev(
  tasksToEvolve: TaskItem[],
  options?: { apiKey?: string; endpoint?: string; allowFallback?: boolean }
): Promise<{ updatedTasks: TaskItem[]; evolvedCount: number }> {
  if (tasksToEvolve.length === 0) {
    return { updatedTasks: [], evolvedCount: 0 };
  }

  const results = await Promise.allSettled(
    tasksToEvolve.map(t => evolveTaskWithJev(t, options))
  );

  const updatedTasks: TaskItem[] = [];
  let evolvedCount = 0;

  for (let i = 0; i < tasksToEvolve.length; i++) {
    const res = results[i];
    if (res.status === 'fulfilled') {
      updatedTasks.push(res.value.updatedTask);
      if (res.value.changed) {
        evolvedCount++;
      }
    } else {
      console.warn(`[Jev Evolution] Failed to evolve task ${tasksToEvolve[i].id}:`, res.reason);
      updatedTasks.push(tasksToEvolve[i]);
    }
  }

  return { updatedTasks, evolvedCount };
}

