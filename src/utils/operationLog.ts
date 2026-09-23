import { OperationLogItem, OperationType, TaskSnapshot } from '../types/operationLog';
import { TaskItem } from '../types';

const STORAGE_KEY_OPERATION_LOGS = 'jev_minimal_todo_operation_logs_v1';
const MAX_LOGS_COUNT = 100;

/**
 * Read all operation logs from localStorage
 */
export function getOperationLogs(): OperationLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERATION_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read operation logs from localStorage:', err);
    return [];
  }
}

/**
 * Save operation logs to localStorage
 */
export function saveOperationLogs(logs: OperationLogItem[]): void {
  try {
    const trimmed = logs.slice(0, MAX_LOGS_COUNT);
    localStorage.setItem(STORAGE_KEY_OPERATION_LOGS, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save operation logs to localStorage:', err);
  }
}

/**
 * Add a new operation record
 */
export function recordOperation(
  type: OperationType,
  title: string,
  description: string,
  snapshots: TaskSnapshot[]
): OperationLogItem {
  const newLog: OperationLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
    type,
    title,
    description,
    affectedCount: snapshots.length,
    taskSnapshots: snapshots
  };

  const current = getOperationLogs();
  const updated = [newLog, ...current];
  saveOperationLogs(updated);

  return newLog;
}

/**
 * Helper to generate TaskSnapshot from TaskItem
 */
export function taskToSnapshot(task: TaskItem, actionNote?: string): TaskSnapshot {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    priority: task.priority,
    completed: task.completed,
    dueDate: task.dueDate,
    tags: task.tags,
    actionNote
  };
}

/**
 * Clear all operation logs
 */
export function clearOperationLogs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_OPERATION_LOGS);
  } catch (err) {
    console.error('Failed to clear operation logs:', err);
  }
}
