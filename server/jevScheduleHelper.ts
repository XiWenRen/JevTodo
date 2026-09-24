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
 * Extract 1-2 prominent domain nouns / action phrases from raw input to serve as candidate tags.
 */
export function extractDomainKeywords(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .replace(/(今天|明天|后天|大后天|昨晚|昨天|前天|上午|下午|晚上|早晨|早上|中午|夜里|这周|本周|下周|周[一二三四五六日天1-7]|\d+点|\d+分|点前|半前|分前|之后|之前|月底|月初|年中|年底)/g, '')
    .replace(/(要和|要跟|要去|要给|要与|要同|要对|要把|要向|要|和|跟|与|同|给|对|把|向|从|在|让|去|帮|需|需要|想要|打算|准备|负责|协助|组织|安排|进行|推进|落实|完成|做好|搞定|处理|搞好|弄好|请|一起|共同|一下|一次|一番|这件|这个|那个|相关|等等|以及|部分|还有|一个|一份|一项)/g, '')
    .trim();

  const domainPatterns = [
    /(支付|订单|网关|中台|供应链|结算|机房|服务器|云资源|预算|用例|架构|合同|发票|论文|体检|机票|疫苗|租房|财报|专利)(改造|评审|排查|重构|申报|采购|迁移|比价|审批|测试|核算|检查|预订|同步|对接|接种|缴纳|编写|申请)?/,
    /(方案|报告|调研|规划|复盘|总结|分享|面试|答辩|汇报)([a-zA-Z\u4e00-\u9fa5]{2,4})?/
  ];

  const results: string[] = [];
  for (const pat of domainPatterns) {
    const match = cleaned.match(pat);
    if (match && match[0] && match[0].length >= 2) {
      results.push(match[0]);
    }
  }

  return results.slice(0, 2);
}

/**
 * Compose dynamic matter_tag criteria merging user custom tags,
 * pre-extracted keywords from the prompt, and baseline domain fallbacks.
 */
export function buildDynamicTagCriteria(
  userTags?: string[],
  text: string = ''
): Record<string, string> {
  const criteria: Record<string, string> = {};

  // 1. Inject user-specific custom tags (up to 12)
  if (Array.isArray(userTags)) {
    for (const tag of userTags) {
      if (typeof tag === 'string') {
        const clean = tag.trim().replace(/^#/, '');
        if (clean && clean.length >= 2 && !criteria[clean] && Object.keys(criteria).length < 12) {
          criteria[clean] = `用户自定义业务分类：与「${clean}」相关的日常工作、交付或生活事项`;
        }
      }
    }
  }

  // 2. Inject novel keywords extracted from prompt
  const extracted = extractDomainKeywords(text);
  for (const kw of extracted) {
    if (!criteria[kw] && Object.keys(criteria).length < 15) {
      criteria[kw] = `根据当前任务内容提取的候选领域：与「${kw}」相关的具体事务`;
    }
  }

  // 3. Baseline high-frequency domain categories
  const baselineCategories: Record<string, string> = {
    '技术方案': '系统架构设计、技术方案撰写、技术选型与评审',
    '代码审查': '代码CR、Review、合并卡点处理与分支发布',
    '网关排查': '502/500/网关/端口/告警排查与服务恢复',
    '生产排查': '生产环境故障、线上紧急异常排查与止血',
    '用例评审': '测试用例、冒烟测试、功能评审与质量验收',
    '灰度发版': '版本发布、灰度上线、发版跟进与监控',
    '预算申报': '财年IT研发与云资源预算申报、硬件采购比价',
    '医疗健康': '就医检查、体检、门诊预约、健康管理',
    '运动健身': '健身房力量训练、跑步打卡、体育锻炼',
    '生活琐事': '日常超市购物、生鲜买菜、生活缴费、家务打理',
    '学习成长': '外语备考、技术进阶、学习规划与深度阅读',
    '常规待办': '其他未明确归类的常规工作或日常琐碎事项'
  };

  for (const [tag, desc] of Object.entries(baselineCategories)) {
    if (!criteria[tag]) {
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
