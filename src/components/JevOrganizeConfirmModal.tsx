import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { TaskItem } from '../types';

export interface OrganizeOptions {
  reorderTasks: boolean;
  deferOverdue: boolean;
  archiveStale: boolean;
}

interface JevOrganizeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: OrganizeOptions) => void;
  tasks: TaskItem[];
  adviceSummary: string;
  overdueCount: number;
  staleCount: number;
}

export const JevOrganizeConfirmModal: React.FC<JevOrganizeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  overdueCount,
  staleCount
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      reorderTasks: true,
      deferOverdue: overdueCount > 0,
      archiveStale: staleCount > 0
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
        {/* Soft Depth Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
        />

        {/* Minimalist Frosted Acrylic Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative w-full max-w-[300px] rounded-2xl border p-5 flex flex-col items-center text-center select-none z-10"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-drawer) 97%, transparent)',
            backdropFilter: 'blur(40px) saturate(190%) contrast(105%)',
            WebkitBackdropFilter: 'blur(40px) saturate(190%) contrast(105%)',
            borderColor: 'var(--border-medium)',
            color: 'var(--text-main)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)'
          }}
        >
          {/* Subtle Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] transition-colors"
            title="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Elegant Theme-Harmonized Icon Badge */}
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shrink-0 border transition-colors"
            style={{
              backgroundColor: 'var(--btn-primary-tint)',
              borderColor: 'var(--btn-primary-tint-border)',
              color: 'var(--btn-primary-tint-text)'
            }}
          >
            <Sparkles className="w-5 h-5 opacity-90" />
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">
            确认智能整理待办？
          </h3>

          {/* Concise, elegant summary message */}
          <p className="text-xs text-[var(--text-sub)] leading-relaxed mb-5 px-1">
            Cherry 将按紧迫度与截止时间重排任务执行顺序
            {overdueCount > 0 ? (
              <span>，并顺延 <b className="text-[var(--text-main)] font-semibold">{overdueCount} 项逾期待办</b> 至明天</span>
            ) : null}
            。
          </p>

          {/* Quick Confirmation Actions */}
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full h-9 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all transform active:scale-[0.98] cursor-pointer hover:opacity-90 border"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-fg)',
                borderColor: 'var(--btn-primary-border)',
                boxShadow: 'var(--btn-primary-shadow)'
              }}
            >
              <Sparkles className="w-3.5 h-3.5 opacity-80" />
              <span>立即开始整理</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-7 rounded-lg text-xs text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
