import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronRight, Zap, CalendarDays, Compass, CheckCircle2 } from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory } from '../types';
import { TaskItem } from './TaskItem';

interface TaskSectionProps {
  category: TaskCategory;
  tasks: ITaskItem[];
  defaultExpanded?: boolean;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (task: ITaskItem) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskSection: React.FC<TaskSectionProps> = ({
  category,
  tasks,
  defaultExpanded = false,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const metaConfig: Record<TaskCategory, { title: string; subtitle: string; icon: React.ReactNode }> = {
    '即刻完成': {
      title: '今日核心',
      subtitle: '即刻完成 · 高优先级排期',
      icon: <Zap className="w-3.5 h-3.5 text-[var(--text-main)]" />
    },
    '近期完成': {
      title: '近期推进',
      subtitle: '这几天 · 本周工作安排',
      icon: <CalendarDays className="w-3.5 h-3.5 text-[var(--text-sub)]" />
    },
    '规划待办': {
      title: '规划备忘',
      subtitle: '长期规划 · 沉淀待办事项',
      icon: <Compass className="w-3.5 h-3.5 text-[var(--text-faint)]" />
    }
  };

  const currentMeta = metaConfig[category];
  const uncompletedCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="mb-3.5">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 px-2 text-left rounded-xl transition-colors group select-none hover:bg-[var(--chip-hover)]"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-sub)] group-hover:border-[var(--border-medium)] transition-colors">
            {currentMeta.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-[var(--text-main)]">
                {currentMeta.title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] text-[var(--text-sub)]">
                {uncompletedCount}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-faint)] font-normal">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <span className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              {completedCount} 已完成
            </span>
          )}
          <span className="p-1 text-[var(--text-faint)] group-hover:text-[var(--text-sub)] transition-colors">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        </div>
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden pt-1 space-y-2"
          >
            {tasks.length === 0 ? (
              <div className="py-4 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--chip-bg)]">
                <p className="text-xs text-[var(--text-faint)]">暂无{category}事项</p>
                <p className="text-[10px] text-[var(--text-faint)] opacity-70 mt-0.5">可在底部输入，Jev 将自动分类归档</p>
              </div>
            ) : (
              tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
