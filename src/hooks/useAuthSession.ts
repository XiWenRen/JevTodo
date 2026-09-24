import { useState, useEffect, useCallback } from 'react';
import { AuthUser, getStoredUser, clearStoredAuth, checkCurrentUser } from '../utils/auth';
import { checkAndFetchCloudTasks, batchSyncTasksToCloud } from '../utils/cloudSync';
import { fetchOperationLogsFromCloud, saveOperationLogs } from '../utils/operationLog';
import { TaskItem } from '../types';

export interface CloudStatus {
  isConfigured: boolean;
  source: string;
  isSyncing: boolean;
  isAuthenticated: boolean;
}

export function useAuthSession(
  tasks: TaskItem[],
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>,
  optionalStorageKey?: string
) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({
    isConfigured: false,
    source: 'local_storage',
    isSyncing: false,
    isAuthenticated: false
  });

  // Load cloud tasks for current authenticated user
  const refreshTasksFromCloud = useCallback(async () => {
    setCloudStatus(prev => ({ ...prev, isSyncing: true }));
    const res = await checkAndFetchCloudTasks();

    setCloudStatus({
      isConfigured: res.configured,
      source: res.source,
      isSyncing: false,
      isAuthenticated: res.authenticated
    });

    if (res.configured && res.authenticated) {
      if (res.tasks.length > 0) {
        setTasks(res.tasks);
      } else {
        const storageKey = currentUser ? `jev_tasks_user_${currentUser.id}_v1` : (optionalStorageKey || 'jev_minimal_todo_guest_tasks_v2');
        const userSaved = localStorage.getItem(storageKey);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            await batchSyncTasksToCloud(parsed);
          }
        }
      }
    }
  }, [currentUser, optionalStorageKey, setTasks]);

  // Verify auth session on mount & fetch user tasks
  useEffect(() => {
    let isMounted = true;
    checkCurrentUser().then(user => {
      if (!isMounted) return;
      setCurrentUser(user);
      refreshTasksFromCloud();
    });
    return () => {
      isMounted = false;
    };
  }, [refreshTasksFromCloud]);

  // User Auth Handlers
  const handleAuthSuccess = useCallback(async (user: AuthUser) => {
    setCurrentUser(user);
    const userStorageKey = `jev_tasks_user_${user.id}_v1`;
    const cached = localStorage.getItem(userStorageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        } else if (tasks.length > 0) {
          localStorage.setItem(userStorageKey, JSON.stringify(tasks));
        }
      } catch {
        if (tasks.length > 0) {
          localStorage.setItem(userStorageKey, JSON.stringify(tasks));
        }
      }
    } else {
      // Migrate current tasks to user's isolated storage so items are not lost
      if (tasks.length > 0) {
        try {
          localStorage.setItem(userStorageKey, JSON.stringify(tasks));
        } catch {}
      }
    }
    await refreshTasksFromCloud();
    // Warm up user's cloud operation logs into local cache
    fetchOperationLogsFromCloud().then(res => {
      if (res.configured && res.authenticated && res.logs.length > 0) {
        saveOperationLogs(res.logs, user.id);
      }
    }).catch(() => {});
  }, [refreshTasksFromCloud, setTasks, tasks]);

  const handleLogout = useCallback((initialTasks: TaskItem[]) => {
    clearStoredAuth();
    setCurrentUser(null);
    setTasks(initialTasks);
    setCloudStatus(prev => ({ ...prev, isAuthenticated: false }));
  }, [setTasks]);

  return {
    currentUser,
    setCurrentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    cloudStatus,
    setCloudStatus,
    refreshTasksFromCloud,
    handleAuthSuccess,
    handleLogout
  };
}
