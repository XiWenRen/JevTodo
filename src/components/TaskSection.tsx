import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronDown, ChevronRight, Inbox, Sparkles } from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory } from '../types';
import { TaskItem, CardRect } from './TaskItem';

interface TaskSectionProps {
  category: TaskCategory | '全部事项';
  tasks: ITaskItem[];
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

  return (
    <div className="space-y-2">

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
          {pendingTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onMoveToPlanning={onMoveToPlanning}
              onStartGesture={onStartGesture}
              onStartCherryClock={onStartCherryClock}
            />
          ))}
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
