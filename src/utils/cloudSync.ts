import { TaskItem } from '../types';

export interface CloudSyncState {
  isCloudConfigured: boolean;
  status: 'local_only' | 'synced' | 'syncing' | 'offline_cached';
  lastSyncedAt?: number;
  message?: string;
}

export async function checkAndFetchCloudTasks(): Promise<{
  configured: boolean;
  tasks: TaskItem[];
  source: string;
}> {
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      source: data.source || 'local_storage'
    };
  } catch (e) {
    console.warn('Cloud tasks fetch failed, falling back to local storage:', e);
    return {
      configured: false,
      tasks: [],
      source: 'local_storage'
    };
  }
}

export async function syncTaskToCloud(task: TaskItem): Promise<boolean> {
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task })
    });
    return res.ok;
  } catch (e) {
    console.warn('Sync single task failed:', e);
    return false;
  }
}

export async function deleteTaskFromCloud(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (e) {
    console.warn('Delete cloud task failed:', e);
    return false;
  }
}

export async function batchSyncTasksToCloud(tasks: TaskItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_sync',
        tasks
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Batch sync to cloud failed:', e);
    return false;
  }
}
