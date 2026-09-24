import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Download, 
  Check, 
  Sparkles, 
  X, 
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Plus,
  Bookmark,
  FileText
} from 'lucide-react';
import { TaskItem, TaskCategory, AppTheme, CalendarViewMode, ReportType, CherrySubtask } from '../types';

interface CalendarReportsViewProps {
  tasks: TaskItem[];
  theme: AppTheme;
  onSelectCategory?: (category: TaskCategory) => void;
}

interface TagPreset {
  id: string;
  name: string;
  tags: string[];
  includeUntagged: boolean;
}

const STORAGE_KEY_TAG_PRESETS = 'cherry_tag_presets_v1';

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTaskDate(task: TaskItem): string {
  if (task.dueDateIso) {
    const d = new Date(task.dueDateIso);
    if (!isNaN(d.getTime())) return toDateStr(d);
  }
  if (task.dueTimestamp) {
    const d = new Date(task.dueTimestamp);
    if (!isNaN(d.getTime())) return toDateStr(d);
  }
  if (task.completed && task.completedAt) {
    return toDateStr(new Date(task.completedAt));
  }
  return toDateStr(new Date(task.createdAt));
}

function getMondayOfCurrentWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 for Monday
  d.setDate(d.getDate() - day);
  return d;
}

const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const CalendarReportsView: React.FC<CalendarReportsViewProps> = ({
  tasks,
  theme: _theme,
  onSelectCategory: _onSelectCategory
}) => {
  // Main Sub-Tab: 'calendar' | 'heatmap' (Reports moved to modal inside calendar view)
  const [activeTab, setActiveTab] = useState<'calendar' | 'heatmap'>('calendar');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  // ----------------------------------------------------------------------
  // Universal Tag Filtering & Tag Presets (Requirement 2)
  // ----------------------------------------------------------------------
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => set.add(tag)));
    return Array.from(set);
  }, [tasks]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [includeUntagged, setIncludeUntagged] = useState<boolean>(true);
  const [isTagFilterExpanded, setIsTagFilterExpanded] = useState<boolean>(false);
  const [isSavingPreset, setIsSavingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  // Tag Presets from localStorage
  const [tagPresets, setTagPresets] = useState<TagPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TAG_PRESETS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse tag presets:', e);
    }
    return [
      { id: 'all', name: '全部', tags: [], includeUntagged: true }
    ];
  });

  // Sync selectedTags initially when allUniqueTags are loaded
  useEffect(() => {
    if (selectedTags.length === 0 && allUniqueTags.length > 0) {
      setSelectedTags(allUniqueTags);
    }
  }, [allUniqueTags]);

  // Close report modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isReportModalOpen) {
        setIsReportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReportModalOpen]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleSelectAllTags = () => {
    setSelectedTags(allUniqueTags);
    setIncludeUntagged(true);
  };

  const handleApplyPreset = (preset: TagPreset) => {
    if (preset.id === 'all') {
      setSelectedTags(allUniqueTags);
      setIncludeUntagged(true);
    } else {
      setSelectedTags(preset.tags);
      setIncludeUntagged(preset.includeUntagged);
    }
  };

  const handleSaveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: TagPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      tags: [...selectedTags],
      includeUntagged
    };
    const updated = [...tagPresets, newPreset];
    setTagPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TAG_PRESETS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save preset', e);
    }
    setNewPresetName('');
    setIsSavingPreset(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tagPresets.filter(p => p.id !== id);
    setTagPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_TAG_PRESETS, JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // Master Tag-Filtered Task Dataset for ALL 3 tabs
  const tagFilteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.tags.length === 0) {
        return includeUntagged;
      }
      return t.tags.some(tag => selectedTags.includes(tag));
    });
  }, [tasks, selectedTags, includeUntagged]);

  // Master Universal Filtered Task Dataset (Tag + Status) across ALL 3 tabs
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const universalFilteredTasks = useMemo(() => {
    return tagFilteredTasks.filter(task => {
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      return true;
    });
  }, [tagFilteredTasks, statusFilter]);

  // Comprehensive Cherry Clock analytics across universalFilteredTasks
  const allCherryStats = useMemo(() => {
    let totalCherryCount = 0;
    let totalCherryMinutes = 0;
    const cherryByDate: Record<string, { count: number; minutes: number; items: { subtask: CherrySubtask; parentTask: TaskItem }[] }> = {};

    universalFilteredTasks.forEach(task => {
      if (task.cherrySubtasks && task.cherrySubtasks.length > 0) {
        task.cherrySubtasks.forEach(cs => {
          totalCherryCount++;
          const mins = cs.durationMinutes || 25;
          totalCherryMinutes += mins;

          const dateKey = toDateStr(new Date(cs.completedAt));
          if (!cherryByDate[dateKey]) {
            cherryByDate[dateKey] = { count: 0, minutes: 0, items: [] };
          }
          cherryByDate[dateKey].count++;
          cherryByDate[dateKey].minutes += mins;
          cherryByDate[dateKey].items.push({ subtask: cs, parentTask: task });
        });
      }
    });

    return { totalCherryCount, totalCherryMinutes, cherryByDate };
  }, [universalFilteredTasks]);

  // ----------------------------------------------------------------------
  // Calendar State & Calculations
  // ----------------------------------------------------------------------
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('month');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [dayTasksModal, setDayTasksModal] = useState<{ date: string; tasks: TaskItem[] } | null>(null);

  const calendarTasks = universalFilteredTasks;

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    calendarTasks.forEach(task => {
      const dateKey = getTaskDate(task);
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (b.urgencyScore || 0) - (a.urgencyScore || 0);
      });
    });
    return map;
  }, [calendarTasks]);

  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const str = toDateStr(prevDate);
      days.push({ dateStr: str, dayNum, isCurrentMonth: false, isToday: str === todayStr });
    }

    for (let i = 1; i <= totalDays; i++) {
      const curDate = new Date(year, month, i);
      const str = toDateStr(curDate);
      days.push({ dateStr: str, dayNum: i, isCurrentMonth: true, isToday: str === todayStr });
    }

    const targetLength = days.length > 35 ? 42 : 35;
    const remaining = targetLength - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const str = toDateStr(nextDate);
      days.push({ dateStr: str, dayNum: i, isCurrentMonth: false, isToday: str === todayStr });
    }

    return days;
  }, [currentDate, todayStr]);

  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek);
    const days: { dateStr: string; dayNum: number; isToday: boolean; weekdayName: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() + i);
      const str = toDateStr(cur);
      days.push({
        dateStr: str,
        dayNum: cur.getDate(),
        isToday: str === todayStr,
        weekdayName: WEEKDAY_NAMES[i]
      });
    }
    return days;
  }, [currentDate, todayStr]);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (calendarMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (calendarMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  // ----------------------------------------------------------------------
  // Heatmap State & Calculations (using universalFilteredTasks)
  // ----------------------------------------------------------------------
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string>(todayStr);

  const heatmapData = useMemo(() => {
    const weeksCount = 26;
    const end = new Date(today);
    const endDayOfWeek = (end.getDay() + 6) % 7;
    end.setDate(end.getDate() + (6 - endDayOfWeek));

    const start = new Date(end);
    start.setDate(start.getDate() - (weeksCount * 7 - 1));

    const dateCounts: Record<string, { completed: number; created: number }> = {};
    universalFilteredTasks.forEach(t => {
      if (t.completed && t.completedAt) {
        const dStr = toDateStr(new Date(t.completedAt));
        if (!dateCounts[dStr]) dateCounts[dStr] = { completed: 0, created: 0 };
        dateCounts[dStr].completed++;
      }
      const cStr = toDateStr(new Date(t.createdAt));
      if (!dateCounts[cStr]) dateCounts[cStr] = { completed: 0, created: 0 };
      dateCounts[cStr].created++;
    });

    const weeks: Array<Array<{
      dateStr: string;
      count: number;
      level: 0 | 1 | 2 | 3 | 4;
      isFuture: boolean;
      isToday: boolean;
    }>> = [];

    const cursor = new Date(start);
    let currentWeek: Array<any> = [];
    let totalCompleted = 0;
    let maxSingleDay = 0;

    while (cursor <= end) {
      const dStr = toDateStr(cursor);
      const isFuture = cursor > today;
      const isToday = dStr === todayStr;
      const entry = dateCounts[dStr] || { completed: 0, created: 0 };
      const metricCount = statusFilter === 'completed' ? entry.completed : statusFilter === 'pending' ? entry.created : (entry.completed + entry.created);

      if (!isFuture) {
        totalCompleted += entry.completed;
        if (metricCount > maxSingleDay) maxSingleDay = metricCount;
      }

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (metricCount >= 5) level = 4;
      else if (metricCount >= 3) level = 3;
      else if (metricCount >= 2) level = 2;
      else if (metricCount >= 1) level = 1;

      currentWeek.push({
        dateStr: dStr,
        count: metricCount,
        level,
        isFuture,
        isToday
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Current streak
    let currentStreak = 0;
    const checkCursor = new Date(today);
    while (true) {
      const str = toDateStr(checkCursor);
      const done = (dateCounts[str]?.completed || 0) > 0;
      if (done) {
        currentStreak++;
        checkCursor.setDate(checkCursor.getDate() - 1);
      } else {
        if (str === todayStr) {
          checkCursor.setDate(checkCursor.getDate() - 1);
          continue;
        }
        break;
      }
    }

    return { weeks, totalCompleted, maxSingleDay, currentStreak };
  }, [universalFilteredTasks, statusFilter, today, todayStr]);

  const selectedHeatmapTasks = useMemo(() => {
    return universalFilteredTasks.filter(t => {
      const isDone = t.completed && t.completedAt && toDateStr(new Date(t.completedAt)) === selectedHeatmapDate;
      const isCreated = toDateStr(new Date(t.createdAt)) === selectedHeatmapDate;
      const isDue = getTaskDate(t) === selectedHeatmapDate;
      return isDone || isCreated || isDue;
    });
  }, [universalFilteredTasks, selectedHeatmapDate]);

  // ----------------------------------------------------------------------
  // Reports State & Arbitrary Range Selection (Requirement 1)
  // ----------------------------------------------------------------------
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [reportDate, setReportDate] = useState<string>(todayStr);

  // Arbitrary Range for Weekly/Custom Report
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => {
    const monday = getMondayOfCurrentWeek();
    return toDateStr(monday);
  });
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => {
    const monday = getMondayOfCurrentWeek();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return toDateStr(sunday);
  });

  const [isCopied, setIsCopied] = useState(false);
  const [aiPolishSummary, setAiPolishSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Quick preset ranges
  const setRangeThisWeek = () => {
    const mon = getMondayOfCurrentWeek();
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    setRangeStartDate(toDateStr(mon));
    setRangeEndDate(toDateStr(sun));
  };

  const setRangeLastWeek = () => {
    const mon = getMondayOfCurrentWeek();
    mon.setDate(mon.getDate() - 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    setRangeStartDate(toDateStr(mon));
    setRangeEndDate(toDateStr(sun));
  };

  const setRangeLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    setRangeStartDate(toDateStr(start));
    setRangeEndDate(toDateStr(end));
  };

  const reportData = useMemo(() => {
    if (reportType === 'daily') {
      const completedList = universalFilteredTasks.filter(t => t.completed && t.completedAt && toDateStr(new Date(t.completedAt)) === reportDate);
      const inProgressList = universalFilteredTasks.filter(t => !t.completed && (getTaskDate(t) === reportDate || t.category === '即刻完成'));
      const tomorrow = new Date(reportDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = toDateStr(tomorrow);
      const upcomingList = universalFilteredTasks.filter(t => !t.completed && (getTaskDate(t) === tomorrowStr || t.category === '近期完成')).slice(0, 4);

      return {
        title: `工作日报 · ${reportDate}`,
        period: reportDate,
        completedList,
        inProgressList,
        upcomingList
      };
    } else {
      const sDate = rangeStartDate || '2000-01-01';
      const eDate = rangeEndDate || '2099-12-31';

      const completedList = universalFilteredTasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const dStr = toDateStr(new Date(t.completedAt));
        return dStr >= sDate && dStr <= eDate;
      });

      const inProgressList = universalFilteredTasks.filter(t => !t.completed).slice(0, 6);
      const upcomingList = universalFilteredTasks.filter(t => !t.completed && t.category === '规划待办').slice(0, 5);

      return {
        title: `周期报告 · ${sDate} ~ ${eDate}`,
        period: `${sDate} ~ ${eDate}`,
        completedList,
        inProgressList,
        upcomingList
      };
    }
  }, [reportType, reportDate, rangeStartDate, rangeEndDate, universalFilteredTasks]);

  const markdownContent = useMemo(() => {
    let md = `# ${reportData.title} (${reportData.period})\n\n`;
    if (aiPolishSummary) {
      md += `> ${aiPolishSummary}\n\n`;
    }
    md += `## 已完成 (${reportData.completedList.length})\n`;
    if (reportData.completedList.length === 0) {
      md += `- 无\n`;
    } else {
      reportData.completedList.forEach(t => {
        md += `- [x] ${t.title}\n`;
      });
    }

    md += `\n## 进行中 (${reportData.inProgressList.length})\n`;
    if (reportData.inProgressList.length === 0) {
      md += `- 无\n`;
    } else {
      reportData.inProgressList.forEach(t => {
        md += `- [ ] ${t.title}\n`;
      });
    }

    md += `\n## 规划 (${reportData.upcomingList.length})\n`;
    if (reportData.upcomingList.length === 0) {
      md += `- 无\n`;
    } else {
      reportData.upcomingList.forEach(t => {
        md += `- ${t.title}\n`;
      });
    }
    return md;
  }, [reportData, aiPolishSummary]);

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType === 'daily' ? '日报_' + reportDate : '周报_' + rangeStartDate + '_' + rangeEndDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateAiSummary = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const topTasks = reportData.completedList.slice(0, 3).map(t => t.title).join('、');
      if (topTasks) {
        setAiPolishSummary(`聚焦推进 ${topTasks}，完成 ${reportData.completedList.length} 项关键交付，整体按排期推进。`);
      } else {
        setAiPolishSummary(`主要推进需求梳理与规划，跟进待办 ${reportData.inProgressList.length} 项，节奏平稳。`);
      }
      setIsGeneratingAi(false);
    }, 400);
  };

  return (
    <div className="w-full space-y-2 select-none">
      {/* 1. Top Sub-Tab Switcher & Universal Status Filter */}
      <div className="flex items-center justify-between gap-1 border-b border-[var(--border-subtle)] pb-2">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'calendar'
                ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            日历
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === 'heatmap'
                ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold shadow-xs'
                : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
            }`}
          >
            热点
          </button>
        </div>

        {/* Universal Status Filter (shared across Calendar, Heatmap, Reports) */}
        <div className="flex items-center gap-0.5 bg-[var(--chip-bg)] p-0.5 rounded-lg border border-[var(--chip-border)]">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
              statusFilter === 'all' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-medium shadow-xs' : 'text-[var(--text-faint)] hover:text-[var(--text-sub)]'
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
              statusFilter === 'pending' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-medium shadow-xs' : 'text-[var(--text-faint)] hover:text-[var(--text-sub)]'
            }`}
          >
            待办
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
              statusFilter === 'completed' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-medium shadow-xs' : 'text-[var(--text-faint)] hover:text-[var(--text-sub)]'
            }`}
          >
            完成
          </button>
        </div>
      </div>

      {/* 2. Universal Tag Filter & Presets Bar (Requirement 2) */}
      <div className="p-1.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-1.5">
        <div className="flex items-center justify-between gap-1 text-[11px]">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 pr-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setIsTagFilterExpanded(prev => !prev)}
              className="flex items-center gap-1 text-[var(--text-main)] font-medium shrink-0 hover:opacity-80"
              title="展开/收起标签筛选"
            >
              <TagIcon className="w-3 h-3 text-indigo-400" />
              <span>标签 ({selectedTags.length}/{allUniqueTags.length})</span>
            </button>

            {/* Tag Preset Chips */}
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {tagPresets.map(preset => (
                <div
                  key={preset.id}
                  className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[var(--bg-panel)] border border-[var(--chip-border)] text-[10px]"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="hover:text-indigo-400 transition-colors"
                  >
                    {preset.name}
                  </button>
                  {preset.id !== 'all' && (
                    <button
                      type="button"
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      className="text-[var(--text-faint)] hover:text-rose-400 ml-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setIsSavingPreset(true)}
                className="px-1.5 py-0.2 rounded bg-[var(--bg-panel)] text-[10px] text-indigo-400 hover:bg-[var(--chip-hover)] border border-[var(--chip-border)] flex items-center gap-0.5"
                title="将当前选中的标签保存为组合"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>存组合</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleSelectAllTags}
              className="text-[10px] text-blue-400 hover:underline shrink-0"
            >
              全选
            </button>
          </div>
        </div>

        {/* Inline Save Preset Input */}
        {isSavingPreset && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)] text-xs">
            <Bookmark className="w-3 h-3 text-indigo-400 shrink-0" />
            <input
              type="text"
              placeholder="输入组合名称（如：工作项目）"
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              className="flex-1 bg-[var(--bg-panel)] px-2 py-0.5 rounded text-xs text-[var(--text-main)] outline-none border border-[var(--chip-border)]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveCurrentAsPreset}
              className="px-2 py-0.5 rounded bg-indigo-500 text-white text-[11px] whitespace-nowrap"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setIsSavingPreset(false)}
              className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text-main)] px-1"
            >
              取消
            </button>
          </div>
        )}

        {/* Scrollable / Multi-line Tag Chips: Click to toggle, Click ✕ to remove */}
        <div className={`flex flex-wrap gap-1 ${isTagFilterExpanded ? '' : 'max-h-12 overflow-y-auto'}`}>
          {allUniqueTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <span
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-[var(--bg-panel)] text-[var(--text-faint)] border border-transparent opacity-60'
                }`}
              >
                <span>#{tag}</span>
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTag(tag, e)}
                    className="hover:text-rose-400 font-bold ml-0.5"
                    title="移除该标签"
                  >
                    ✕
                  </button>
                )}
              </span>
            );
          })}

          {/* Include Untagged Toggle Chip */}
          <span
            onClick={() => setIncludeUntagged(prev => !prev)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] cursor-pointer transition-colors ${
              includeUntagged
                ? 'bg-zinc-500/20 text-[var(--text-sub)] border border-zinc-500/30'
                : 'bg-[var(--bg-panel)] text-[var(--text-faint)] border border-transparent opacity-60'
            }`}
          >
            <span>无标签事项</span>
            {includeUntagged ? <span>✓</span> : <span>✕</span>}
          </span>
        </div>
      </div>

      {/* 3. Distinct Visual Transition Divider between Universal Controls and Tab Views */}
      <div className="relative py-2 flex items-center justify-center">
        <div className="w-full border-t border-[var(--border-subtle)]" />
        <div className="absolute px-3 py-0.5 rounded-full text-[10px] font-medium tracking-wider text-[var(--text-sub)] bg-[var(--bg-panel)] border border-[var(--chip-border)] shadow-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span>
            {activeTab === 'calendar' ? '日历视图' : '活跃热度'}
          </span>
          <span className="text-[9px] text-[var(--text-faint)]">
            ({statusFilter === 'all' ? '全部' : statusFilter === 'pending' ? '待办' : '完成'} · {universalFilteredTasks.length}项)
          </span>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* Tab 1: Calendar View (Compact, Fixed Heights, Clean)                   */}
      {/* ====================================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-2">
          {/* Calendar Navigation Bar */}
          <div className="flex items-center justify-between gap-1 py-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="px-2 py-1 rounded text-xs bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)] whitespace-nowrap"
              >
                今天
              </button>
              <button
                type="button"
                onClick={handlePrev}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--chip-hover)] text-[var(--text-sub)]"
                title="上一期"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--chip-hover)] text-[var(--text-sub)]"
                title="下一期"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs font-semibold text-[var(--text-main)] ml-0.5 whitespace-nowrap">
                {currentDate.getFullYear()}年 {MONTH_NAMES[currentDate.getMonth()]}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Report Modal Trigger Button in Calendar View */}
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="h-6 px-2.5 rounded-lg bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)] flex items-center gap-1.5 text-[11px] font-medium transition-all shadow-xs cursor-pointer active:scale-95"
                title="打开任务效能与工作报告弹窗"
              >
                <FileText className="w-3 h-3 text-sky-400" />
                <span>生成报告</span>
              </button>

              {/* Mode: 月 / 周 / 日程 */}
              <div className="flex items-center bg-[var(--chip-bg)] p-0.5 rounded-lg border border-[var(--chip-border)]">
                <button
                  type="button"
                  onClick={() => setCalendarMode('month')}
                  className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${
                    calendarMode === 'month' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-medium' : 'text-[var(--text-faint)]'
                  }`}
                >
                  月
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('week')}
                  className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${
                    calendarMode === 'week' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-medium' : 'text-[var(--text-faint)]'
                  }`}
                >
                  周
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('agenda')}
                  className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${
                    calendarMode === 'agenda' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-medium' : 'text-[var(--text-faint)]'
                  }`}
                >
                  日程
                </button>
              </div>
            </div>
          </div>

          {/* Month Matrix (Fixed cell height, single-line truncated tasks) */}
          {calendarMode === 'month' && (
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-panel)]">
              {/* Weekday Header */}
              <div className="grid grid-cols-7 border-b border-[var(--border-subtle)] bg-[var(--chip-bg)] text-center text-[10px] font-medium text-[var(--text-sub)] py-1">
                {WEEKDAY_NAMES.map(w => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              {/* 7 Columns Matrix with Strictly Fixed Height Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-subtle)]">
                {monthMatrix.map(day => {
                  const dayTasks = tasksByDate[day.dateStr] || [];
                  const topTasks = dayTasks.slice(0, 2);
                  const moreCount = dayTasks.length - 2;

                  return (
                    <div
                      key={day.dateStr}
                      className={`h-[68px] sm:h-[78px] p-1 flex flex-col justify-between overflow-hidden transition-colors ${
                        day.isCurrentMonth ? 'bg-transparent' : 'bg-black/10 dark:bg-white/[0.015] opacity-40'
                      } ${day.isToday ? 'bg-blue-500/10' : ''}`}
                    >
                      {/* Date Header */}
                      <div className="flex items-center justify-between leading-none">
                        <span
                          className={`text-[10px] font-mono leading-none w-4 h-4 flex items-center justify-center rounded-full ${
                            day.isToday
                              ? 'bg-blue-500 text-white font-bold'
                              : day.isCurrentMonth
                              ? 'text-[var(--text-main)]'
                              : 'text-[var(--text-faint)]'
                          }`}
                        >
                          {day.dayNum}
                        </span>
                        <div className="flex items-center gap-1">
                          {allCherryStats.cherryByDate[day.dateStr] && (
                            <span 
                              className="text-[9px] text-rose-400 font-mono flex items-center gap-0.5" 
                              title={`本日达成 ${allCherryStats.cherryByDate[day.dateStr].count} 次樱桃专注 (${allCherryStats.cherryByDate[day.dateStr].minutes}分钟)`}
                            >
                              <span>🍒</span>
                              <span>{allCherryStats.cherryByDate[day.dateStr].count}</span>
                            </span>
                          )}
                          {dayTasks.length > 0 && (
                            <span className="text-[9px] text-[var(--text-faint)] font-mono">
                              {dayTasks.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Task Pills (Strictly Single Line, Truncated) */}
                      <div className="space-y-0.5 overflow-hidden flex-1 mt-0.5">
                        {topTasks.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTask(t)}
                            className={`w-full text-left h-[18px] px-1 rounded flex items-center gap-1 text-[10px] truncate border cursor-pointer ${
                              t.completed
                                ? 'line-through opacity-50 bg-[var(--chip-bg)] border-transparent text-[var(--text-faint)]'
                                : 'bg-[var(--chip-bg)] border-[var(--chip-border)] text-[var(--text-main)] hover:bg-[var(--chip-hover)]'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400/80" />
                            {t.cherrySubtasks && t.cherrySubtasks.length > 0 && (
                              <span className="text-[10px] text-rose-400 select-none">🍒</span>
                            )}
                            <span className="truncate whitespace-nowrap">{t.title}</span>
                          </button>
                        ))}

                        {moreCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setDayTasksModal({ date: day.dateStr, tasks: dayTasks })}
                            className="text-[9px] font-mono text-blue-400 hover:underline leading-none pl-0.5"
                          >
                            +{moreCount}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week Mode */}
          {calendarMode === 'week' && (
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-panel)]">
              <div className="grid grid-cols-7 divide-x divide-[var(--border-subtle)]">
                {weekDays.map(col => {
                  const dayTasks = tasksByDate[col.dateStr] || [];
                  return (
                    <div
                      key={col.dateStr}
                      className={`min-h-[260px] max-h-[360px] flex flex-col ${
                        col.isToday ? 'bg-blue-500/5' : 'bg-transparent'
                      }`}
                    >
                      <div className="p-1 border-b border-[var(--border-subtle)] text-center bg-[var(--chip-bg)]">
                        <div className="text-[10px] text-[var(--text-sub)]">{col.weekdayName}</div>
                        <div className={`text-xs font-mono font-bold ${col.isToday ? 'text-blue-400' : 'text-[var(--text-main)]'}`}>
                          {col.dayNum}
                        </div>
                        {allCherryStats.cherryByDate[col.dateStr] && (
                          <div className="text-[9px] text-rose-400 font-mono flex items-center justify-center gap-0.5 mt-0.5">
                            <span>🍒</span>
                            <span>{allCherryStats.cherryByDate[col.dateStr].count}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-1 space-y-1 overflow-y-auto flex-1">
                        {dayTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-1 rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[10px] truncate cursor-pointer hover:bg-[var(--chip-hover)]"
                          >
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400/80" />
                              {t.cherrySubtasks && t.cherrySubtasks.length > 0 && (
                                <span className="text-[10px] text-rose-400 select-none">🍒</span>
                              )}
                              <span className={`truncate ${t.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-main)]'}`}>
                                {t.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda Mode */}
          {calendarMode === 'agenda' && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2.5 space-y-2 max-h-[380px] overflow-y-auto">
              {Object.keys(tasksByDate).length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--text-faint)]">暂无事项</div>
              ) : (
                Object.keys(tasksByDate).sort().map(dStr => {
                  const dayTasks = tasksByDate[dStr];
                  return (
                    <div key={dStr} className="space-y-1">
                      <div className="text-[11px] font-mono font-semibold text-[var(--text-sub)]">
                        {dStr} ({dayTasks.length})
                      </div>
                      <div className="space-y-1">
                        {dayTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className="p-1.5 rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs flex items-center justify-between gap-2 cursor-pointer hover:bg-[var(--chip-hover)]"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400/80" />
                              <span className={`truncate ${t.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-main)]'}`}>
                                {t.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* Tab 2: Activity Heatmap (Compact)                                      */}
      {/* ====================================================================== */}
      {activeTab === 'heatmap' && (
        <div className="space-y-2.5">
          {/* Minimal 4-Pill Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs flex items-center justify-between">
              <span className="text-[var(--text-faint)]">已完成</span>
              <span className="font-mono font-bold text-[var(--text-main)]">{heatmapData.totalCompleted}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs flex items-center justify-between">
              <span className="text-[var(--text-faint)]">连续打卡</span>
              <span className="font-mono font-bold text-orange-400">{heatmapData.currentStreak}天</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs flex items-center justify-between">
              <span className="text-[var(--text-faint)]">单日最高</span>
              <span className="font-mono font-bold text-[var(--text-main)]">{heatmapData.maxSingleDay}项</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs flex items-center justify-between">
              <span className="text-[var(--text-faint)]">当前范围</span>
              <span className="font-mono font-bold text-[var(--text-main)]">{universalFilteredTasks.length}项</span>
            </div>
            {/* Cherry Clock Global Stats Pill */}
            <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs flex items-center justify-between col-span-2 sm:col-span-4">
              <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="text-sm">🍒</span>
                <span>樱桃专注达成</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-rose-400">{allCherryStats.totalCherryCount} 颗</span>
                <span className="text-[10px] text-[var(--text-faint)]">({allCherryStats.totalCherryMinutes} 分钟专注)</span>
              </div>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] overflow-x-auto">
            <div className="inline-flex gap-1">
              <div className="flex flex-col justify-between pr-1 text-[9px] text-[var(--text-faint)] font-mono">
                <span>一</span>
                <span>三</span>
                <span>五</span>
                <span>日</span>
              </div>
              {heatmapData.weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map(day => (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedHeatmapDate(day.dateStr)}
                      className={`w-3 h-3 rounded-[2px] transition-all cursor-pointer ${
                        day.isFuture
                          ? 'opacity-20 bg-transparent border border-dashed border-[var(--chip-border)] pointer-events-none'
                          : day.dateStr === selectedHeatmapDate
                          ? 'ring-1.5 ring-blue-500 scale-110 z-10'
                          : 'hover:scale-125'
                      } ${
                        day.level === 0
                          ? 'bg-[var(--chip-bg)]'
                          : day.level === 1
                          ? 'bg-emerald-800/70'
                          : day.level === 2
                          ? 'bg-emerald-600'
                          : day.level === 3
                          ? 'bg-emerald-500'
                          : 'bg-emerald-400'
                      }`}
                      title={`${day.dateStr}: ${day.count}项`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date List */}
          <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--text-main)] font-semibold">{selectedHeatmapDate}</span>
              <span className="text-[var(--text-faint)]">{selectedHeatmapTasks.length} 任务</span>
            </div>

            {/* Cherry Clock subtasks completed on this date */}
            {allCherryStats.cherryByDate[selectedHeatmapDate] && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <span>🍒</span>
                    <span>本日收获 {allCherryStats.cherryByDate[selectedHeatmapDate].count} 颗樱桃</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-faint)]">
                    共 {allCherryStats.cherryByDate[selectedHeatmapDate].minutes} 分钟
                  </span>
                </div>
                <div className="space-y-1">
                  {allCherryStats.cherryByDate[selectedHeatmapDate].items.map((item, idx) => (
                    <div
                      key={item.subtask.id || idx}
                      onClick={() => setSelectedTask(item.parentTask)}
                      className="flex items-center justify-between text-[11px] bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 rounded px-2 py-1 cursor-pointer transition-colors"
                      title={`点击查看父任务: ${item.parentTask.title}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs">🍒</span>
                        <span className="font-medium text-[var(--text-main)] truncate">
                          {item.subtask.title || `专注完成 (${item.subtask.durationMinutes}m)`}
                        </span>
                        <span className="text-[10px] text-[var(--text-faint)] truncate">
                          · {item.parentTask.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-faint)] font-mono shrink-0 ml-1">
                        {new Date(item.subtask.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedHeatmapTasks.length === 0 ? (
              <div className="text-center py-2 text-[11px] text-[var(--text-faint)]">无普通任务记录</div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedHeatmapTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-1.5 rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs flex items-center justify-between cursor-pointer hover:bg-[var(--chip-hover)]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.cherrySubtasks && t.cherrySubtasks.length > 0 && (
                        <span className="text-[11px] select-none">🍒</span>
                      )}
                      <span className={`truncate ${t.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-main)]'}`}>
                        {t.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* Report Modal Dialog (Requirement 3: 从日历视窗唤起报告弹窗)               */}
      {/* ====================================================================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-medium)] shadow-2xl overflow-hidden text-left"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-drawer) 97%, transparent)',
              backdropFilter: 'blur(36px) saturate(190%)',
              WebkitBackdropFilter: 'blur(36px) saturate(190%)',
            }}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--chip-bg)]/40">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-xs">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-main)]">
                    任务效能与工作报告
                  </h3>
                  <p className="text-[10px] text-[var(--text-faint)]">
                    日报总结、周期报表导出与 AI 智能润色
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] transition-colors cursor-pointer"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable Report Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {/* Toolbar */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-2">
                {/* Row 1: Mode Switcher & Actions */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-0.5 bg-[var(--chip-bg)] p-0.5 rounded-lg border border-[var(--chip-border)]">
                    <button
                      type="button"
                      onClick={() => setReportType('daily')}
                      className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors cursor-pointer ${
                        reportType === 'daily'
                          ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold shadow-xs'
                          : 'text-[var(--text-faint)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      日报
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('weekly')}
                      className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors cursor-pointer ${
                        reportType === 'weekly'
                          ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold shadow-xs'
                          : 'text-[var(--text-faint)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      周期报表
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleGenerateAiSummary}
                      disabled={isGeneratingAi}
                      className="px-2 py-1 rounded text-xs bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 whitespace-nowrap flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isGeneratingAi ? '...' : 'AI总结'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-2.5 py-1 rounded text-xs bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-medium)] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? '已复制' : '复制'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportMarkdown}
                      className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] cursor-pointer"
                      title="导出 .md"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Date Selector (Daily date vs Arbitrary Time Range) */}
                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[var(--border-subtle)] text-xs">
                  {reportType === 'daily' ? (
                    <>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setReportDate(todayStr)}
                          className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap cursor-pointer ${
                            reportDate === todayStr
                              ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold'
                              : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                          } border border-[var(--chip-border)]`}
                        >
                          今天
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const y = new Date();
                            y.setDate(y.getDate() - 1);
                            setReportDate(toDateStr(y));
                          }}
                          className="px-2 py-0.5 rounded text-[11px] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] whitespace-nowrap cursor-pointer"
                        >
                          昨天
                        </button>
                      </div>
                      <input
                        aria-label="选择日报日期"
                        type="date"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                        className="h-6 px-1.5 text-xs font-mono rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-main)] outline-none"
                      />
                    </>
                  ) : (
                    /* Requirement 1: Arbitrary date range components */
                    <div className="w-full flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={setRangeThisWeek}
                          className="px-1.5 py-0.5 rounded text-[11px] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] whitespace-nowrap cursor-pointer"
                        >
                          本周
                        </button>
                        <button
                          type="button"
                          onClick={setRangeLastWeek}
                          className="px-1.5 py-0.5 rounded text-[11px] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] whitespace-nowrap cursor-pointer"
                        >
                          上周
                        </button>
                        <button
                          type="button"
                          onClick={setRangeLast7Days}
                          className="px-1.5 py-0.5 rounded text-[11px] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] whitespace-nowrap cursor-pointer"
                        >
                          近7天
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          aria-label="选择起始日期"
                          type="date"
                          value={rangeStartDate}
                          onChange={e => setRangeStartDate(e.target.value)}
                          className="h-6 px-1 text-[11px] font-mono rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-main)] outline-none"
                        />
                        <span className="text-[var(--text-faint)] font-mono">~</span>
                        <input
                          aria-label="选择结束日期"
                          type="date"
                          value={rangeEndDate}
                          onChange={e => setRangeEndDate(e.target.value)}
                          className="h-6 px-1 text-[11px] font-mono rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-main)] outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Formatted Report */}
              <div className="p-3 sm:p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <span className="font-semibold text-sm text-[var(--text-main)] truncate">{reportData.title}</span>
                  <span className="text-[11px] text-[var(--text-faint)] font-mono shrink-0 ml-1">{reportData.period}</span>
                </div>

                {aiPolishSummary && (
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs">
                    💡 {aiPolishSummary}
                  </div>
                )}

                {/* Done */}
                <div className="space-y-1">
                  <div className="font-semibold text-[var(--text-main)]">已完成 ({reportData.completedList.length})</div>
                  {reportData.completedList.length === 0 ? (
                    <div className="text-[var(--text-faint)] pl-2">无</div>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {reportData.completedList.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate">• {t.title}</span>
                          <span className="text-[var(--text-faint)] shrink-0 ml-1">{t.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending */}
                <div className="space-y-1">
                  <div className="font-semibold text-[var(--text-main)]">进行中 ({reportData.inProgressList.length})</div>
                  {reportData.inProgressList.length === 0 ? (
                    <div className="text-[var(--text-faint)] pl-2">无</div>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {reportData.inProgressList.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate">• {t.title}</span>
                          <span className="text-[var(--text-faint)] shrink-0 ml-1">{t.dueDate || t.category}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Planning */}
                <div className="space-y-1">
                  <div className="font-semibold text-[var(--text-main)]">规划 ({reportData.upcomingList.length})</div>
                  {reportData.upcomingList.length === 0 ? (
                    <div className="text-[var(--text-faint)] pl-2">无</div>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {reportData.upcomingList.map(t => (
                        <div key={t.id} className="text-[11px] truncate">
                          • {t.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Read-Only Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border-medium)] p-4 space-y-3 bg-[var(--bg-panel)] shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  {selectedTask.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm font-semibold text-[var(--text-main)] leading-snug">
              {selectedTask.title}
            </div>

            <div className="p-2 rounded-lg bg-[var(--chip-bg)] space-y-1 text-xs text-[var(--text-sub)]">
              <div className="flex justify-between">
                <span>截止:</span>
                <span className="font-mono text-[var(--text-main)]">{selectedTask.dueDate || '未设'}</span>
              </div>
              <div className="flex justify-between">
                <span>创建:</span>
                <span className="font-mono text-[var(--text-main)]">{toDateStr(new Date(selectedTask.createdAt))}</span>
              </div>
              <div className="flex justify-between">
                <span>状态:</span>
                <span className={selectedTask.completed ? 'text-emerald-400' : 'text-blue-400'}>
                  {selectedTask.completed ? '已完成' : '待办'}
                </span>
              </div>
            </div>

            {selectedTask.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTask.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--tag-bg)] text-[var(--tag-text)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Cherry Clock subtasks summary */}
            {selectedTask.cherrySubtasks && selectedTask.cherrySubtasks.length > 0 && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <span>🍒</span>
                    <span>樱桃专注记录 ({selectedTask.cherrySubtasks.length}次)</span>
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-faint)]">
                    累计 {selectedTask.cherrySubtasks.reduce((sum, c) => sum + (c.durationMinutes || 25), 0)} 分钟
                  </span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {selectedTask.cherrySubtasks.map((cherry, idx) => (
                    <div
                      key={cherry.id || idx}
                      className="flex items-center justify-between text-[10px] bg-rose-500/5 border border-rose-500/10 rounded px-2 py-0.5"
                    >
                      <div className="flex items-center gap-1 text-[var(--text-main)]">
                        <span>🍒</span>
                        <span>{cherry.title || `专注完成 (${cherry.durationMinutes}m)`}</span>
                      </div>
                      <span className="text-[9px] text-[var(--text-faint)] font-mono">
                        {new Date(cherry.completedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}{' '}
                        {new Date(cherry.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overflow Day Tasks Modal */}
      {dayTasksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-xl border border-[var(--border-medium)] p-3 space-y-2 bg-[var(--bg-panel)] shadow-xl">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-mono font-semibold text-[var(--text-main)]">
                {dayTasksModal.date} ({dayTasksModal.tasks.length})
              </span>
              <button
                type="button"
                onClick={() => setDayTasksModal(null)}
                className="w-5 h-5 rounded flex items-center justify-center text-[var(--text-sub)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {dayTasksModal.tasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setDayTasksModal(null);
                    setSelectedTask(t);
                  }}
                  className="p-1.5 rounded bg-[var(--chip-bg)] text-xs flex items-center justify-between cursor-pointer hover:bg-[var(--chip-hover)]"
                >
                  <span className={`truncate ${t.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-main)]'}`}>
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
