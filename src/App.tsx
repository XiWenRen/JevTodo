/**
 * Jev Minimal Todo - Desktop Widget & Mobile Responsive
 * Powered by TypeSafe Jev Decision Logic with Multi-Tenant Data Isolation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Menu,
  Zap,
  CalendarDays,
  Compass,
  Layers,
  ChevronDown,
  CheckCircle2,
  User,
  Palette,
  Check,
  LogOut,
  LogIn
} from 'lucide-react';
import { TaskItem, TaskCategory, TaskPriority, ActiveView, AppSettings, AppTheme } from './types';
import { evaluateWithJev, analyzeTasksWithJev, splitTasksWithJev, detectDuplicateWithJev, extractDateTime } from './utils/jev';
import { 
  checkAndFetchCloudTasks, 
  syncTaskToCloud, 
  deleteTaskFromCloud, 
  batchSyncTasksToCloud 
} from './utils/cloudSync';
import { 
  AuthUser, 
  getStoredUser, 
  clearStoredAuth, 
  checkCurrentUser 
} from './utils/auth';
import { TaskSection } from './components/TaskSection';
import { FloatingInputBar } from './components/FloatingInputBar';
import { JevInsightsBanner } from './components/JevInsightsBanner';
import { JevCleanupModal } from './components/JevCleanupModal';
import { ShortcutPluginModal } from './components/ShortcutPluginModal';
import { SettingsModal } from './components/SettingsModal';
import { PMSimulationModal } from './components/PMSimulationModal';
import { AuthModal } from './components/AuthModal';
import { CategoryDrawer } from './components/CategoryDrawer';
import { TaskGestureOverlay, GestureData, GestureActionType } from './components/TaskGestureOverlay';
import { JevDuplicateModal } from './components/JevDuplicateModal';
import { JevBatchSplitModal, BatchParsedTask } from './components/JevBatchSplitModal';
import { CardRect } from './components/TaskItem';
import { generatePMSimulatedTasks } from './data/pmScenarios';

const STORAGE_KEY_GUEST_TASKS = 'jev_minimal_todo_guest_tasks_v1';
const STORAGE_KEY_SETTINGS = 'jev_minimal_todo_settings_v1';

const INITIAL_TASKS: TaskItem[] = generatePMSimulatedTasks();

const THEMES: { id: AppTheme; label: string; icon: string }[] = [
  { id: 'obsidian', label: '墨黑', icon: '🌙' },
  { id: 'paper', label: '素白', icon: '☀️' },
  { id: 'sand', label: '暖杏', icon: '🌾' },
  { id: 'mist', label: '月灰', icon: '🌫️' }
];

export default function App() {
  // Current logged in user
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active Category View state (replaced waterfall cascade with clean drawer-based view switching)
  const [activeView, setActiveView] = useState<ActiveView>('即刻完成');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Top header dropdown menus state & refs
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Active Long-Press 3-Sector Radial Gesture state
  const [gestureData, setGestureData] = useState<GestureData | null>(null);

  // Derive local storage key based on active user to isolate browser cache
  const currentStorageKey = useMemo(() => {
    return currentUser ? `jev_tasks_user_${currentUser.id}_v1` : STORAGE_KEY_GUEST_TASKS;
  }, [currentUser]);

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const user = getStoredUser();
      const key = user ? `jev_tasks_user_${user.id}_v1` : STORAGE_KEY_GUEST_TASKS;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error reading tasks from storage:', e);
    }
    return INITIAL_TASKS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          theme: 'obsidian',
          ...parsed
        };
      }
    } catch (e) {
      console.warn('Error reading settings from storage:', e);
    }
    return {
      jevApiKey: '',
      jevEndpoint: 'https://ai-gateway.vercel.sh/typesafe/v1/systemone',
      autoCleanupEnabled: true,
      autoCleanupDays: 5,
      widgetWidth: 'compact',
      showCompleted: true,
      theme: 'obsidian'
    };
  });

  // Cloud persistence status
  const [cloudStatus, setCloudStatus] = useState<{
    isConfigured: boolean;
    source: string;
    isSyncing: boolean;
    isAuthenticated: boolean;
  }>({
    isConfigured: false,
    source: 'local_storage',
    isSyncing: false,
    isAuthenticated: false
  });

  // UI Modals & Menus
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPMSimulationOpen, setIsPMSimulationOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Jev Duplicate Detection Modal State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{
    newInput: string;
    matchedTask: TaskItem;
    similarity: number;
    reason: string;
    parsedCategory?: TaskCategory;
    parsedPriority?: TaskPriority;
    parsedDueDate?: string;
    parsedTags?: string[];
  } | null>(null);

  // Jev Batch Input & Auto-Split Modal State
  const [isBatchSplitModalOpen, setIsBatchSplitModalOpen] = useState(false);
  const [batchSplitInitialText, setBatchSplitInitialText] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(current => (current === msg ? null : current));
    }, 3800);
  }, []);

  // Sync theme with document & body for consistent full-screen background
  useEffect(() => {
    const currentTheme = settings.theme || 'obsidian';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.body.setAttribute('data-theme', currentTheme);
  }, [settings.theme]);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(target)) {
        setIsThemeDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setIsUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
        setIsThemeDropdownOpen(false);
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        const userSaved = localStorage.getItem(currentStorageKey);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
            await batchSyncTasksToCloud(parsed);
          }
        }
      }
    }
  }, [currentStorageKey]);

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

  // Save tasks to user-specific localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(currentStorageKey, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Error saving tasks:', e);
    }
  }, [tasks, currentStorageKey]);

  // Save settings to localStorage
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Error saving settings:', e);
    }
  };

  // User Auth Handlers
  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    const userStorageKey = `jev_tasks_user_${user.id}_v1`;
    const cached = localStorage.getItem(userStorageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setTasks(parsed);
      } catch {}
    } else {
      setTasks([]);
    }
    await refreshTasksFromCloud();
  };

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    setTasks(INITIAL_TASKS);
    setCloudStatus(prev => ({ ...prev, isAuthenticated: false }));
  };

  // Quick theme cycle
  const handleNextTheme = () => {
    const currentIndex = THEMES.findIndex(t => t.id === settings.theme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length].id;
    handleSaveSettings({
      ...settings,
      theme: nextTheme
    });
  };

  // Handle URL query parameters for desktop shortcut auto-add
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quickAddText = params.get('quickadd') || params.get('add');
    if (quickAddText) {
      handleAddTask(decodeURIComponent(quickAddText));
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Jev Task Analysis
  const analysis = useMemo(() => {
    return analyzeTasksWithJev(tasks);
  }, [tasks]);

  // Add Task with Jev Decision
  const handleAddTask = async (rawInput: string) => {
    if (!rawInput.trim()) return;

    // 1. Check if input contains multiple tasks (batch text input)
    const splitCandidates = splitTasksWithJev(rawInput);
    if (splitCandidates.length > 1) {
      setBatchSplitInitialText(rawInput);
      setIsBatchSplitModalOpen(true);
      return;
    }

    setIsProcessing(true);

    try {
      const decision = await evaluateWithJev(rawInput, {
        apiKey: settings.jevApiKey,
        endpoint: settings.jevEndpoint
      });

      // 2. Jev Duplicate Detection against existing tasks
      const dupCheck = detectDuplicateWithJev(rawInput, tasks);
      if (dupCheck.isDuplicate && dupCheck.matchedTask) {
        setDuplicateData({
          newInput: rawInput,
          matchedTask: dupCheck.matchedTask,
          similarity: dupCheck.similarity,
          reason: dupCheck.reason,
          parsedCategory: decision.category,
          parsedPriority: decision.priority,
          parsedDueDate: decision.dueDate,
          parsedTags: decision.tags
        });
        setIsDuplicateModalOpen(true);
        setIsProcessing(false);
        return;
      }

      const newTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: rawInput.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim(),
        rawInput,
        category: decision.category,
        priority: decision.priority || 'P1',
        urgencyScore: decision.urgencyScore,
        tags: decision.tags,
        dueDate: decision.dueDate,
        dueDateIso: decision.dueDateIso,
        dueTimestamp: decision.dueTimestamp,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        jevConfidence: decision.confidence
      };

      setTasks(prev => [newTask, ...prev]);

      // Automatically switch to view of newly created task for instant feedback
      if (activeView !== '全部事项' && activeView !== newTask.category) {
        setActiveView(newTask.category);
      }

      if (cloudStatus.isConfigured && currentUser) {
        syncTaskToCloud(newTask);
      }
    } catch (err) {
      console.error('Failed to add task with Jev:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Duplicate Resolution: Option 1 - 忽略（放弃录入）
  const handleIgnoreDuplicate = () => {
    setIsDuplicateModalOpen(false);
    setDuplicateData(null);
    showToast('已忽略重复待办，原任务保持不变');
  };

  // Duplicate Resolution: Option 2 - 补充信息到已有任务中
  const handleAppendToExistingTask = (
    matchedTask: TaskItem,
    supplementalText: string,
    newTags?: string[],
    newDueDate?: string
  ) => {
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const h = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${m}-${d} ${h}:${min}`;

    const cleanNote = supplementalText.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim();
    const noteEntry = `[补充 ${timeStr}] ${cleanNote}`;

    const mergedTags = Array.from(new Set([...matchedTask.tags, ...(newTags || [])]));

    let updatedDueDate = matchedTask.dueDate;
    let updatedDueDateIso = matchedTask.dueDateIso;
    let updatedDueTimestamp = matchedTask.dueTimestamp;

    if (!updatedDueDate && newDueDate) {
      const parsed = extractDateTime(newDueDate);
      updatedDueDate = parsed.dueDate || newDueDate;
      updatedDueDateIso = parsed.dueDateIso;
      updatedDueTimestamp = parsed.dueTimestamp;
    }

    const updated: TaskItem = {
      ...matchedTask,
      notes: [...(matchedTask.notes || []), noteEntry],
      tags: mergedTags,
      dueDate: updatedDueDate,
      dueDateIso: updatedDueDateIso,
      dueTimestamp: updatedDueTimestamp,
      updatedAt: Date.now()
    };

    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));

    if (cloudStatus.isConfigured && currentUser) {
      syncTaskToCloud(updated);
    }

    setIsDuplicateModalOpen(false);
    setDuplicateData(null);
    showToast(`已将补充信息成功合并至「${matchedTask.title}」`);

    // Switch to category view so user immediately sees the updated item
    if (activeView !== '全部事项' && activeView !== updated.category) {
      setActiveView(updated.category);
    }
  };

  // Duplicate Resolution: Force create as separate item
  const handleForceCreateNewTask = async (rawInput: string) => {
    setIsDuplicateModalOpen(false);
    setDuplicateData(null);
    setIsProcessing(true);

    try {
      const decision = await evaluateWithJev(rawInput, {
        apiKey: settings.jevApiKey,
        endpoint: settings.jevEndpoint
      });

      const newTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: rawInput.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim(),
        rawInput,
        category: decision.category,
        priority: decision.priority || 'P1',
        urgencyScore: decision.urgencyScore,
        tags: decision.tags,
        dueDate: decision.dueDate,
        dueDateIso: decision.dueDateIso,
        dueTimestamp: decision.dueTimestamp,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        jevConfidence: decision.confidence
      };

      setTasks(prev => [newTask, ...prev]);

      if (activeView !== '全部事项' && activeView !== newTask.category) {
        setActiveView(newTask.category);
      }

      if (cloudStatus.isConfigured && currentUser) {
        syncTaskToCloud(newTask);
      }

      showToast(`已独立创建待办「${newTask.title}」`);
    } catch (err) {
      console.error('Failed to force create task:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch Split Modal Confirmation Handler
  const handleConfirmBatch = (
    tasksToAdd: BatchParsedTask[],
    tasksToAppend: Array<{ matchedTask: TaskItem; supplementalText: string; tags?: string[]; dueDate?: string }>
  ) => {
    const newTasks: TaskItem[] = tasksToAdd.map(item => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: item.title,
      rawInput: item.rawText,
      category: item.category,
      priority: item.priority,
      urgencyScore: item.urgencyScore,
      tags: item.tags,
      dueDate: item.dueDate,
      dueDateIso: item.dueDateIso,
      dueTimestamp: item.dueTimestamp,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    let currentTasks = [...tasks];

    // Merge supplemental items
    for (const appendItem of tasksToAppend) {
      const now = new Date();
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const d = now.getDate().toString().padStart(2, '0');
      const h = now.getHours().toString().padStart(2, '0');
      const min = now.getMinutes().toString().padStart(2, '0');
      const timeStr = `${m}-${d} ${h}:${min}`;

      const cleanNote = appendItem.supplementalText.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim();
      const noteEntry = `[批量补充 ${timeStr}] ${cleanNote}`;
      const mergedTags = Array.from(new Set([...appendItem.matchedTask.tags, ...(appendItem.tags || [])]));

      currentTasks = currentTasks.map(t => {
        if (t.id === appendItem.matchedTask.id) {
          return {
            ...t,
            notes: [...(t.notes || []), noteEntry],
            tags: mergedTags,
            dueDate: t.dueDate || appendItem.dueDate,
            updatedAt: Date.now()
          };
        }
        return t;
      });
    }

    const updatedAll = [...newTasks, ...currentTasks];
    setTasks(updatedAll);

    if (cloudStatus.isConfigured && currentUser) {
      batchSyncTasksToCloud(updatedAll);
    }

    const addedCount = newTasks.length;
    const appendCount = tasksToAppend.length;
    if (addedCount > 0 && appendCount > 0) {
      showToast(`Jev 智能拆分新增 ${addedCount} 项待办，并补充合并 ${appendCount} 项信息`);
    } else if (addedCount > 0) {
      showToast(`Jev 已成功智能拆分并录入 ${addedCount} 项待办`);
    } else if (appendCount > 0) {
      showToast(`已成功将 ${appendCount} 项信息补充合并至已有待办`);
    }
  };

  // Toggle complete
  const handleToggleComplete = (id: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? Date.now() : undefined,
            updatedAt: Date.now()
          };
          if (cloudStatus.isConfigured && currentUser) {
            syncTaskToCloud(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Update task
  const handleUpdateTask = (updated: TaskItem) => {
    setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    if (cloudStatus.isConfigured && currentUser) {
      syncTaskToCloud(updated);
    }
  };

  // Delete task (Discard)
  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (cloudStatus.isConfigured && currentUser) {
      deleteTaskFromCloud(id);
    }
  };

  // Move task to long-term planning
  const handleMoveToPlanning = (id: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = {
            ...t,
            category: '规划待办' as TaskCategory,
            updatedAt: Date.now()
          };
          if (cloudStatus.isConfigured && currentUser) {
            syncTaskToCloud(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Defer task (延后待办)
  const handleDeferTask = (id: string) => {
    const ONE_DAY = 24 * 3600 * 1000;
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextCategory: TaskCategory = t.category === '即刻完成' ? '近期完成' : '规划待办';
          const nextDueDate = t.category === '即刻完成' ? '明天处理' : '稍后规划';
          const nextIso = new Date(Date.now() + ONE_DAY).toISOString();
          const updated = {
            ...t,
            category: nextCategory,
            dueDate: nextDueDate,
            dueDateIso: nextIso,
            isStale: false,
            updatedAt: Date.now()
          };
          if (cloudStatus.isConfigured && currentUser) {
            syncTaskToCloud(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Start radial throw gesture
  const handleStartGesture = (task: TaskItem, point: { x: number; y: number }, cardRect: CardRect) => {
    setGestureData({ task, point, cardRect });
  };

  // Execute action from radial throw gesture
  const handleGestureAction = (action: GestureActionType, task: TaskItem) => {
    if (action === 'complete') {
      handleToggleComplete(task.id);
    } else if (action === 'delete') {
      handleDeleteTask(task.id);
    } else if (action === 'defer') {
      handleDeferTask(task.id);
    } else if (action === 'planning') {
      handleMoveToPlanning(task.id);
    }
  };

  // Apply Jev intelligent ranking
  const handleApplyRanking = () => {
    setTasks(analysis.rankedTasks);
    if (cloudStatus.isConfigured && currentUser) {
      batchSyncTasksToCloud(analysis.rankedTasks);
    }
  };

  // Apply cleanup actions
  const handleApplyCleanup = (actions: Record<string, 'archive' | 'defer' | 'keep'>) => {
    setTasks(prev => {
      const remaining: TaskItem[] = [];
      prev.forEach(task => {
        const action = actions[task.id];
        if (action === 'archive') {
          if (cloudStatus.isConfigured && currentUser) {
            deleteTaskFromCloud(task.id);
          }
          return;
        } else if (action === 'defer') {
          const deferred = {
            ...task,
            category: '近期完成' as TaskCategory,
            isStale: false,
            updatedAt: Date.now()
          };
          remaining.push(deferred);
          if (cloudStatus.isConfigured && currentUser) {
            syncTaskToCloud(deferred);
          }
        } else {
          remaining.push(task);
        }
      });
      return remaining;
    });
  };

  // Defer overdue tasks
  const handleDeferOverdueTasks = () => {
    const now = Date.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const tomorrowMs = tomorrow.getTime();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const tomorrowIso = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T18:00:00`;

    setTasks(prev =>
      prev.map(t => {
        const isTaskOverdue = t.dueTimestamp 
          ? (!t.completed && t.dueTimestamp < now) 
          : (t.dueDateIso ? (!t.completed && new Date(t.dueDateIso).getTime() < now) : false);

        if (isTaskOverdue) {
          const updated = {
            ...t,
            category: '近期完成' as TaskCategory,
            dueDate: '明天 18:00',
            dueDateIso: tomorrowIso,
            dueTimestamp: tomorrowMs,
            updatedAt: Date.now()
          };
          if (cloudStatus.isConfigured && currentUser) {
            syncTaskToCloud(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Reset to initial sample tasks
  const handleResetSampleData = () => {
    if (window.confirm('是否重置为 PM 工作流演示数据？')) {
      setTasks(INITIAL_TASKS);
      if (cloudStatus.isConfigured && currentUser) {
        batchSyncTasksToCloud(INITIAL_TASKS);
      }
    }
  };

  // Manual trigger cloud sync
  const handleManualCloudSync = async () => {
    await refreshTasksFromCloud();
  };

  // Filter tasks by active category and search/tags
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterTag && !t.tags.includes(filterTag)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(query) || t.tags.some(tag => tag.toLowerCase().includes(query));
      }
      return true;
    });
  }, [tasks, filterTag, searchQuery]);

  // Tasks in current active view
  const currentViewTasks = useMemo(() => {
    if (activeView === '全部事项') return filteredTasks;
    return filteredTasks.filter(t => t.category === activeView);
  }, [filteredTasks, activeView]);

  // Collect all unique tags for quick filter chips
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => tagsSet.add(tag)));
    return Array.from(tagsSet);
  }, [tasks]);

  const isCompactMode = settings.widgetWidth === 'compact';
  const currentThemeObj = THEMES.find(t => t.id === settings.theme) || THEMES[0];

  // Category visual icons & helpers
  const categoryMeta: Record<ActiveView, { label: string; icon: React.ReactNode; color: string }> = {
    '即刻完成': {
      label: '即刻完成',
      icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
      color: 'text-amber-500'
    },
    '近期完成': {
      label: '近期完成',
      icon: <CalendarDays className="w-3.5 h-3.5 text-blue-500" />,
      color: 'text-blue-500'
    },
    '规划待办': {
      label: '规划待办',
      icon: <Compass className="w-3.5 h-3.5 text-purple-500" />,
      color: 'text-purple-500'
    },
    '全部事项': {
      label: '全部事项',
      icon: <Layers className="w-3.5 h-3.5 text-emerald-500" />,
      color: 'text-emerald-500'
    }
  };

  const activeMeta = categoryMeta[activeView];
  const pendingCountInView = currentViewTasks.filter(t => !t.completed).length;

  // Category options for dropdown switcher
  const categoryOptions = useMemo<
    { view: ActiveView; label: string; desc: string; icon: React.ReactNode; color: string; count: number }[]
  >(() => [
    {
      view: '即刻完成',
      label: '即刻完成',
      desc: '今日核心 · 专注执行',
      icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
      color: 'text-amber-500',
      count: tasks.filter(t => t.category === '即刻完成' && !t.completed).length
    },
    {
      view: '近期完成',
      label: '近期完成',
      desc: '2~3天内 · 明确交付',
      icon: <CalendarDays className="w-3.5 h-3.5 text-blue-500" />,
      color: 'text-blue-500',
      count: tasks.filter(t => t.category === '近期完成' && !t.completed).length
    },
    {
      view: '规划待办',
      label: '规划待办',
      desc: '远期规划 · 稍后推进',
      icon: <Compass className="w-3.5 h-3.5 text-purple-500" />,
      color: 'text-purple-500',
      count: tasks.filter(t => t.category === '规划待办' && !t.completed).length
    },
    {
      view: '全部事项',
      label: '全部事项',
      desc: '聚合视图 · 全景概览',
      icon: <Layers className="w-3.5 h-3.5 text-emerald-500" />,
      color: 'text-emerald-500',
      count: tasks.filter(t => !t.completed).length
    }
  ], [tasks]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-start py-2.5 sm:py-6 px-2 sm:px-4 relative overflow-x-hidden transition-colors duration-250"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      {/* Main Container - Windows Widget Frame */}
      <div
        className={`w-full transition-all duration-300 ${
          isCompactMode ? 'max-w-[420px]' : 'max-w-xl'
        }`}
      >
        {/* Minimal Desktop Widget Header */}
        <header className="acrylic-panel rounded-t-2xl px-3 sm:px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between select-none relative z-30">
          {/* Left: Drawer Hamburger & Direct Category Dropdown Switcher */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Drawer Hamburger Menu Button (Access tags, PM simulation, settings) */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="w-7 h-7 bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)] rounded-lg flex items-center justify-center transition-colors shrink-0"
              title="打开侧边抽屉（标签管理、PM演示、设置）"
            >
              <Menu className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* Direct Category Dropdown Switcher (Does NOT call drawer) */}
            <div ref={categoryDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen(prev => !prev);
                  setIsThemeDropdownOpen(false);
                  setIsUserDropdownOpen(false);
                }}
                className={`h-7 px-2.5 rounded-lg border flex items-center gap-1.5 transition-colors group min-w-0 ${
                  isCategoryDropdownOpen
                    ? 'bg-[var(--chip-hover)] border-[var(--border-medium)]'
                    : 'bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] border-[var(--chip-border)]'
                }`}
                title="点击下拉直接切换任务大类"
              >
                <span className="shrink-0">{activeMeta.icon}</span>
                <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                  {activeMeta.label}
                </span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-[var(--chip-hover)] text-[var(--text-sub)]">
                  {pendingCountInView}
                </span>
                <ChevronDown className={`w-3 h-3 text-[var(--text-faint)] group-hover:text-[var(--text-sub)] shrink-0 transition-transform duration-200 ${
                  isCategoryDropdownOpen ? 'rotate-180 text-[var(--text-main)]' : ''
                }`} />
              </button>

              {/* Direct Category Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div 
                  className="absolute left-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--border-medium)] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                  style={{ backgroundColor: 'var(--bg-panel)' }}
                >
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)] border-b border-[var(--border-subtle)] mb-1 flex items-center justify-between">
                    <span>切换大类视图</span>
                    <span>待办数</span>
                  </div>
                  <div className="space-y-0.5">
                    {categoryOptions.map((opt) => {
                      const isActive = activeView === opt.view;
                      return (
                        <button
                          key={opt.view}
                          type="button"
                          onClick={() => {
                            setActiveView(opt.view);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors ${
                            isActive
                              ? 'bg-[var(--chip-hover)] font-medium text-[var(--text-main)]'
                              : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">{opt.icon}</span>
                            <div className="truncate">
                              <div className="text-xs leading-snug">{opt.label}</div>
                              <div className="text-[10px] text-[var(--text-faint)] leading-none mt-0.5">{opt.desc}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                              isActive 
                                ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] font-semibold' 
                                : 'bg-[var(--chip-bg)] text-[var(--text-faint)]'
                            }`}>
                              {opt.count}
                            </span>
                            {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cloud Sync Status Indicator */}
            <span 
              className={`w-1.5 h-1.5 rounded-full shrink-0 ml-0.5 transition-colors ${
                cloudStatus.isConfigured && currentUser 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                  : 'bg-[var(--text-faint)]'
              }`} 
              title={cloudStatus.isConfigured && currentUser ? '已连接云端数据库并实时同步' : '本地私有存储'}
            />
          </div>

          {/* Right: User Quick Info and Theme Switcher Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            {/* Theme Switcher Quick Button (Compact icon only) */}
            <div ref={themeDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsThemeDropdownOpen(prev => !prev);
                  setIsUserDropdownOpen(false);
                  setIsCategoryDropdownOpen(false);
                }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                  isThemeDropdownOpen
                    ? 'bg-[var(--chip-hover)] border-[var(--border-medium)] text-[var(--text-main)]'
                    : 'bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] border-[var(--chip-border)] text-[var(--text-sub)] hover:text-[var(--text-main)]'
                }`}
                title={`切换主题（当前: ${currentThemeObj.label}）`}
              >
                <span className="text-sm leading-none select-none">{currentThemeObj.icon}</span>
              </button>

              {/* Theme Dropdown Menu */}
              {isThemeDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--border-medium)] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                  style={{ backgroundColor: 'var(--bg-panel)' }}
                >
                  <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)] border-b border-[var(--border-subtle)] mb-1">
                    选择界面主题
                  </div>
                  <div className="space-y-0.5">
                    {THEMES.map((theme) => {
                      const isActive = settings.theme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => {
                            handleSaveSettings({ ...settings, theme: theme.id });
                            setIsThemeDropdownOpen(false);
                            showToast(`已切换至「${theme.label}」主题`);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                            isActive
                              ? 'bg-[var(--chip-hover)] font-medium text-[var(--text-main)]'
                              : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{theme.icon}</span>
                            <span>{theme.label}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Info Quick Button */}
            <div ref={userDropdownRef} className="relative">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDropdownOpen(prev => !prev);
                      setIsThemeDropdownOpen(false);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`h-7 px-2 rounded-lg border flex items-center gap-1.5 transition-colors text-xs shrink-0 ${
                      isUserDropdownOpen
                        ? 'bg-[var(--chip-hover)] border-[var(--border-medium)]'
                        : 'bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] border-[var(--chip-border)]'
                    }`}
                    title={`当前用户: ${currentUser.username} (点击查看详情与账号操作)`}
                  >
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[60px] sm:max-w-[88px] truncate text-[11px] font-medium text-[var(--text-main)]">
                      {currentUser.username}
                    </span>
                    <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform duration-200 ${
                      isUserDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* User Popover Menu */}
                  {isUserDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-[var(--border-medium)] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl"
                      style={{ backgroundColor: 'var(--bg-panel)' }}
                    >
                      <div className="flex items-center gap-2.5 px-2 py-1.5 border-b border-[var(--border-subtle)] pb-2 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">
                          {currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-main)] truncate">
                            {currentUser.username}
                          </div>
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>云端已实时同步</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            setIsAuthModalOpen(true);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] transition-colors"
                        >
                          <LogIn className="w-3.5 h-3.5 opacity-70" />
                          <span>切换账号 / 登录新账号</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            handleLogout();
                            showToast('已安全退出登录');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5 opacity-80" />
                          <span>退出登录</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="h-7 px-2.5 rounded-lg bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] border border-[var(--chip-border)] flex items-center gap-1.5 transition-colors text-xs text-[var(--text-main)] shrink-0"
                  title="登录后可跨设备云同步待办事项"
                >
                  <User className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                  <span className="text-[11px] font-medium">登录</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="acrylic-panel rounded-b-2xl p-3.5 sm:p-4 pt-3 pb-24 shadow-2xl min-h-[540px]">
          {/* Active Tag Filter Indicator */}
          {filterTag && (
            <div className="mb-3 px-2 py-1 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--text-sub)]">
                <span>当前标签过滤:</span>
                <span className="font-semibold text-[var(--text-main)]">#{filterTag}</span>
              </span>
              <button
                type="button"
                onClick={() => setFilterTag(null)}
                className="text-[11px] text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"
              >
                清除筛选 ✕
              </button>
            </div>
          )}

          {/* Jev Decision Insights & Progress Banner */}
          <JevInsightsBanner
            tasks={tasks}
            adviceSummary={analysis.adviceSummary}
            overdueCount={analysis.overdueCount}
            onOpenCleanupModal={() => setIsCleanupModalOpen(true)}
            onDeferOverdueTasks={handleDeferOverdueTasks}
          />

          {/* Single Active Category View (Minimalist, no waterfall cascade!) */}
          <div className="mt-2">
            <TaskSection
              category={activeView}
              tasks={currentViewTasks}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onMoveToPlanning={handleMoveToPlanning}
              onDeferTask={handleDeferTask}
              onStartGesture={handleStartGesture}
            />
          </div>
        </main>
      </div>

      {/* Floating Bottom Input Bar with Voice-to-Text */}
      <FloatingInputBar
        onAddTask={handleAddTask}
        onOpenBatchModal={(text) => {
          setBatchSplitInitialText(text || '');
          setIsBatchSplitModalOpen(true);
        }}
        isProcessing={isProcessing}
      />

      {/* Task 3-Sector Radial Gesture Overlay (Mounted at root level with 1:1 touch origin) */}
      <TaskGestureOverlay
        gestureData={gestureData}
        onClose={() => setGestureData(null)}
        onAction={handleGestureAction}
      />

      {/* Left Slide-out Category Drawer */}
      <CategoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        tasks={tasks}
        allTags={allTags}
        filterTag={filterTag}
        onSelectTag={setFilterTag}
        currentUser={currentUser}
        isCloudConfigured={cloudStatus.isConfigured}
        currentTheme={settings.theme || 'obsidian'}
        onSelectTheme={(theme) => handleSaveSettings({ ...settings, theme })}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isCompactMode={isCompactMode}
        onToggleCompactMode={() => handleSaveSettings({ ...settings, widgetWidth: isCompactMode ? 'standard' : 'compact' })}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenCleanup={() => setIsCleanupModalOpen(true)}
        onOpenBatchSplit={() => {
          setBatchSplitInitialText('');
          setIsBatchSplitModalOpen(true);
        }}
        onOpenPMSimulation={() => setIsPMSimulationOpen(true)}
        onOpenShortcuts={() => setIsShortcutModalOpen(true)}
        onResetSampleData={handleResetSampleData}
        staleCount={analysis.cleanupList.length}
      />

      {/* Jev Duplicate Detection Resolution Modal */}
      <JevDuplicateModal
        isOpen={isDuplicateModalOpen}
        duplicateInfo={duplicateData}
        onIgnore={handleIgnoreDuplicate}
        onAppendToExisting={handleAppendToExistingTask}
        onForceCreateNew={handleForceCreateNewTask}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setDuplicateData(null);
        }}
      />

      {/* Jev Batch Input & Auto-Split Modal */}
      <JevBatchSplitModal
        isOpen={isBatchSplitModalOpen}
        initialText={batchSplitInitialText}
        existingTasks={tasks}
        onConfirmBatch={handleConfirmBatch}
        onClose={() => {
          setIsBatchSplitModalOpen(false);
          setBatchSplitInitialText('');
        }}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-0 mx-auto max-w-sm px-4 z-50 pointer-events-none">
          <div className="bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)] shadow-2xl rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="flex-1 font-medium leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Other Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      <JevCleanupModal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        tasks={tasks}
        cleanupList={analysis.cleanupList}
        onApplyRanking={handleApplyRanking}
        onApplyCleanup={handleApplyCleanup}
      />

      <ShortcutPluginModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        isCloudConfigured={cloudStatus.isConfigured}
        onTriggerCloudSync={handleManualCloudSync}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <PMSimulationModal
        isOpen={isPMSimulationOpen}
        onClose={() => setIsPMSimulationOpen(false)}
        onLoadAllPMTasks={(pmTasks) => {
          setTasks(pmTasks);
          if (cloudStatus.isConfigured && currentUser) {
            batchSyncTasksToCloud(pmTasks);
          }
        }}
        onInsertSingleTask={handleAddTask}
        apiKey={settings.jevApiKey}
        endpoint={settings.jevEndpoint}
      />
    </div>
  );
}
