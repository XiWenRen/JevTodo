/**
 * Task and Jev model types for Jev Minimal Todo
 */

export type TaskCategory = '即刻完成' | '近期完成' | '规划待办';

export type ActiveView = '即刻完成' | '近期完成' | '规划待办' | '全部事项';

export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface TaskItem {
  id: string;
  title: string;
  rawInput: string;
  category: TaskCategory;
  priority: TaskPriority;
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
  priority: TaskPriority;
  urgencyScore: number;
  tags: string[];
  dueDate?: string;
  dueDateIso?: string;
  dueTimestamp?: number;
  confidence: number;
  rawJevAnswers?: Record<string, any>;
  source: 'jev-api' | 'jev-hybrid-engine';
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
}
