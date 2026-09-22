/**
 * Jev Minimal Todo - Desktop Widget & Mobile Responsive
 * Powered by TypeSafe Jev Decision Logic
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
  HardDrive
} from 'lucide-react';
import { TaskItem, TaskCategory, AppSettings, AppTheme } from './types';
import { evaluateWithJev, analyzeTasksWithJev } from './utils/jev';
import { 
  checkAndFetchCloudTasks, 
  syncTaskToCloud, 
  deleteTaskFromCloud, 
  batchSyncTasksToCloud 
} from './utils/cloudSync';
import { TaskSection } from './components/TaskSection';
import { FloatingInputBar } from './components/FloatingInputBar';
import { JevInsightsBanner } from './components/JevInsightsBanner';
import { JevCleanupModal } from './components/JevCleanupModal';
import { ShortcutPluginModal } from './components/ShortcutPluginModal';
import { SettingsModal } from './components/SettingsModal';
import { PMSimulationModal } from './components/PMSimulationModal';
import { generatePMSimulatedTasks } from './data/pmScenarios';

const STORAGE_KEY_TASKS = 'jev_minimal_todo_tasks_v1';
const STORAGE_KEY_SETTINGS = 'jev_minimal_todo_settings_v1';

const INITIAL_TASKS: TaskItem[] = generatePMSimulatedTasks();

const THEMES: { id: AppTheme; label: string; icon: string }[] = [
  { id: 'obsidian', label: '墨黑', icon: '🌙' },
  { id: 'paper', label: '素白', icon: '☀️' },
  { id: 'sand', label: '暖杏', icon: '🌾' },
  { id: 'mist', label: '月灰', icon: '🌫️' }
];

export default function App() {
  // Persistence state
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
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
  }>({
    isConfigured: false,
    source: 'local_storage',
    isSyncing: false
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

  // Initial cloud check & task synchronization
  useEffect(() => {
    let isMounted = true;
    checkAndFetchCloudTasks().then(res => {
      if (!isMounted) return;
      if (res.configured) {
        setCloudStatus({
          isConfigured: true,
          source: res.source,
          isSyncing: false
        });
        if (res.tasks.length > 0) {
          setTasks(res.tasks);
        } else if (tasks.length > 0) {
          // Push initial local tasks to newly connected cloud database
          batchSyncTasksToCloud(tasks);
        }
      } else {
        setCloudStatus({
          isConfigured: false,
          source: 'local_storage',
          isSyncing: false
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Save tasks to localStorage on change (as offline backup)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Error saving tasks:', e);
    }
  }, [tasks]);

  // Save settings to localStorage
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Error saving settings:', e);
    }
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

      if (cloudStatus.isConfigured) {
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
          if (cloudStatus.isConfigured) {
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
    if (cloudStatus.isConfigured) {
      syncTaskToCloud(updated);
    }
  };

  // Delete task
  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (cloudStatus.isConfigured) {
      deleteTaskFromCloud(id);
    }
  };

  // Apply Jev intelligent ranking
  const handleApplyRanking = () => {
    setTasks(analysis.rankedTasks);
    if (cloudStatus.isConfigured) {
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
          if (cloudStatus.isConfigured) {
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
          if (cloudStatus.isConfigured) {
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
          if (cloudStatus.isConfigured) {
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
      if (cloudStatus.isConfigured) {
        batchSyncTasksToCloud(INITIAL_TASKS);
      }
    }
  };

  // Manual trigger cloud sync
  const handleManualCloudSync = async () => {
    setCloudStatus(prev => ({ ...prev, isSyncing: true }));
    const res = await checkAndFetchCloudTasks();
    if (res.configured) {
      setCloudStatus({
        isConfigured: true,
        source: res.source,
        isSyncing: false
      });
      if (res.tasks.length > 0) {
        setTasks(res.tasks);
      } else if (tasks.length > 0) {
        await batchSyncTasksToCloud(tasks);
      }
    } else {
      setCloudStatus({
        isConfigured: false,
        source: 'local_storage',
        isSyncing: false
      });
    }
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
                {cloudStatus.isConfigured ? (
                  <span 
                    className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono px-1 py-0.2 rounded flex items-center gap-0.5"
                    title="已连接 Vercel Postgres 云端数据库，实时自动同步"
                  >
                    <CloudCheck className="w-2.5 h-2.5" />
                    云同步
                  </span>
                ) : (
                  <span 
                    className="text-[9px] bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-faint)] font-mono px-1 py-0.2 rounded flex items-center gap-0.5"
                    title="当前运行于客户端 LocalStorage 离线存储模式"
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
              <span>{cloudStatus.isConfigured ? 'Vercel Postgres 云存储' : '本地 LocalStorage'}</span>
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
      />

      <PMSimulationModal
        isOpen={isPMSimulationOpen}
        onClose={() => setIsPMSimulationOpen(false)}
        onLoadAllPMTasks={(pmTasks) => {
          setTasks(pmTasks);
          if (cloudStatus.isConfigured) {
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
