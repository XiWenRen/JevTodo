import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Clock, 
  Trash2, 
  Edit3, 
  Tag as TagIcon, 
  AlertCircle,
  X
} from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory, TaskPriority } from '../types';

interface TaskItemProps {
  task: ITaskItem;
  onToggleComplete: (id: string) => void;
  onUpdate: (updated: ITaskItem) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editCategory, setEditCategory] = useState<TaskCategory>(task.category);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Unified refined priority indicators with minimal dot and elegant label
  const priorityLabels: Record<TaskPriority, { label: string; dot: string; style: React.CSSProperties }> = {
    P0: { 
      label: 'P0 紧急', 
      dot: 'bg-rose-500',
      style: {
        backgroundColor: 'var(--p0-badge-bg)',
        color: 'var(--p0-badge-text)',
        borderColor: 'var(--p0-badge-border)'
      }
    },
    P1: { 
      label: 'P1 重要', 
      dot: 'bg-amber-500',
      style: {
        backgroundColor: 'var(--p1-badge-bg)',
        color: 'var(--p1-badge-text)',
        borderColor: 'var(--p1-badge-border)'
      }
    },
    P2: { 
      label: 'P2 常规', 
      dot: 'bg-zinc-400',
      style: {
        backgroundColor: 'var(--p2-badge-bg)',
        color: 'var(--p2-badge-text)',
        borderColor: 'var(--p2-badge-border)'
      }
    },
    P3: { 
      label: 'P3 规划', 
      dot: 'bg-zinc-500',
      style: {
        backgroundColor: 'var(--p3-badge-bg)',
        color: 'var(--p3-badge-text)',
        borderColor: 'var(--p3-badge-border)'
      }
    }
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    onUpdate({
      ...task,
      title: editTitle.trim(),
      dueDate: editDueDate.trim() || undefined,
      category: editCategory,
      priority: editPriority,
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

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate({
      ...task,
      tags: task.tags.filter(t => t !== tagToRemove),
      updatedAt: Date.now()
    });
  };

  const isOverdue = !task.completed && task.dueDateIso && new Date(task.dueDateIso).getTime() < Date.now();
  const currentPriority = priorityLabels[task.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`group relative rounded-xl p-3 sm:p-3.5 transition-all duration-200 border acrylic-card ${
        task.completed
          ? 'opacity-55 border-transparent'
          : isOverdue
          ? 'border-rose-500/30'
          : ''
      }`}
    >
      {!isEditing ? (
        <div className="flex items-start gap-3">
          {/* Minimal Checkbox */}
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-all ${
              task.completed
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-[var(--border-medium)] bg-[var(--chip-bg)] hover:border-[var(--text-main)] hover:bg-[var(--chip-hover)]'
            }`}
            title={task.completed ? '标记为未完成' : '完成此待办'}
          >
            {task.completed && <Check className="h-3 w-3 stroke-[2.5]" />}
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority Chip with subtle status dot */}
              <span
                style={currentPriority.style}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none tracking-tight"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentPriority.dot}`} />
                {currentPriority.label}
              </span>

              {/* Title */}
              <span
                onClick={() => setIsEditing(true)}
                className={`text-sm cursor-pointer select-text font-normal leading-snug transition-colors ${
                  task.completed
                    ? 'line-through text-[var(--text-faint)]'
                    : 'text-[var(--text-main)] hover:opacity-80'
                }`}
              >
                {task.title}
              </span>

              {/* Jev Stale Warning */}
              {task.isStale && !task.completed && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  <AlertCircle className="w-2.5 h-2.5" />
                  停滞建议推进
                </span>
              )}
            </div>

            {/* Meta row: Due Date + Flomo Tags */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {/* Due Date Badge */}
              {task.dueDate && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    isOverdue
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 font-medium'
                      : 'bg-[var(--chip-bg)] border-[var(--chip-border)] text-[var(--text-sub)] hover:border-[var(--border-medium)]'
                  }`}
                  title="点击修改完成时间"
                >
                  <Clock className="w-3 h-3 text-[var(--text-faint)]" />
                  <span>{task.dueDate}</span>
                </button>
              )}

              {/* Flomo-style Tags (#tag) */}
              {task.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--tag-text)] bg-[var(--tag-bg)] hover:bg-[var(--chip-hover)] px-2 py-0.5 rounded-md border border-[var(--tag-border)] transition-colors group/tag"
                >
                  <span className="text-[var(--text-faint)]">#</span>
                  {tag}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag);
                    }}
                    className="opacity-0 group-hover/tag:opacity-100 hover:text-rose-500 transition-opacity ml-0.5"
                    title={`移除标签 #${tag}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

              {/* Quick Add Tag Button */}
              {showTagInput ? (
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="标签名"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') setShowTagInput(false);
                    }}
                    className="h-5 w-20 text-[11px] bg-[var(--bg-input)] border border-[var(--border-medium)] rounded px-1.5 text-[var(--text-main)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="text-[11px] text-[var(--text-main)] hover:opacity-80 font-medium"
                  >
                    确定
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTagInput(true)}
                  className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-faint)] hover:text-[var(--text-sub)] transition-colors px-1"
                  title="添加自定义标签"
                >
                  <TagIcon className="w-2.5 h-2.5" />
                  <span>+标签</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Hover Controls */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1 text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] rounded transition-colors"
              title="编辑事项详情与时间"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-1 text-[var(--text-faint)] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
              title="删除事项"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-3">
          <input
            type="text"
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg px-2.5 py-1.5 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-bg)]"
            placeholder="事项标题"
          />

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Category Selector */}
            <div>
              <label className="block text-[11px] text-[var(--text-sub)] mb-1">分类</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] outline-none"
              >
                <option value="即刻完成">即刻完成 (今日核心)</option>
                <option value="近期完成">近期完成 (本周事项)</option>
                <option value="规划待办">规划待办 (未来规划)</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-[11px] text-[var(--text-sub)] mb-1">Jev 优先级</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-[var(--text-main)] outline-none"
              >
                <option value="P0">P0 - 最高紧急</option>
                <option value="P1">P1 - 今日必做</option>
                <option value="P2">P2 - 近期常规</option>
                <option value="P3">P3 - 规划沉淀</option>
              </select>
            </div>
          </div>

          {/* Due date modification */}
          <div>
            <label className="block text-[11px] text-[var(--text-sub)] mb-1">完成时间 / 截止提醒</label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                placeholder="例如: 今天 18:00 或 明天上午"
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-main)] outline-none"
              />
              <button
                type="button"
                onClick={() => setEditDueDate('今天 18:00')}
                className="text-[10px] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-sub)] px-2 py-1 rounded border border-[var(--chip-border)]"
              >
                今天傍晚
              </button>
              <button
                type="button"
                onClick={() => setEditDueDate('明天 10:00')}
                className="text-[10px] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-sub)] px-2 py-1 rounded border border-[var(--chip-border)]"
              >
                明早
              </button>
            </div>
          </div>

          {/* Edit Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-3 py-1 text-xs font-medium bg-[var(--accent-bg)] text-[var(--accent-fg)] rounded-md hover:opacity-90 transition-opacity"
            >
              保存修改
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
