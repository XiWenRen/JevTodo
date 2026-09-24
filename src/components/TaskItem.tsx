import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  AlertCircle,
  X,
  Calendar
} from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory } from '../types';
import { formatDynamicDueDate, extractDateTime } from '../utils/jev';
import { CherryIcon } from './CherryIcon';

export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TaskItemProps {
  task: ITaskItem;
  isGhost?: boolean;
  onToggleComplete: (id: string) => void;
  onUpdate: (updated: ITaskItem) => void;
  onDelete: (id: string) => void;
  onMoveToPlanning?: (id: string) => void;
  onStartGesture?: (task: ITaskItem, point: { x: number; y: number }, cardRect: CardRect) => void;
  onStartCherryClock?: (task: ITaskItem) => void;
}

export interface DueDateStatus {
  colorClass: string;
  dotClass: string;
  isOverdue: boolean;
  relativeDesc: string;
  displayDate: string;
  fullExactDate: string;
  hasDueDate: boolean;
}

export function getDueDateStatus(task: ITaskItem, referenceNow: Date = new Date()): DueDateStatus {
  const formatted = formatDynamicDueDate(task, referenceNow);
  return {
    colorClass: formatted.colorClass,
    dotClass: formatted.dotClass,
    isOverdue: formatted.isOverdue,
    relativeDesc: formatted.relativeDesc,
    displayDate: formatted.displayDate,
    fullExactDate: formatted.fullExactDate,
    hasDueDate: formatted.hasDueDate
  };
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isGhost = false,
  onToggleComplete,
  onUpdate,
  onDelete,
  onMoveToPlanning,
  onStartGesture,
  onStartCherryClock
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editCategory, setEditCategory] = useState<TaskCategory>(task.category);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Sync edit fields when task changes or edit mode opens
  useEffect(() => {
    setEditTitle(task.title);
    const dynamic = formatDynamicDueDate(task);
    setEditDueDate(dynamic.hasDueDate ? (task.dueDate || dynamic.displayDate) : '');
    setEditCategory(task.category);
  }, [task, isEditing]);

  // Long press tracking refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const cardRectRef = useRef<CardRect | null>(null);
  const isGestureActiveRef = useRef(false);

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;

    let nextDueDate: string | undefined = undefined;
    let nextDueDateIso: string | undefined = undefined;
    let nextDueTimestamp: number | undefined = undefined;

    const cleanDateStr = editDueDate.trim();
    if (cleanDateStr) {
      const parsed = extractDateTime(cleanDateStr);
      if (parsed.dueTimestamp) {
        nextDueDate = parsed.dueDate;
        nextDueDateIso = parsed.dueDateIso;
        nextDueTimestamp = parsed.dueTimestamp;
      } else {
        nextDueDate = cleanDateStr;
      }
    }

    onUpdate({
      ...task,
      title: editTitle.trim(),
      dueDate: nextDueDate,
      dueDateIso: nextDueDateIso,
      dueTimestamp: nextDueTimestamp,
      category: editCategory,
      updatedAt: Date.now()
    });
    setIsEditing(false);
  };

  const handleAddTag = () => {
    const cleanTag = newTagInput.replace(/^#/, '').trim();
    if (cleanTag && !task.tags.includes(cleanTag)) {
      onUpdate({
        ...task,
        tags: [...task.tags, cleanTag],
        updatedAt: Date.now()
      });
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleCancelAddTag = () => {
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      ...task,
      tags: task.tags.filter(t => t !== tagToRemove),
      updatedAt: Date.now()
    });
  };

  // Long press pointer events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing || task.completed) return;
    // Don't trigger if clicking tag inputs or buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    // Record pointer position and card bounding box
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    const rect = e.currentTarget.getBoundingClientRect();
    cardRectRef.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    isGestureActiveRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isGestureActiveRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(15); } catch {}
      }
      if (pointerStartPosRef.current && cardRectRef.current && onStartGesture) {
        onStartGesture(task, pointerStartPosRef.current, cardRectRef.current);
      }
    }, 240);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current || isGestureActiveRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
    // If movement exceeds 8px before timer fires, consider it a page scroll and cancel
    if (dx > 8 || dy > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Dynamic time status and color
  const dueStatus = getDueDateStatus(task);
  const isOverdue = !task.completed && dueStatus.isOverdue;

  // 樱桃投喂手势调度中：保留原始占位空间，仅展示优雅的虚线框
  if (isGhost) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="w-full rounded-xl border-2 border-dashed border-rose-400/40 dark:border-rose-400/30 bg-rose-500/[0.03] dark:bg-rose-500/[0.04] flex items-center justify-center select-none pointer-events-none transition-colors"
        style={{
          height: cardRectRef.current?.height ? `${cardRectRef.current.height}px` : '48px',
          minHeight: '48px'
        }}
      >
        <span className="text-[11px] font-medium text-rose-400/60 dark:text-rose-400/50 flex items-center gap-1.5 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400/50 animate-ping" />
          <span>正在投喂...</span>
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => {
        if (isGestureActiveRef.current) {
          e.preventDefault();
        }
      }}
      style={{
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      className={`group relative rounded-xl px-3.5 py-2.5 transition-all duration-150 border acrylic-card select-none cursor-pointer ${
        task.completed
          ? 'opacity-50 border-transparent'
          : isOverdue
          ? 'border-rose-500/30 hover:border-rose-500/50'
          : 'hover:border-[var(--border-hover)]'
      }`}
    >
      {!isEditing ? (
        <div className="flex items-start justify-between gap-2">
          {/* Main Task Information */}
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-start gap-1.5 min-w-0">
              {/* Ultra-Minimalist Cherry Clock Entry: Single icon on the far left of task title */}
              {onStartCherryClock && !task.completed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCherryClock(task);
                  }}
                  className="mt-[1px] inline-flex items-center justify-center shrink-0 hover:scale-125 active:scale-90 transition-transform cursor-pointer select-none group/cherry-btn"
                  title="开启樱桃时钟倒计时"
                >
                  <CherryIcon size={16} className="filter drop-shadow-[0_1px_3px_rgba(244,63,94,0.4)]" />
                </button>
              )}

              <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                <span
                  onClick={() => setIsEditing(true)}
                  className={`text-sm select-text font-normal leading-snug break-words transition-colors ${
                    task.completed
                      ? 'line-through text-[var(--text-faint)]'
                      : 'text-[var(--text-main)] hover:text-cyan-400'
                  }`}
                  title="点击快速编辑文本"
                >
                  {task.title}
                </span>

                {/* Stale warning */}
                {task.isStale && !task.completed && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded font-mono shrink-0">
                    <AlertCircle className="w-2.5 h-2.5" />
                    停滞
                  </span>
                )}
              </div>
            </div>

            {/* Ultra-Minimalist Meta Row: Tiny clean typography for date and tags */}
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-[var(--text-faint)]">
              {/* Due Date: dynamic live color and relative calculation from concrete timestamp */}
              {dueStatus.hasDueDate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className={`inline-flex items-center gap-1 transition-colors hover:opacity-100 ${dueStatus.colorClass}`}
                  title={`${dueStatus.fullExactDate} (${dueStatus.relativeDesc || '正常'}) · 点击修改截止时间`}
                >
                  <Clock className="w-2.5 h-2.5 opacity-80" />
                  <span>{dueStatus.displayDate}</span>
                  {dueStatus.relativeDesc && isOverdue && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/15 text-rose-400 font-mono">
                      {dueStatus.relativeDesc}
                    </span>
                  )}
                </button>
              )}

              {/* Tags: clean typographic tags without bulky frames */}
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors group/tag"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="opacity-0 group-hover/tag:opacity-100 hover:text-rose-400 transition-opacity ml-0.5"
                    title={`移除标签 #${tag}`}
                  >
                    <X className="w-2 h-2" />
                  </button>
                </span>
              ))}

              {/* Minimal inline tag adder */}
              {showTagInput ? (
                <div 
                  className="inline-flex items-center gap-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-1 py-0.2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="标签名"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') handleCancelAddTag();
                    }}
                    className="w-14 text-[10px] bg-transparent text-[var(--text-main)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="text-[10px] text-[var(--text-main)] hover:underline font-medium"
                  >
                    确定
                  </button>
                  <span className="text-[9px] opacity-40">/</span>
                  <button
                    type="button"
                    onClick={handleCancelAddTag}
                    className="text-[10px] text-[var(--text-faint)] hover:text-rose-400"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTagInput(true);
                  }}
                  className="hover:text-[var(--text-sub)] transition-colors opacity-70 hover:opacity-100"
                  title="添加标签"
                >
                  +标签
                </button>
              )}
            </div>

            {/* Supplemental Notes / Info if any */}
            {task.notes && task.notes.length > 0 && (
              <div className="mt-2 space-y-1">
                {task.notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-[var(--text-sub)] bg-[var(--chip-bg)]/80 border border-[var(--chip-border)]/60 rounded-md px-2 py-1 leading-relaxed"
                  >
                    <span className="text-amber-500/90 shrink-0 font-medium select-none">💬 补充:</span>
                    <span className="flex-1 break-words">{note}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cherry Clock Subtasks: strictly read-only, automatically created on timer completion */}
            {task.cherrySubtasks && task.cherrySubtasks.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)]/40 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-rose-400 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-xs">🍒</span>
                    <span>樱桃专注记录 ({task.cherrySubtasks.length}次)</span>
                  </span>
                  <span className="text-[9px] text-[var(--text-faint)]">
                    累计 {task.cherrySubtasks.reduce((sum, c) => sum + (c.durationMinutes || 25), 0)} 分钟
                  </span>
                </div>
                <div className="space-y-1">
                  {task.cherrySubtasks.map((cherry, idx) => (
                    <div
                      key={cherry.id || idx}
                      className="flex items-center justify-between text-[10px] bg-rose-500/5 border border-rose-500/15 rounded-md px-2 py-1 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">🍒</span>
                        <span className="font-medium text-[var(--text-main)]">
                          {cherry.title || `专注完成 (${cherry.durationMinutes}m)`}
                        </span>
                        <span className="text-[9px] text-rose-400 font-mono">
                          {cherry.durationMinutes}分钟
                        </span>
                      </div>
                      <span className="text-[9px] text-[var(--text-faint)] font-mono">
                        {new Date(cherry.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Note: All hover action buttons completely removed per user request for pure minimalism */}
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-2 py-0.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-sm bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-[var(--text-main)] outline-none focus:border-[var(--accent-bg)]"
            placeholder="任务标题"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <input
              type="text"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              placeholder="截止时间 (例如: 今天 18:00, 明天 10:00, 2026-09-25 15:00)"
              className="flex-1 min-w-[130px] text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[var(--text-main)] outline-none focus:border-[var(--accent-bg)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
              }}
            />

            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
              className="text-xs bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[var(--text-main)] outline-none"
            >
              <option value="即刻完成">即刻完成</option>
              <option value="近期完成">近期完成</option>
              <option value="规划待办">规划待办</option>
            </select>

            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-2.5 py-1 text-xs bg-[var(--accent-bg)] text-[var(--accent-fg)] rounded-lg hover:opacity-90 font-medium transition-opacity"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 text-xs text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"
            >
              取消
            </button>
          </div>

          {/* Quick deadline presets */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-[var(--text-sub)] pt-0.5 select-none">
            <span className="text-[var(--text-faint)]">快速设定:</span>
            <button
              type="button"
              onClick={() => setEditDueDate('今天 18:00')}
              className="px-1.5 py-0.5 rounded bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-sub)] transition-colors"
            >
              今天 18:00
            </button>
            <button
              type="button"
              onClick={() => setEditDueDate('明天 10:00')}
              className="px-1.5 py-0.5 rounded bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-sub)] transition-colors"
            >
              明天 10:00
            </button>
            <button
              type="button"
              onClick={() => setEditDueDate('后天 18:00')}
              className="px-1.5 py-0.5 rounded bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-sub)] transition-colors"
            >
              后天 18:00
            </button>
            <button
              type="button"
              onClick={() => setEditDueDate('这周五 18:00')}
              className="px-1.5 py-0.5 rounded bg-[var(--chip-bg)] hover:bg-[var(--border-subtle)] text-[var(--text-sub)] transition-colors"
            >
              这周五 18:00
            </button>
            {editDueDate && (
              <button
                type="button"
                onClick={() => setEditDueDate('')}
                className="px-1.5 py-0.5 rounded text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              >
                清空截止
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
