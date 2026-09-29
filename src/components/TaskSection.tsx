import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, ChevronRight, Inbox, CheckSquare, Trash2, Calendar, Check, X } from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory } from '../types';
import { TaskItem, CardRect } from './TaskItem';
import { CherryIcon } from './CherryIcon';

interface TaskSectionProps {
  category: TaskCategory | '全部事项';
  tasks: ITaskItem[];
  activeGestureTaskId?: string | null;
  isBatchMode?: boolean;
  selectedTaskIds?: Set<string>;
  onToggleBatchMode?: () => void;
  onToggleSelectTask?: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onBatchComplete?: () => void;
  onBatchDefer?: () => void;
  onBatchDelete?: () => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (task: ITaskItem) => void;
  onDeleteTask: (id: string) => void;
  onMoveToPlanning: (id: string) => void;
  onDeferTask?: (id: string) => void;
  onStartGesture?: (task: ITaskItem, point: { x: number; y: number }, cardRect: CardRect) => void;
  onStartCherryClock?: (task: ITaskItem) => void;
}

export const TaskSection: React.FC<TaskSectionProps> = ({
  category,
  tasks,
  activeGestureTaskId,
  isBatchMode = false,
  selectedTaskIds = new Set(),
  onToggleBatchMode,
  onToggleSelectTask,
  onSelectAll,
  onClearSelection,
  onBatchComplete,
  onBatchDefer,
  onBatchDelete,
  onToggleComplete,
  onUpdateTask,
  onDeleteTask,
  onMoveToPlanning,
  onDeferTask,
  onStartGesture,
  onStartCherryClock
}) => {
  const [showCompleted, setShowCompleted] = useState(false);

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const isAllSelected = pendingTasks.length > 0 && pendingTasks.every(t => selectedTaskIds.has(t.id));
  const selectedCount = selectedTaskIds.size;

  return (
    <div className="space-y-2">
      {/* Section Header & Inline Batch Toolbar (Strictly single-row, no wrap, no emojis) */}
      {pendingTasks.length > 0 && onToggleBatchMode && (
        <div className="select-none">
          {isBatchMode ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] gap-2 shadow-xs">
              {/* Left: Select All Checkbox + Count */}
              <div className="flex items-center gap-2 min-w-0 shrink-0">
                <button
                  type="button"
                  onClick={isAllSelected ? onClearSelection : onSelectAll}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-main)] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isAllSelected 
                      ? 'bg-[var(--accent-bg)] border-[var(--accent-bg)] text-[var(--accent-fg)]' 
                      : 'border-[var(--border-medium)] bg-[var(--bg-card)]'
                  }`}>
                    {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span>全选</span>
                </button>
                <span className="text-xs text-[var(--text-sub)] font-mono">
                  已选 {selectedCount} 项
                </span>
              </div>

              {/* Right: Unified Action Buttons (Neutral sleek styling, NO EMOJIS, Compact single row) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={onBatchComplete}
                  className="h-7 px-2.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--chip-hover)] active:bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--border-subtle)] flex items-center gap-1 transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                  title="批量完成所选待办"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>完成</span>
                </button>

                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={onBatchDefer}
                  className="h-7 px-2.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--chip-hover)] active:bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--border-subtle)] flex items-center gap-1 transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                  title="批量顺延至明天"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>延后</span>
                </button>

                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={onBatchDelete}
                  className="h-7 px-2.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--chip-hover)] active:bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--border-subtle)] flex items-center gap-1 transition-all disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                  title="批量删除所选待办"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>删除</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleBatchMode}
                  className="h-7 px-2 rounded-lg text-xs text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] transition-colors flex items-center justify-center cursor-pointer ml-0.5"
                  title="退出批量操作"
                >
                  <span>退出</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1 py-1">
              <div className="text-[11px] font-medium text-[var(--text-sub)] flex items-center gap-1.5">
                <span>待办事项</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--chip-bg)] text-[var(--text-faint)] font-mono">
                  {pendingTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleBatchMode}
                className="h-7 px-2.5 rounded-lg text-xs font-medium text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] border border-[var(--border-subtle)] transition-colors flex items-center gap-1.5 cursor-pointer"
                title="进入批量管理模式"
              >
                <CheckSquare className="w-3.5 h-3.5 opacity-70" />
                <span>批量操作</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Tasks List */}
      {pendingTasks.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--chip-bg)]">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--chip-hover)] flex items-center justify-center text-[var(--text-faint)]">
            <Inbox className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-xs text-[var(--text-main)] font-medium">
            {category === '全部事项' ? '全部事项已清空' : `${category}暂无未完成待办`}
          </p>
          <p className="text-[11px] text-[var(--text-faint)] mt-1">
            可在下方直接输入或语音添加，Jev 决策模型将自动分类
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {pendingTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isGhost={task.id === activeGestureTaskId}
                isBatchMode={isBatchMode}
                isSelected={selectedTaskIds.has(task.id)}
                onToggleSelect={onToggleSelectTask}
                onToggleComplete={onToggleComplete}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
                onMoveToPlanning={onMoveToPlanning}
                onDefer={onDeferTask}
                onStartGesture={onStartGesture}
                onStartCherryClock={onStartCherryClock}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Tasks Collapsible Footer */}
      {completedTasks.length > 0 && (
        <div className="pt-3">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full py-1.5 px-2 flex items-center justify-between text-xs text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] rounded-lg transition-colors select-none"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>已完成事项 ({completedTasks.length})</span>
            </span>
            <span className="p-0.5">
              {showCompleted ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden pt-2 space-y-1.5"
              >
                {completedTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                    onMoveToPlanning={onMoveToPlanning}
                    onStartCherryClock={onStartCherryClock}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
