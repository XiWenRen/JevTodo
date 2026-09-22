/**
 * Jev Minimal Todo - Desktop Widget & Mobile Responsive
 * Powered by TypeSafe Jev Decision Logic with Multi-Tenant Data Isolation
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Settings, 
  Command, 
  Pin, 
  Maximize2, 
  Smartphone, 
  RotateCcw,
  Briefcase,
  Cloud,
  CloudCheck,
  HardDrive,
  User,
  ShieldCheck,
  LogIn
} from 'lucide-react';
import { TaskItem, TaskCategory, AppSettings, AppTheme } from './types';
import { evaluateWithJev, analyzeTasksWithJev } from './utils/jev';
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

  // UI Modals
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPMSimulationOpen, setIsPMSimulationOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinned, setIsPinned] = useState(true);

  // Sync theme with document element
  useEffect(() => {
    const currentTheme = settings.theme || 'obsidian';
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [settings.theme]);

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
        // If user has local tasks in this session but remote has 0, offer to sync
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
    // If user has previously cached tasks locally, load them first
    const cached = localStorage.getItem(userStorageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setTasks(parsed);
      } catch {}
    } else {
      // If brand new user with no local tasks, start with empty list or clean demo
      setTasks([]);
    }
    // Refresh from cloud Postgres strictly scoped to this user
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

  // Handle URL query parameters for desktop shortcut auto-add (?quickadd=... or ?add=...)
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
        priority: decision.priority,
        urgencyScore: decision.urgencyScore,
        tags: decision.tags,
        dueDate: decision.dueDate,
        dueDateIso: decision.dueDateIso,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        jevConfidence: decision.confidence
      };

      setTasks(prev => [newTask, ...prev]);

      if (cloudStatus.isConfigured && currentUser) {
        syncTaskToCloud(newTask);
      }
    } catch (err) {
      console.error('Failed to add task with Jev:', err);
    } finally {
      setIsProcessing(false);
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

  // Delete task
  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (cloudStatus.isConfigured && currentUser) {
      deleteTaskFromCloud(id);
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
    setTasks(prev =>
      prev.map(t => {
        if (!t.completed && t.dueDateIso && new Date(t.dueDateIso).getTime() < now) {
          const updated = {
            ...t,
            category: '近期完成' as TaskCategory,
            dueDate: '顺延至近期',
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

  // Filter tasks by category & search
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

  const coreTodayTasks = filteredTasks.filter(t => t.category === '即刻完成');
  const upcomingTasks = filteredTasks.filter(t => t.category === '近期完成');
  const plannedTasks = filteredTasks.filter(t => t.category === '规划待办');

  // Collect all unique tags for quick filter chips
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach(t => t.tags.forEach(tag => tagsSet.add(tag)));
    return Array.from(tagsSet);
  }, [tasks]);

  const isCompactMode = settings.widgetWidth === 'compact';
  const currentThemeObj = THEMES.find(t => t.id === settings.theme) || THEMES[0];

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-start py-3 sm:py-6 px-2 sm:px-4 relative overflow-x-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      {/* Main Container - Windows Widget Frame */}
      <div
        className={`w-full transition-all duration-300 ${
          isCompactMode ? 'max-w-[420px]' : 'max-w-xl'
        }`}
      >
        {/* Windows Acrylic Desktop Widget Header */}
        <header className="acrylic-panel rounded-t-2xl px-3.5 py-2.5 border-b-0 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {/* Widget status dot */}
            <span className="w-2 h-2 rounded-full bg-[var(--text-main)] opacity-85 shrink-0" />

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-semibold tracking-wider uppercase font-mono text-[var(--text-main)]">
                  JEV TODO
                </h1>
                <span className="text-[10px] bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-sub)] font-mono px-1 py-0.2 rounded">
                  DECISION
                </span>
                {cloudStatus.isConfigured && currentUser ? (
                  <span 
                    className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono px-1 py-0.2 rounded flex items-center gap-0.5"
                    title={`已连接 Vercel Postgres 云数据库，当前用户: ${currentUser.username}`}
                  >
                    <CloudCheck className="w-2.5 h-2.5" />
                    云同步
                  </span>
                ) : (
                  <span 
                    className="text-[9px] bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-faint)] font-mono px-1 py-0.2 rounded flex items-center gap-0.5"
                    title="本地离线隔离存储模式"
                  >
                    <HardDrive className="w-2.5 h-2.5" />
                    本地
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-faint)] font-normal">
                {settings.jevApiKey ? 'Vercel AI Gateway' : 'Jev System One · 本地校准'}
              </p>
            </div>
          </div>

          {/* Top Control Icons */}
          <div className="flex items-center gap-1">
            {/* User Login/Register or Account Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2 py-1 bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                title={`当前登录：${currentUser.username}，已启动数据隔离保护`}
              >
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span className="max-w-[65px] truncate">{currentUser.username}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2 py-1 bg-[var(--accent-bg)] hover:opacity-90 text-[var(--accent-fg)] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm"
                title="注册/登录个人账号，享受云端数据隔离与防越权保护"
              >
                <LogIn className="w-3 h-3" />
                <span>登录/注册</span>
              </button>
            )}

            {/* Quick Theme Switcher Pill */}
            <button
              type="button"
              onClick={handleNextTheme}
              className="px-2 py-1 bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
              title={`当前主题：${currentThemeObj.label}，点击切换下一个主题`}
            >
              <span className="text-[11px] leading-none">{currentThemeObj.icon}</span>
              <span className="hidden sm:inline">{currentThemeObj.label}</span>
            </button>

            {/* PM Simulation Button */}
            <button
              type="button"
              onClick={() => setIsPMSimulationOpen(true)}
              className="px-2 py-1 bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--chip-border)] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="软件项目经理（PM）实战场景演练与系统测试"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PM演练</span>
            </button>

            {/* Toggle Widget Compact / Fluid width */}
            <button
              type="button"
              onClick={() =>
                handleSaveSettings({
                  ...settings,
                  widgetWidth: isCompactMode ? 'standard' : 'compact'
                })
              }
              className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] rounded-lg transition-colors"
              title={isCompactMode ? '切换为自适应宽屏模式' : '切换为 380px 极简桌面小组件'}
            >
              {isCompactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>

            {/* Pin to top status */}
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-1.5 rounded-lg transition-colors ${
                isPinned ? 'text-[var(--text-main)] bg-[var(--chip-hover)]' : 'text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)]'
              }`}
              title={isPinned ? '已置顶桌面组件' : '取消置顶'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>

            {/* Shortcuts Plugin */}
            <button
              type="button"
              onClick={() => setIsShortcutModalOpen(true)}
              className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] rounded-lg transition-colors"
              title="桌面快捷指令与插件"
            >
              <Command className="w-3.5 h-3.5" />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] rounded-lg transition-colors"
              title="界面主题、Jev 模型及 Vercel 云数据库配置"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="acrylic-panel rounded-b-2xl p-3.5 sm:p-4 pt-2.5 pb-24 shadow-2xl min-h-[560px]">
          {/* Cloud Database Connected but Not Logged In Tip Banner */}
          {cloudStatus.isConfigured && !currentUser && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-600 dark:text-amber-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>已连接云端数据库，注册或登录账号后即可独占专属数据空间</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2 py-0.5 rounded bg-amber-500 text-black font-semibold text-[11px] hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                立即登录
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

          {/* Quick Tag Filter Bar */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterTag(null)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                  filterTag === null
                    ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] border-[var(--accent-bg)] font-medium shadow-sm'
                    : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:bg-[var(--chip-hover)] hover:text-[var(--text-main)]'
                }`}
              >
                全部事项
              </button>
              <button
                type="button"
                onClick={() => setIsPMSimulationOpen(true)}
                className="text-[11px] px-2.5 py-0.5 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] transition-colors whitespace-nowrap flex items-center gap-1"
                title="项目经理日常 10+ 真实工作场景演练"
              >
                <Briefcase className="w-3 h-3 text-[var(--text-faint)]" />
                <span>PM 实战演练</span>
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                    filterTag === tag
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] border-[var(--accent-bg)] font-medium shadow-sm'
                      : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:bg-[var(--chip-hover)] hover:text-[var(--text-main)]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Task Sections */}
          <div className="space-y-1">
            {/* 1. 今日核心 / 即刻完成 (Default Expanded) */}
            <TaskSection
              category="即刻完成"
              tasks={coreTodayTasks}
              defaultExpanded={true}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />

            {/* 2. 近期推进 / 近期完成 (Collapsible) */}
            <TaskSection
              category="近期完成"
              tasks={upcomingTasks}
              defaultExpanded={false}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />

            {/* 3. 规划备忘 / 规划待办 (Collapsible) */}
            <TaskSection
              category="规划待办"
              tasks={plannedTasks}
              defaultExpanded={false}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>

          {/* Bottom helper actions */}
          <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-faint)]">
            <span className="flex items-center gap-1">
              <span>共 {tasks.length} 项待办</span>
              <span>·</span>
              <span>
                {currentUser 
                  ? `${currentUser.username} (独立空间)` 
                  : (cloudStatus.isConfigured ? '未登录 (点击顶栏登录)' : '本地离线模式')}
              </span>
            </span>
            <button
              type="button"
              onClick={handleResetSampleData}
              className="hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
              title="重置测试数据"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置演示</span>
            </button>
          </div>
        </main>
      </div>

      {/* Floating Bottom Input Bar with Voice-to-Text */}
      <FloatingInputBar
        onAddTask={handleAddTask}
        isProcessing={isProcessing}
      />

      {/* Modals */}
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
