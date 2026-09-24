/**
 * Task and Jev model types for Jev Minimal Todo
 */

export type TaskCategory = '即刻完成' | '近期完成' | '规划待办';

export type ActiveView = '即刻完成' | '近期完成' | '规划待办' | '全部事项' | '轨迹';

export type CalendarViewMode = 'month' | 'week' | 'agenda';
export type ReportType = 'daily' | 'weekly';

export interface ActivityDayData {
  date: string; // YYYY-MM-DD
  count: number;
  completedCount: number;
  createdCount: number;
  tasks: TaskItem[];
  level: 0 | 1 | 2 | 3 | 4;
}

export interface CherrySubtask {
  id: string;
  taskId: string;
  title: string;
  durationMinutes: number;
  completedAt: number;
  autoCompleted: true;
}

export interface TaskItem {
  id: string;
  title: string;
  rawInput: string;
  category: TaskCategory;
  urgencyScore: number; // 0.0 to 1.0 from Jev score
  tags: string[]; // flomo-style tags e.g. ["工作", "方案"]
  dueDate?: string; // Human-friendly display string
  dueDateIso?: string; // Standard ISO string if available e.g. "2026-09-22T14:00:00"
  dueTimestamp?: number; // Concrete epoch millisecond timestamp e.g. 1790146800000
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  notes?: string[]; // Supplemental notes/information added over time
  cherrySubtasks?: CherrySubtask[]; // 樱桃时钟到期后自动生成的只读子任务
  jevConfidence?: number;
  isStale?: boolean; // Jev flagged as stagnant / expired
  cleanupSuggested?: boolean;
  cleanupReason?: string;
}

export interface JevDuplicateCheckResult {
  isDuplicate: boolean;
  matchedTask?: TaskItem;
  similarity: number; // 0.0 to 1.0
  reason: string;
}

export interface JevDecision {
  category: TaskCategory;
  urgencyScore: number;
  tags: string[];
  dueDate?: string;
  dueDateIso?: string;
  dueTimestamp?: number;
  confidence: number;
  rawJevAnswers?: Record<string, any>;
  source: string;
}

export interface JevCleanupItem {
  task: TaskItem;
  suggestedAction: 'archive' | 'defer' | 'bump' | 'keep';
  reason: string;
  confidence: number;
}

export type AppTheme = 'obsidian' | 'paper' | 'sand' | 'mist';

export interface AppSettings {
  jevApiKey: string;
  jevEndpoint: string;
  autoCleanupEnabled: boolean;
  autoCleanupDays: number;
  widgetWidth: 'compact' | 'standard' | 'fluid';
  showCompleted: boolean;
  theme: AppTheme;
  cherryDurationMinutes?: number; // 樱桃时钟默认时长（分钟），默认25
  cherrySoundEnabled?: boolean;  // 樱桃时钟到期提示音，默认开启
  allowFallback?: boolean; // 是否允许降级到 Cherry 本地引擎（默认关闭）
}
