/**
 * Task and Jev model types for Jev Minimal Todo
 */

export type TaskCategory = '即刻完成' | '近期完成' | '规划待办';

export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface TaskItem {
  id: string;
  title: string;
  rawInput: string;
  category: TaskCategory;
  priority: TaskPriority;
  urgencyScore: number; // 0.0 to 1.0 from Jev score
  tags: string[]; // flomo-style tags e.g. ["工作", "方案"]
  dueDate?: string; // e.g. "2026-09-22 17:00" or "今天 18:00"
  dueDateIso?: string; // Standard ISO string if available
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  jevConfidence?: number;
  isStale?: boolean; // Jev flagged as stagnant / expired
  cleanupSuggested?: boolean;
  cleanupReason?: string;
}

export interface JevDecision {
  category: TaskCategory;
  priority: TaskPriority;
  urgencyScore: number;
  tags: string[];
  dueDate?: string;
  dueDateIso?: string;
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
