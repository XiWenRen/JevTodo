import { useState, useEffect, useCallback, useRef } from 'react';
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
  const currentUserRef = useRef<AuthUser | null>(currentUser);
  currentUserRef.current = currentUser;

  const tasksRef = useRef<TaskItem[]>(tasks);
  tasksRef.current = tasks;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({
    isConfigured: false,
    source: 'local_storage',
    isSyncing: false,
    isAuthenticated: false
  });

  const isSyncingRef = useRef(false);

  // Load cloud tasks for current authenticated user
  const refreshTasksFromCloud = useCallback(async (userOverride?: AuthUser | null) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    setCloudStatus(prev => ({ ...prev, isSyncing: true }));
    try {
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
          const activeUser = userOverride !== undefined ? userOverride : currentUserRef.current;
          const storageKey = activeUser ? `jev_tasks_user_${activeUser.id}_v1` : (optionalStorageKey || 'jev_minimal_todo_guest_tasks_v2');
          const userSaved = localStorage.getItem(storageKey);
          if (userSaved) {
            try {
              const parsed = JSON.parse(userSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setTasks(parsed);
                await batchSyncTasksToCloud(parsed);
              }
            } catch {}
          }
        }
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [optionalStorageKey, setTasks]);

  // Verify auth session once on mount & fetch user tasks
  useEffect(() => {
    let isMounted = true;
    checkCurrentUser().then(user => {
      if (!isMounted) return;
      setCurrentUser(prev => {
        if (!prev && !user) return null;
        if (prev && user && prev.id === user.id && prev.username === user.username) {
          return prev;
        }
        return user;
      });
      refreshTasksFromCloud(user);
    });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User Auth Handlers
  const handleAuthSuccess = useCallback(async (user: AuthUser) => {
    setCurrentUser(user);
    const userStorageKey = `jev_tasks_user_${user.id}_v1`;
    const cached = localStorage.getItem(userStorageKey);
    const currentTasks = tasksRef.current;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        } else if (currentTasks.length > 0) {
          localStorage.setItem(userStorageKey, JSON.stringify(currentTasks));
        }
      } catch {
        if (currentTasks.length > 0) {
          localStorage.setItem(userStorageKey, JSON.stringify(currentTasks));
        }
      }
    } else {
      // Migrate current tasks to user's isolated storage so items are not lost
      if (currentTasks.length > 0) {
        try {
          localStorage.setItem(userStorageKey, JSON.stringify(currentTasks));
        } catch {}
      }
    }
    await refreshTasksFromCloud(user);
    // Warm up user's cloud operation logs into local cache
    fetchOperationLogsFromCloud().then(res => {
      if (res.configured && res.authenticated && res.logs.length > 0) {
        saveOperationLogs(res.logs, user.id);
      }
    }).catch(() => {});
  }, [refreshTasksFromCloud, setTasks]);

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
