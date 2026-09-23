import React, { useState, useRef } from 'react';
import { 
  Clock, 
  AlertCircle,
  X
} from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory } from '../types';

export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TaskItemProps {
  task: ITaskItem;
  onToggleComplete: (id: string) => void;
  onUpdate: (updated: ITaskItem) => void;
  onDelete: (id: string) => void;
  onMoveToPlanning?: (id: string) => void;
  onStartGesture?: (task: ITaskItem, point: { x: number; y: number }, cardRect: CardRect) => void;
}

export interface DueDateStatus {
  colorClass: string;
  dotClass: string;
  isOverdue: boolean;
  relativeDesc: string;
}

export function getDueDateStatus(task: ITaskItem): DueDateStatus {
  if (!task.dueDate && !task.dueDateIso) {
    return {
      colorClass: 'text-[var(--text-sub)]',
      dotClass: 'bg-[var(--text-faint)]',
      isOverdue: false,
      relativeDesc: ''
    };
  }

  let dueMs: number | null = null;
  if (task.dueDateIso) {
    const t = new Date(task.dueDateIso).getTime();
    if (!isNaN(t)) dueMs = t;
  }

  // Fallback to parse relative expressions like "今天 14:00" or "明天 10:00"
  if (!dueMs && task.dueDate) {
    const todayMatch = task.dueDate.match(/(?:今天|今日)\s*(\d{1,2})[:：](\d{2})/);
    if (todayMatch) {
      const d = new Date();
      d.setHours(parseInt(todayMatch[1], 10), parseInt(todayMatch[2], 10), 0, 0);
      dueMs = d.getTime();
    }
    const tomorrowMatch = task.dueDate.match(/明天\s*(\d{1,2})[:：](\d{2})/);
    if (tomorrowMatch) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(parseInt(tomorrowMatch[1], 10), parseInt(tomorrowMatch[2], 10), 0, 0);
      dueMs = d.getTime();
    }
    const yesterdayMatch = task.dueDate.match(/昨天\s*(\d{1,2})[:：](\d{2})/);
    if (yesterdayMatch) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(parseInt(yesterdayMatch[1], 10), parseInt(yesterdayMatch[2], 10), 0, 0);
      dueMs = d.getTime();
    }
  }

  if (!dueMs) {
    return {
      colorClass: 'text-[var(--text-sub)]',
      dotClass: 'bg-[var(--text-faint)]',
      isOverdue: false,
      relativeDesc: task.dueDate || ''
    };
  }

  const now = Date.now();
  const diffHours = (dueMs - now) / (1000 * 60 * 60);

  // 1. 已过任务时间 (Past due): 仅逾期时才展示红色
  if (diffHours < 0) {
    const hoursPast = Math.abs(Math.round(diffHours));
    const desc = hoursPast >= 24 
      ? `已逾期 ${Math.round(hoursPast / 24)}天` 
      : hoursPast >= 1 
      ? `已逾期 ${hoursPast}h` 
      : '刚刚逾期';
    return {
      colorClass: 'text-rose-500 font-medium',
      dotClass: 'bg-rose-500',
      isOverdue: true,
      relativeDesc: desc
    };
  }

  // 2. 2小时内即将到期: 暖橙黄预警 (Warm Amber)
  if (diffHours <= 2) {
    const mins = Math.max(1, Math.round(diffHours * 60));
    return {
      colorClass: 'text-amber-500 font-medium',
      dotClass: 'bg-amber-500',
      isOverdue: false,
      relativeDesc: `${mins}分钟内`
    };
  }

  // 3. 今日稍晚 (2~12小时): 恬静天蓝 (Calm Sky Blue)
  if (diffHours <= 12) {
    return {
      colorClass: 'text-sky-400 font-normal',
      dotClass: 'bg-sky-400',
      isOverdue: false,
      relativeDesc: '今日稍晚'
    };
  }

  // 4. 明后天 (12~48小时): 清爽浅绿 (Mint / Emerald)
  if (diffHours <= 48) {
    return {
      colorClass: 'text-emerald-400/90 font-normal',
      dotClass: 'bg-emerald-400',
      isOverdue: false,
      relativeDesc: '近两天'
    };
  }

  // 5. 远期未来 (>48小时): 宁静淡灰 (Calm Muted Gray)
  return {
    colorClass: 'text-[var(--text-sub)]',
    dotClass: 'bg-[var(--text-faint)]',
    isOverdue: false,
    relativeDesc: ''
  };
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onUpdate,
  onDelete,
  onMoveToPlanning,
  onStartGesture
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editCategory, setEditCategory] = useState<TaskCategory>(task.category);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Long press tracking refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const cardRectRef = useRef<CardRect | null>(null);
  const isGestureActiveRef = useRef(false);

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    onUpdate({
      ...task,
      title: editTitle.trim(),
      dueDate: editDueDate.trim() || undefined,
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

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={() => setIsEditing(true)}
                className={`text-sm select-text font-normal leading-snug transition-colors ${
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
                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-500 bg-amber-500/10 px-1 py-0.2 rounded font-mono">
                  <AlertCircle className="w-2.5 h-2.5" />
                  停滞
                </span>
              )}
            </div>

            {/* Ultra-Minimalist Meta Row: Tiny clean typography for date and tags */}
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-[var(--text-faint)]">
              {/* Due Date: dynamic color based on distance to now, red ONLY if passed */}
              {task.dueDate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className={`inline-flex items-center gap-1 transition-colors hover:opacity-100 ${dueStatus.colorClass}`}
                  title={dueStatus.relativeDesc ? `${task.dueDate} · ${dueStatus.relativeDesc}` : task.dueDate}
                >
                  <Clock className="w-2.5 h-2.5 opacity-80" />
                  <span>{task.dueDate}</span>
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
              placeholder="截止时间 (例如: 今天 18:00)"
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
        </div>
      )}
    </div>
  );
};
