import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory } from '../types';

interface JevDuplicateModalProps {
  isOpen: boolean;
  duplicateInfo: {
    newInput: string;
    matchedTask: ITaskItem;
    similarity: number;
    reason: string;
    parsedCategory?: TaskCategory;
    parsedDueDate?: string;
    parsedTags?: string[];
  } | null;
  onIgnore: () => void;
  onAppendToExisting: (matchedTask: ITaskItem, supplementalText: string, newTags?: string[], newDueDate?: string) => void;
  onForceCreateNew?: (newInput: string) => void;
  onClose: () => void;
}

export const JevDuplicateModal: React.FC<JevDuplicateModalProps> = ({
  isOpen,
  duplicateInfo,
  onIgnore,
  onAppendToExisting,
  onForceCreateNew,
  onClose
}) => {
  if (!isOpen || !duplicateInfo) return null;

  const { newInput, matchedTask, parsedDueDate, parsedTags } = duplicateInfo;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 420 }}
          className="relative w-full max-w-[320px] acrylic-panel rounded-2xl p-4 shadow-2xl border border-[var(--border-subtle)] space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-[var(--text-faint)] hover:text-[var(--text-main)] p-1 rounded-lg transition-colors"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Minimal Essential Comparison */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-faint)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>已有相似待办</span>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] text-xs text-[var(--text-main)] font-medium leading-snug break-words">
              {matchedTask.title}
              {matchedTask.dueDate && (
                <div className="text-[10px] text-[var(--text-sub)] mt-1 font-normal">
                  {matchedTask.dueDate}
                </div>
              )}
            </div>

            {newInput.trim() !== matchedTask.title.trim() && (
              <div className="text-[11px] text-[var(--text-sub)] px-1 leading-snug break-words">
                新输入：<span className="text-[var(--text-main)]">{newInput}</span>
              </div>
            )}
          </div>

          {/* Two Prominent Minimal Action Buttons: 忽略 vs 补充 */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onIgnore}
              className="flex-1 py-2 px-3 rounded-xl border border-[var(--chip-border)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-xs font-medium text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all active:scale-95 text-center"
            >
              忽略
            </button>

            <button
              type="button"
              onClick={() => onAppendToExisting(matchedTask, newInput, parsedTags, parsedDueDate)}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              补充
            </button>
          </div>

          {/* Subtle alternative to force create */}
          {onForceCreateNew && (
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => onForceCreateNew(newInput)}
                className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text-sub)] transition-colors"
              >
                仍作为新待办创建
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
