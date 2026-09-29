import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  AlertCircle,
  X,
  Calendar,
  Trash2,
  Check,
  Plus
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
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdate: (updated: ITaskItem) => void;
  onDelete: (id: string) => void;
  onMoveToPlanning?: (id: string) => void;
  onDefer?: (id: string) => void;
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
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleComplete,
  onUpdate,
  onDelete,
  onMoveToPlanning,
  onDefer,
  onStartGesture,
  onStartCherryClock
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editCategory, setEditCategory] = useState<TaskCategory>(task.category);
  const [editNotes, setEditNotes] = useState<string[]>(task.notes || []);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [showNewNoteInput, setShowNewNoteInput] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Swipe drawer state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Close swipe offset on outside click
  useEffect(() => {
    if (swipeOffset === 0) return;
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSwipeOffset(0);
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick);
    return () => window.removeEventListener('pointerdown', handleGlobalClick);
  }, [swipeOffset]);

  // Reset swipe when entering batch mode or completing task
  useEffect(() => {
    if (isBatchMode || task.completed) {
      setSwipeOffset(0);
    }
  }, [isBatchMode, task.completed]);

  // Sync edit fields when task changes or edit mode opens
  useEffect(() => {
    setEditTitle(task.title);
    const dynamic = formatDynamicDueDate(task);
    setEditDueDate(dynamic.hasDueDate ? (task.dueDate || dynamic.displayDate) : '');
    setEditCategory(task.category);
    setEditNotes(task.notes ? [...task.notes] : []);
    setNewNoteInput('');
    setShowNewNoteInput(false);
  }, [task, isEditing]);

  // Long press tracking refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const cardRectRef = useRef<CardRect | null>(null);
  const isGestureActiveRef = useRef(false);

  const handleUpdateNote = (index: number, newText: string) => {
    setEditNotes(prev => {
      const next = [...prev];
      next[index] = newText;
      return next;
    });
  };

  const handleDeleteNote = (index: number) => {
    setEditNotes(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddNewNote = () => {
    const trimmed = newNoteInput.trim();
    if (trimmed) {
      setEditNotes(prev => [...prev, trimmed]);
      setNewNoteInput('');
      setShowNewNoteInput(false);
    }
  };

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

    // Merge any pending unsubmitted newNoteInput
    const pending = newNoteInput.trim();
    const mergedNotes = pending ? [...editNotes, pending] : editNotes;
    const finalNotes = mergedNotes.map(n => n.trim()).filter(Boolean);

    onUpdate({
      ...task,
      title: editTitle.trim(),
      dueDate: nextDueDate,
      dueDateIso: nextDueDateIso,
      dueTimestamp: nextDueTimestamp,
      category: editCategory,
      notes: finalNotes.length > 0 ? finalNotes : undefined,
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

  // Card click event handler (handles batch mode selection cleanly without duplicate pointer events)
  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditing) return;

    // If card was swiped open, clicking it snaps it shut
    if (swipeOffset < 0) {
      setSwipeOffset(0);
      return;
    }

    // In batch mode, clicking anywhere on the card toggles selection exactly once
    if (isBatchMode) {
      const target = e.target as HTMLElement;
      if (target.closest('input')) return;
      onToggleSelect?.(task.id);
      return;
    }
  };

  // Long press pointer events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;

    // If card was swiped open, clicking it snaps it shut
    if (swipeOffset < 0) {
      setSwipeOffset(0);
      return;
    }

    // In batch mode, do NOT trigger drag or long press gestures
    if (isBatchMode) {
      return;
    }

    if (task.completed) return;

    // Don't trigger if clicking tag inputs or buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    // Clear any accidental text selection on touch
    if (typeof window !== 'undefined' && window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }

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
    // If movement exceeds 6px before timer fires, cancel long press to allow smooth swipe/scroll
    if (dx > 6 || dy > 6) {
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
      ref={cardRef}
      layout
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="relative w-full rounded-xl overflow-hidden select-none group/card-wrapper bg-[var(--chip-bg)]/30"
    >
      {/* Swipe Action Floating Dock Behind Card (Revealed on Left Swipe) */}
      {!task.completed && !isEditing && !isBatchMode && (
        <div className="absolute inset-y-0 right-0 w-[142px] flex items-center justify-end gap-1.5 p-1.5 z-0">
          {/* 延后 Capsule Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDefer?.(task.id);
              setSwipeOffset(0);
            }}
            className="h-full w-[62px] rounded-xl flex flex-col items-center justify-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/25 text-amber-500 dark:text-amber-400 transition-all cursor-pointer shadow-xs select-none group/defer"
            title="顺延至明天"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center group-hover/defer:scale-110 transition-transform">
              <Calendar className="w-3.5 h-3.5 text-amber-500 stroke-[2.2]" />
            </div>
            <span className="text-[10.5px] font-medium tracking-wide">延后</span>
          </button>

          {/* 删除 Capsule Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
              setSwipeOffset(0);
            }}
            className="h-full w-[62px] rounded-xl flex flex-col items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/25 text-rose-500 dark:text-rose-400 transition-all cursor-pointer shadow-xs select-none group/del"
            title="快速删除"
          >
            <div className="w-6 h-6 rounded-lg bg-rose-500/15 flex items-center justify-center group-hover/del:scale-110 transition-transform">
              <Trash2 className="w-3.5 h-3.5 text-rose-500 stroke-[2.2]" />
            </div>
            <span className="text-[10.5px] font-medium tracking-wide">删除</span>
          </button>
        </div>
      )}

      {/* Foreground Swipeable Card */}
      <motion.div
        drag={!isEditing && !isBatchMode && !task.completed ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -142, right: 0 }}
        dragElastic={0.12}
        animate={{ x: swipeOffset }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onDragStart={() => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -45 || info.velocity.x < -200) {
            setSwipeOffset(-142);
          } else {
            setSwipeOffset(0);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => {
          if (!isEditing) {
            e.preventDefault();
          }
        }}
        onClick={handleCardClick}
        style={{
          touchAction: 'pan-y',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        className={`relative z-10 w-full rounded-xl px-3.5 py-2.5 transition-all duration-150 border acrylic-card select-none cursor-pointer ${
          task.completed
            ? 'opacity-50 border-transparent'
            : isSelected
            ? 'border-[var(--accent-bg)]/60 bg-[var(--chip-bg)] shadow-xs ring-1 ring-[var(--accent-bg)]/20'
            : isOverdue
            ? 'border-rose-500/30 hover:border-rose-500/50'
            : 'hover:border-[var(--border-hover)]'
        } ${swipeOffset < 0 ? 'shadow-[-6px_0_18px_rgba(0,0,0,0.18)] border-[var(--border-medium)] bg-[var(--bg-card)]' : ''}`}
      >
        {!isEditing ? (
          <div className="flex items-start justify-between gap-2">
            {/* Main Task Information */}
            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-start gap-1.5 min-w-0">
                {/* Batch Mode Checkbox */}
                {isBatchMode && (
                  <div
                    className={`mr-2 mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all pointer-events-none border ${
                      isSelected
                        ? 'bg-[var(--accent-bg)] border-[var(--accent-bg)] text-[var(--accent-fg)] shadow-xs'
                        : 'border-[var(--border-medium)] bg-[var(--bg-input)]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                )}

                {/* Ultra-Minimalist Cherry Clock Entry: Single icon on the far left of task title */}
                {!isBatchMode && onStartCherryClock && !task.completed && (
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
                    onClick={() => {
                      if (!isBatchMode) {
                        setIsEditing(true);
                      }
                    }}
                    className={`text-sm select-none font-normal leading-snug break-words transition-colors ${
                      task.completed
                        ? 'line-through text-[var(--text-faint)]'
                        : isBatchMode
                        ? 'text-[var(--text-main)]'
                        : 'text-[var(--text-main)] hover:text-cyan-400'
                    }`}
                    title={isBatchMode ? "点击选择待办" : "点击快速编辑文本"}
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

              {/* +补充 快捷入口 */}
              {!task.completed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNewNoteInput(true);
                    setIsEditing(true);
                  }}
                  className="hover:text-amber-500 transition-colors opacity-70 hover:opacity-100 flex items-center gap-0.5"
                  title="添加补充内容/备注"
                >
                  +补充
                </button>
              )}
            </div>

            {/* Supplemental Notes / Info if any */}
            {task.notes && task.notes.length > 0 && (
              <div className="mt-2 space-y-1">
                {task.notes.map((note, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      if (!isBatchMode) {
                        e.stopPropagation();
                        setIsEditing(true);
                      }
                    }}
                    className={`flex items-start gap-1.5 text-[11px] text-[var(--text-sub)] bg-[var(--chip-bg)]/80 border border-[var(--chip-border)]/60 rounded-md px-2 py-1 leading-relaxed ${
                      !isBatchMode ? 'cursor-pointer hover:border-amber-500/40 hover:bg-[var(--chip-bg)] transition-colors' : ''
                    }`}
                    title={!isBatchMode ? "点击编辑补充内容" : undefined}
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

          {/* 补充内容 / 备注编辑区 */}
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-sub)] flex items-center gap-1.5">
                <span className="text-amber-500 text-sm">💬</span>
                <span>补充内容 / 备注</span>
                {editNotes.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--chip-bg)] text-[var(--text-faint)]">
                    {editNotes.length}条
                  </span>
                )}
              </span>
              {!showNewNoteInput && (
                <button
                  type="button"
                  onClick={() => setShowNewNoteInput(true)}
                  className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加补充</span>
                </button>
              )}
            </div>

            {/* 已有补充内容列表 */}
            {editNotes.length > 0 && (
              <div className="space-y-1.5">
                {editNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg p-1.5 group/note focus-within:border-amber-500/40"
                  >
                    <span className="text-[10px] text-amber-500/80 font-mono select-none pt-0.5 shrink-0">
                      #{idx + 1}
                    </span>
                    <textarea
                      rows={1}
                      value={note}
                      onChange={(e) => handleUpdateNote(idx, e.target.value)}
                      placeholder="补充内容..."
                      className="flex-1 text-xs bg-transparent text-[var(--text-main)] outline-none resize-none leading-relaxed"
                      style={{ minHeight: '24px' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(idx)}
                      className="text-[var(--text-faint)] hover:text-rose-400 p-1 rounded transition-colors shrink-0 opacity-60 group-hover/note:opacity-100"
                      title="删除此条补充"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新增补充内容输入区 */}
            {showNewNoteInput ? (
              <div className="flex items-start gap-1.5 bg-[var(--bg-input)] border border-amber-500/40 rounded-lg p-2">
                <textarea
                  rows={2}
                  autoFocus
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="输入补充内容或备注（按 Ctrl+Enter 或点击添加）..."
                  className="flex-1 text-xs bg-transparent text-[var(--text-main)] outline-none resize-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleAddNewNote();
                    } else if (e.key === 'Escape') {
                      setShowNewNoteInput(false);
                    }
                  }}
                />
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddNewNote}
                    disabled={!newNoteInput.trim()}
                    className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-md font-medium transition-all"
                  >
                    添加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewNoteInput('');
                      setShowNewNoteInput(false);
                    }}
                    className="px-2.5 py-0.5 text-[11px] text-[var(--text-faint)] hover:text-[var(--text-main)]"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : editNotes.length === 0 ? (
              <div 
                onClick={() => setShowNewNoteInput(true)}
                className="text-xs text-[var(--text-faint)] hover:text-amber-500/90 border border-dashed border-[var(--border-subtle)] hover:border-amber-500/40 rounded-lg py-2 px-3 text-center cursor-pointer transition-colors"
              >
                + 点击添加第一条补充内容或备注
              </div>
            ) : null}
          </div>
        </div>
      )}
      </motion.div>
    </motion.div>
  );
};
