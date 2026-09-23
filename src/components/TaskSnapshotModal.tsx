import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Circle, Clock, Tag, Zap, CalendarDays, Compass, FileText, Check } from 'lucide-react';
import { TaskSnapshot } from '../types/operationLog';
import { TaskCategory, TaskPriority } from '../types';

interface TaskSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  timestamp?: number;
  tasks: TaskSnapshot[];
}

export const TaskSnapshotModal: React.FC<TaskSnapshotModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  timestamp,
  tasks
}) => {
  if (!isOpen) return null;

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${m}-${day} ${h}:${min}:${s}`;
  };

  const getCategoryMeta = (cat: TaskCategory) => {
    switch (cat) {
      case '即刻完成':
        return { label: '即刻完成', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case '近期完成':
        return { label: '近期完成', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      case '规划待办':
        return { label: '规划待办', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
      default:
        return { label: cat, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' };
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'P0':
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">P0</span>;
      case 'P1':
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">P1</span>;
      case 'P2':
        return <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/15 text-blue-400 border border-blue-500/20">P2</span>;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
        {/* Soft Scrim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl border border-[var(--border-medium)] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl z-10"
          style={{
            backgroundColor: 'var(--bg-drawer)',
            color: 'var(--text-main)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-start justify-between shrink-0 bg-[var(--chip-bg)]/40">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] truncate max-w-[280px] sm:max-w-md">
                  {title}
                </h3>
              </div>
              <div className="flex items-center gap-2.5 mt-1 text-[11px] text-[var(--text-sub)]">
                {timestamp && <span>{formatTime(timestamp)}</span>}
                {timestamp && <span>·</span>}
                <span>共涉及 <b className="text-[var(--text-main)]">{tasks.length}</b> 项待办</span>
                {description && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[200px]">{description}</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors shrink-0"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Task Snapshot List */}
          <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[160px]">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-faint)]">
                暂无关联的任务记录
              </div>
            ) : (
              tasks.map((task, idx) => {
                const catMeta = getCategoryMeta(task.category);
                return (
                  <div
                    key={`${task.id}-${idx}`}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--chip-bg)]/60 hover:bg-[var(--chip-bg)] transition-colors flex flex-col gap-1.5"
                  >
                    <div className="flex items-start gap-2.5 justify-between">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-[var(--text-faint)]" />
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium leading-snug break-words ${
                            task.completed ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text-main)]'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Action Note Tag */}
                      {task.actionNote && (
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>{task.actionNote}</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center gap-1.5 pl-6 text-[10px] text-[var(--text-sub)]">
                      <span className={`px-1.5 py-0.2 rounded border font-medium ${catMeta.color}`}>
                        {catMeta.label}
                      </span>

                      {getPriorityBadge(task.priority)}

                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-[var(--text-faint)]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{task.dueDate}</span>
                        </span>
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {task.tags.map(tag => (
                            <span key={tag} className="text-[var(--text-faint)]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-end bg-[var(--chip-bg)]/30 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-xs font-medium text-[var(--text-main)] border border-[var(--chip-border)] transition-colors"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
