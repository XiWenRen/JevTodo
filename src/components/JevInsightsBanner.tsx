import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { TaskItem } from '../types';

interface JevInsightsBannerProps {
  tasks: TaskItem[];
  adviceSummary: string;
  overdueCount: number;
  onOpenCleanupModal: () => void;
  onDeferOverdueTasks: () => void;
}

export const JevInsightsBanner: React.FC<JevInsightsBannerProps> = ({
  tasks,
  adviceSummary,
  overdueCount,
  onOpenCleanupModal,
  onDeferOverdueTasks
}) => {
  const todayTasks = tasks.filter(t => t.category === '即刻完成');
  const totalToday = todayTasks.length;
  const completedToday = todayTasks.filter(t => t.completed).length;
  const progressPercent = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-xl acrylic-card p-3 sm:p-3.5 border border-[var(--border-subtle)] relative overflow-hidden"
    >
      <div className="relative z-10 space-y-2">
        {/* Header & Progress Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--chip-bg)] text-[var(--text-sub)] border border-[var(--chip-border)]">
              <Sparkles className="w-3 h-3" />
            </span>
            <span className="text-xs font-semibold text-[var(--text-main)]">
              Jev 任务决策建议
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--text-sub)]">
              今日进度 <span className="text-[var(--text-main)] font-semibold">{progressPercent}%</span>
            </span>
            <div className="w-16 h-1.5 bg-[var(--chip-bg)] border border-[var(--chip-border)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full bg-[var(--accent-bg)] rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Advice text */}
        <p className="text-xs text-[var(--text-sub)] leading-relaxed">
          {adviceSummary}
        </p>

        {/* Action quick links */}
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenCleanupModal}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-main)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] px-2.5 py-1 rounded-lg border border-[var(--chip-border)] transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-[var(--text-faint)]" />
            <span>智能排序与任务清理</span>
          </button>

          {overdueCount > 0 && (
            <button
              type="button"
              onClick={onDeferOverdueTasks}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 hover:bg-amber-500/15 px-2 py-1 rounded-lg border border-amber-500/20 transition-colors"
            >
              <AlertCircle className="w-3 h-3" />
              <span>一键顺延逾期项 ({overdueCount})</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
