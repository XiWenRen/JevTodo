import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Sparkles, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { TaskItem, JevCleanupItem } from '../types';

interface JevCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  cleanupList: JevCleanupItem[];
  onApplyRanking: () => void;
  onApplyCleanup: (actions: Record<string, 'archive' | 'defer' | 'keep'>) => void;
}

export const JevCleanupModal: React.FC<JevCleanupModalProps> = ({
  isOpen,
  onClose,
  tasks,
  cleanupList,
  onApplyRanking,
  onApplyCleanup
}) => {
  const [selectedActions, setSelectedActions] = useState<Record<string, 'archive' | 'defer' | 'keep'>>(() => {
    const initial: Record<string, 'archive' | 'defer' | 'keep'> = {};
    cleanupList.forEach(item => {
      initial[item.task.id] = item.suggestedAction === 'archive' ? 'archive' : 'defer';
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleActionChange = (taskId: string, action: 'archive' | 'defer' | 'keep') => {
    setSelectedActions(prev => ({
      ...prev,
      [taskId]: action
    }));
  };

  const handleConfirmCleanup = () => {
    onApplyCleanup(selectedActions);
    onClose();
  };

  const handleConfirmRanking = () => {
    onApplyRanking();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="acrylic-panel w-full max-w-md rounded-2xl p-5 border border-[var(--border-medium)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                Jev 智能排序与待办清理
              </h3>
              <p className="text-[11px] text-[var(--text-faint)]">
                基于智能决策分析紧迫度与停滞事项
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-faint)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--chip-bg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body scroll area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {/* Section 1: Intelligent Priority Ranking */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-main)]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                优先级智能重排
              </span>
              <span className="text-[10px] text-[var(--text-faint)] font-mono">
                智能权重评分
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
              系统已根据截止时间临近度、P0~P3 重要级别和紧迫度，对全量 {tasks.length} 项事项完成动态权衡排序。
            </p>
            <button
              type="button"
              onClick={handleConfirmRanking}
              className="w-full mt-2 py-2 px-3 text-xs font-medium bg-[var(--accent-bg)] text-[var(--accent-fg)] rounded-lg transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5 font-semibold shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              应用智能优先级排序
            </button>
          </div>

          {/* Section 2: Stale Cleanup Recommendations */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                停滞与冗余事项清理建议 ({cleanupList.length})
              </span>
              <span className="text-[10px] text-[var(--text-faint)]">
                自动识别停滞 &gt; 5 天
              </span>
            </div>

            {cleanupList.length === 0 ? (
              <div className="py-5 text-center rounded-xl bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-sub)]">太棒了，目前没有停滞或冗余事项</p>
                <p className="text-[10px] text-[var(--text-faint)] mt-1">清单保持极致精简，继续保持！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cleanupList.map(({ task, reason, suggestedAction }) => {
                  const currentAction = selectedActions[task.id] || (suggestedAction === 'archive' ? 'archive' : 'defer');

                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[var(--text-main)]">
                              {task.title}
                            </span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--chip-bg)] text-[var(--text-sub)] border border-[var(--chip-border)]">
                              {task.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-500 mt-0.5">
                            {reason}
                          </p>
                        </div>
                      </div>

                      {/* Action selector */}
                      <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleActionChange(task.id, 'defer')}
                          className={`px-2 py-1 rounded border transition-colors ${
                            currentAction === 'defer'
                              ? 'bg-[var(--chip-hover)] text-[var(--text-main)] border-[var(--border-medium)] font-medium'
                              : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          顺延至近期
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionChange(task.id, 'archive')}
                          className={`px-2 py-1 rounded border transition-colors ${
                            currentAction === 'archive'
                              ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 font-medium'
                              : 'bg-[var(--chip-bg)] text-[var(--text-sub)] border-[var(--chip-border)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          清理归档
                        </button>
                        <button
                          type="button"
                          onClick={() => handleActionChange(task.id, 'keep')}
                          className={`px-2 py-1 rounded border transition-colors ${
                            currentAction === 'keep'
                              ? 'bg-[var(--chip-hover)] text-[var(--text-main)] border-[var(--border-medium)]'
                              : 'bg-[var(--chip-bg)] text-[var(--text-faint)] border-[var(--chip-border)] hover:text-[var(--text-sub)]'
                          }`}
                        >
                          保留原状
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleConfirmCleanup}
                  className="w-full mt-2 py-2 px-3 text-xs font-medium bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-medium)] rounded-lg hover:bg-[var(--chip-bg)] transition-all"
                >
                  一键执行选定的清理方案
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
          >
            完成并关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
};
