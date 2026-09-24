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

import {
  extractSubjectEntities,
  extractDomainKeywords,
  buildDynamicTitleCriteria
} from '../src/shared/nlp/index.js';

export {
  extractSubjectEntities,
  extractDomainKeywords,
  buildDynamicTitleCriteria
};

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

// User-scoped tag ledger cache to prevent cross-tenant contamination
const userLedgers = new Map<string, PersonalTagLedger>();

export function getPersonalTagLedger(userId: string = 'default'): PersonalTagLedger {
  const safeId = (userId && typeof userId === 'string' && userId.trim()) ? userId.trim() : 'default';
  let ledger = userLedgers.get(safeId);
  if (!ledger) {
    ledger = new PersonalTagLedger();
    userLedgers.set(safeId, ledger);
  }
  return ledger;
}

export const globalTagLedger = getPersonalTagLedger('default');

/**
 * Compose dynamic matter_tag criteria merging user tag ledger,
 * pre-extracted subject entities, domain keywords, and baseline fallbacks.
 */
export function buildDynamicTagCriteria(
  userTags?: string[],
  text: string = '',
  ledgerOrUserId: PersonalTagLedger | string = 'default'
): Record<string, string> {
  const ledger = typeof ledgerOrUserId === 'string' 
    ? getPersonalTagLedger(ledgerOrUserId) 
    : (ledgerOrUserId || globalTagLedger);
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

  // 3. Explicit user-specific custom tags passed in request (evolve into user's ledger)
  if (Array.isArray(userTags)) {
    for (const tag of userTags) {
      if (typeof tag === 'string') {
        const clean = tag.trim().replace(/^#/, '');
        if (clean && clean.length >= 2) {
          ledger.recordTagUsage(clean, 'user_created');
          if (!criteria[clean] && Object.keys(criteria).length < 12) {
            criteria[clean] = `【自定义标签】与「${clean}」相关的日常工作或交付事项`;
          }
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


