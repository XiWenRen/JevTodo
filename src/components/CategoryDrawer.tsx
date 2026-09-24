import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Command, 
  RotateCcw,
  CloudCheck,
  HardDrive,
  User,
  ShieldCheck,
  Settings,
  Maximize2,
  Smartphone,
  Palette,
  ListPlus,
  ScrollText
} from 'lucide-react';
import { ActiveView, TaskItem, AppTheme } from '../types';
import { AuthUser } from '../utils/auth';
import { CherryIcon } from './CherryIcon';

interface CategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  allTags: string[];
  filterTag: string | null;
  onSelectTag: (tag: string | null) => void;
  currentUser: AuthUser | null;
  isCloudConfigured: boolean;
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  onOpenSettings: () => void;
  isCompactMode: boolean;
  onToggleCompactMode: () => void;
  onOpenAuth: () => void;
  onOpenOperationLogs: () => void;
  onOpenBatchSplit?: () => void;
  onOpenShortcuts: () => void;
  onResetSampleData: () => void;
  staleCount: number;
}

const THEMES: { id: AppTheme; label: string; icon: string }[] = [
  { id: 'obsidian', label: '墨黑', icon: '🌙' },
  { id: 'paper', label: '素白', icon: '☀️' },
  { id: 'sand', label: '暖杏', icon: '🌾' },
  { id: 'mist', label: '月灰', icon: '🌫️' }
];

export const CategoryDrawer: React.FC<CategoryDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  allTags,
  filterTag,
  onSelectTag,
  currentUser,
  isCloudConfigured,
  currentTheme,
  onSelectTheme,
  onOpenSettings,
  isCompactMode,
  onToggleCompactMode,
  onOpenAuth,
  onOpenOperationLogs,
  onOpenBatchSplit,
  onOpenShortcuts,
  onResetSampleData,
  staleCount
}) => {

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Slide-out Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-80 max-w-[85vw] h-full acrylic-drawer border-r border-[var(--border-subtle)] flex flex-col justify-between p-4 z-10 select-none overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-drawer)' }}
          >
            {/* Top Section */}
            <div>
              {/* Header with App Logo & Close Button */}
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shadow-xs select-none">
                    <CherryIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold tracking-wide text-[var(--text-main)] font-mono">
                        CHERRY TODO
                      </h2>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-medium tracking-tight">
                        Jev 决策核心
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 mt-0.5">
                      <span>极简快速录入</span>
                      <span>·</span>
                      <span>秒级自动分类</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-faint)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors"
                  title="关闭菜单"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Account / Cloud Sync Pill */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full p-2 rounded-xl bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] border border-[var(--chip-border)] flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[var(--chip-hover)] flex items-center justify-center shrink-0">
                      {currentUser ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[var(--text-main)] truncate">
                        {currentUser ? currentUser.username : '游客模式 (点击登录)'}
                      </div>
                      <div className="text-[10px] text-[var(--text-faint)] flex items-center gap-1">
                        {isCloudConfigured && currentUser ? (
                          <>
                            <CloudCheck className="w-2.5 h-2.5 text-emerald-500" />
                            <span>云端同步已就绪</span>
                          </>
                        ) : (
                          <>
                            <HardDrive className="w-2.5 h-2.5" />
                            <span>本地私有存储</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-faint)] font-mono">
                    {currentUser ? '账号' : '登录'} →
                  </span>
                </button>
              </div>

              {/* Theme Selector */}
              <div className="mb-4">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)]">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    主题风格
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 px-1">
                  {THEMES.map(t => {
                    const isSelected = currentTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectTheme(t.id)}
                        className={`py-1.5 px-1 rounded-lg text-center text-xs transition-all border ${
                          isSelected
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] border-[var(--accent-bg)] font-medium shadow-sm'
                            : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:bg-[var(--chip-hover)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <div className="text-xs leading-none">{t.icon}</div>
                        <div className="text-[10px] mt-1">{t.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Filters Section */}
              {allTags.length > 0 && (
                <div className="mb-4">
                  <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)]">
                    <span>标签筛选</span>
                    {filterTag && (
                      <button
                        type="button"
                        onClick={() => onSelectTag(null)}
                        className="text-[10px] text-[var(--text-main)] hover:underline normal-case font-sans"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => onSelectTag(null)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        filterTag === null
                          ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] border-[var(--accent-bg)] font-medium'
                          : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:bg-[var(--chip-hover)]'
                      }`}
                    >
                      全部
                    </button>
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onSelectTag(filterTag === tag ? null : tag)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                          filterTag === tag
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-fg)] border-[var(--accent-bg)] font-medium'
                            : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:bg-[var(--chip-hover)]'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools, Simulations, Settings */}
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)]">
                  工具与设置
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOperationLogs();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-main)] flex items-center justify-between text-xs transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ScrollText className="w-3.5 h-3.5 text-blue-400" />
                    <span>操作记录与日志</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-faint)]">
                    查看全部
                  </span>
                </button>

                {onOpenBatchSplit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBatchSplit();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-main)] flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ListPlus className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cherry 批量智能拆分录入</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-faint)]">长文本/清单</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShortcuts();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-main)] flex items-center gap-2 text-xs transition-colors"
                >
                  <Command className="w-3.5 h-3.5 text-purple-400" />
                  <span>桌面快捷指令</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onToggleCompactMode();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-main)] flex items-center justify-between text-xs transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {isCompactMode ? (
                      <Maximize2 className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                    )}
                    <span>{isCompactMode ? '切换宽屏视图' : '切换紧凑小组件 (380px)'}</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-faint)] font-mono">
                    {isCompactMode ? '紧凑' : '宽屏'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-main)] flex items-center gap-2 text-xs transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                  <span>偏好与设置</span>
                </button>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-faint)]">
              <div className="flex items-center justify-between">
                <span>共 {tasks.length} 项事项</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onResetSampleData();
                  }}
                  className="hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
                  title="清空并重置为初始待办"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
