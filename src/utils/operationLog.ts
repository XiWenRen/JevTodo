import { OperationLogItem, OperationType, TaskSnapshot } from '../types/operationLog';
import { TaskItem } from '../types';
import { getStoredUser, getAuthHeaders } from './auth';

const STORAGE_KEY_GUEST_LOGS = 'jev_minimal_todo_operation_logs_guest_v1';
const LEGACY_STORAGE_KEY = 'jev_minimal_todo_operation_logs_v1';
const MAX_LOGS_COUNT = 150;

/**
 * Dynamically derive the storage key based on current authenticated user ID
 */
export function getCurrentLogStorageKey(customUserId?: string): string {
  const effectiveUserId = customUserId || getStoredUser()?.id;
  if (effectiveUserId) {
    return `jev_operation_logs_user_${effectiveUserId}_v1`;
  }
  return STORAGE_KEY_GUEST_LOGS;
}

/**
 * Read all operation logs from localStorage for active user
 */
export function getOperationLogs(customUserId?: string): OperationLogItem[] {
  try {
    const key = getCurrentLogStorageKey(customUserId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Guest backward compatibility migration from old key
    if (!customUserId && !getStoredUser()) {
      const oldRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (oldRaw) {
        const oldParsed = JSON.parse(oldRaw);
        if (Array.isArray(oldParsed) && oldParsed.length > 0) {
          localStorage.setItem(STORAGE_KEY_GUEST_LOGS, oldRaw);
          return oldParsed;
        }
      }
    }
    return [];
  } catch (err) {
    console.error('Failed to read operation logs from localStorage:', err);
    return [];
  }
}

/**
 * Save operation logs to localStorage for active user
 */
export function saveOperationLogs(logs: OperationLogItem[], customUserId?: string): void {
  try {
    const key = getCurrentLogStorageKey(customUserId);
    const trimmed = logs.slice(0, MAX_LOGS_COUNT);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save operation logs to localStorage:', err);
  }
}

/**
 * Cloud API: Fetch operation logs strictly scoped to authenticated user
 */
export async function fetchOperationLogsFromCloud(): Promise<{
  configured: boolean;
  authenticated: boolean;
  logs: OperationLogItem[];
  source: string;
}> {
  try {
    const res = await fetch('/api/operation-logs', {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      return {
        configured: true,
        authenticated: false,
        logs: [],
        source: 'unauthenticated'
      };
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      authenticated: data.authenticated !== false,
      logs: Array.isArray(data.logs) ? data.logs : [],
      source: data.source || 'local_storage'
    };
  } catch (e) {
    console.warn('Cloud operation logs fetch failed, falling back to local storage:', e);
    return {
      configured: false,
      authenticated: false,
      logs: [],
      source: 'local_storage'
    };
  }
}

/**
 * Cloud API: Save single operation log to database
 */
export async function syncOperationLogToCloud(log: OperationLogItem): Promise<boolean> {
  try {
    const res = await fetch('/api/operation-logs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ log })
    });
    return res.ok;
  } catch (e) {
    console.warn('Sync single operation log to cloud failed:', e);
    return false;
  }
}

/**
 * Cloud API: Batch sync operation logs to database
 */
export async function batchSyncOperationLogsToCloud(logs: OperationLogItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/operation-logs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'batch_sync',
        logs
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Batch sync operation logs to cloud failed:', e);
    return false;
  }
}

/**
 * Cloud API: Clear all operation logs for current authenticated user
 */
export async function clearOperationLogsFromCloud(): Promise<boolean> {
  try {
    const res = await fetch('/api/operation-logs', {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.ok;
  } catch (e) {
    console.warn('Clear operation logs from cloud failed:', e);
    return false;
  }
}

/**
 * Add a new operation record.
 * Immediately saves to user's local cache and asynchronously pushes to PostgreSQL database if logged in.
 */
export function recordOperation(
  type: OperationType,
  title: string,
  description: string,
  snapshots: TaskSnapshot[]
): OperationLogItem {
  const user = getStoredUser();
  const newLog: OperationLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user?.id,
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

  // Asynchronously sync to cloud DB in the background
  if (user && user.id) {
    syncOperationLogToCloud(newLog).catch(err => {
      console.warn('Background sync operation log failed:', err);
    });
  }

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
    completed: task.completed,
    dueDate: task.dueDate,
    tags: task.tags,
    actionNote
  };
}

/**
 * Clear all operation logs for current user (both local cache and cloud DB)
 */
export function clearOperationLogs(): void {
  try {
    const key = getCurrentLogStorageKey();
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear operation logs from localStorage:', err);
  }

  const user = getStoredUser();
  if (user && user.id) {
    clearOperationLogsFromCloud().catch(err => {
      console.warn('Background clear operation logs in cloud failed:', err);
    });
  }
}
