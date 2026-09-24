/**
 * Converts Jev System One time answers (time_scope, time_slot, target_hour)
 * into concrete dueDate, dueDateIso, and dueTimestamp.
 */
export function resolveJevDateTime(
  timeScope?: string,
  timeSlot?: string,
  targetHour?: string,
  rawText: string = '',
  referenceDate: Date = new Date()
): {
  dueDate?: string;
  dueDateIso?: string;
  dueTimestamp?: number;
} {
  if (!timeScope || timeScope === '随时待办') {
    return {};
  }

  if (timeScope === '长期规划') {
    return { dueDate: '长期规划' };
  }

  const now = referenceDate || new Date();
  const target = new Date(now.getTime());

  if (timeScope === '今天') {
    // Keep target as today
  } else if (timeScope === '明天') {
    target.setDate(target.getDate() + 1);
  } else if (timeScope === '后天') {
    target.setDate(target.getDate() + 2);
  } else if (timeScope === '本周内') {
    const curDay = target.getDay(); // 0 is Sun, 1-6 Mon-Sat
    const distToFriday = 5 - (curDay === 0 ? 7 : curDay);
    if (distToFriday > 0) {
      target.setDate(target.getDate() + distToFriday);
    } else {
      target.setDate(target.getDate() + 1);
    }
  } else if (timeScope === '下周') {
    const curDay = target.getDay();
    const daysUntilNextMon = ((8 - curDay) % 7) || 7;
    target.setDate(target.getDate() + daysUntilNextMon);
  }

  // Resolve hours and minutes
  let h = 18;
  let m = 0;

  if (targetHour && targetHour.includes(':')) {
    const parts = targetHour.split(':');
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  } else if (timeSlot === '上午') {
    h = 10;
  } else if (timeSlot === '中午') {
    h = 12;
  } else if (timeSlot === '下午') {
    h = 15;
  } else if (timeSlot === '晚上') {
    h = 20;
  }

  // Check if raw text mentions half hour e.g. "半" or exact minutes like ":30"
  if (/半/.test(rawText) && m === 0) {
    m = 30;
  } else {
    const colonMatch = /[:：](\d{2})/.exec(rawText);
    if (colonMatch) {
      m = parseInt(colonMatch[1], 10);
    }
  }

  target.setHours(h, m, 0, 0);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = target.getFullYear();
  const month = pad(target.getMonth() + 1);
  const d = pad(target.getDate());
  const hh = pad(h);
  const mm = pad(m);

  const targetDayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const nowDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.round((targetDayStart - nowDayStart) / (24 * 3600 * 1000));

  let human = '';
  if (dayDiff === 0) {
    human = `今天 ${hh}:${mm}`;
  } else if (dayDiff === 1) {
    human = `明天 ${hh}:${mm}`;
  } else if (dayDiff === 2) {
    human = `后天 ${hh}:${mm}`;
  } else {
    human = `${month}-${d} ${hh}:${mm}`;
  }

  return {
    dueDate: human,
    dueDateIso: `${y}-${month}-${d}T${hh}:${mm}:00`,
    dueTimestamp: target.getTime()
  };
}
