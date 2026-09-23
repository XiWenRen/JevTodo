import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScrollText, 
  X, 
  Sparkles, 
  PlusCircle, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Clock, 
  ChevronRight, 
  Layers, 
  RotateCcw,
  Sparkle
} from 'lucide-react';
import { OperationLogItem, OperationType } from '../types/operationLog';
import { getOperationLogs, clearOperationLogs } from '../utils/operationLog';
import { TaskSnapshotModal } from './TaskSnapshotModal';

interface OperationLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OperationLogModal: React.FC<OperationLogModalProps> = ({
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<OperationLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<OperationLogItem | null>(null);

  // Load logs on open
  useEffect(() => {
    if (isOpen) {
      setLogs(getOperationLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('确定要清空所有历史操作记录吗？')) {
      clearOperationLogs();
      setLogs([]);
    }
  };

  const formatLogTime = (ts: number) => {
    const d = new Date(ts);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${m}-${day} ${h}:${min}:${s}`;
  };

  const getLogIcon = (type: OperationType) => {
    switch (type) {
      case 'jev_auto_organize':
        return (
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-sm shadow-amber-500/20 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        );
      case 'task_create':
      case 'batch_split':
        return (
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
            <PlusCircle className="w-3.5 h-3.5" />
          </div>
        );
      case 'task_complete':
        return (
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        );
      case 'task_uncomplete':
        return (
          <div className="w-7 h-7 rounded-xl bg-zinc-500/15 border border-zinc-500/25 flex items-center justify-center text-zinc-400 shrink-0">
            <Circle className="w-3.5 h-3.5" />
          </div>
        );
      case 'task_delete':
        return (
          <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </div>
        );
      case 'gesture_organize':
      case 'task_defer':
        return (
          <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-xl bg-zinc-500/15 border border-zinc-500/25 flex items-center justify-center text-zinc-400 shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
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
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--chip-bg)]/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ScrollText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    操作记录与决策日志
                  </h3>
                  <p className="text-[11px] text-[var(--text-sub)]">
                    记录全部手动操作与 Cherry 智能优化结果 · 单击查看对应任务清单
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-faint)] hover:text-rose-400 transition-colors text-xs flex items-center gap-1"
                    title="清空记录"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">清空</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors shrink-0"
                  title="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 min-h-[220px]">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--text-faint)] space-y-2">
                  <ScrollText className="w-8 h-8 mx-auto opacity-30 stroke-[1.5]" />
                  <div>暂无操作历史记录</div>
                  <div className="text-[11px]">您的待办操作和 Cherry 自动整理结果将自动保存在这里</div>
                </div>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--chip-bg)]/50 hover:bg-[var(--chip-bg)] hover:border-[var(--border-medium)] transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getLogIcon(log.type)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text-main)] truncate">
                            {log.title}
                          </span>
                          <span className="text-[10px] text-[var(--text-faint)] font-mono shrink-0">
                            {formatLogTime(log.timestamp)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-sub)] truncate mt-0.5 max-w-[280px] sm:max-w-sm">
                          {log.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip-hover)] text-[var(--text-sub)] border border-[var(--chip-border)]">
                        {log.affectedCount} 项
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-faint)] group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--chip-bg)]/30 shrink-0 text-xs">
              <span className="text-[11px] text-[var(--text-faint)]">
                共记录 {logs.length} 次操作
              </span>
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

      {/* Task Snapshot Drilldown Modal */}
      {selectedLog && (
        <TaskSnapshotModal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={selectedLog.title}
          description={selectedLog.description}
          timestamp={selectedLog.timestamp}
          tasks={selectedLog.taskSnapshots}
        />
      )}
    </>
  );
};
