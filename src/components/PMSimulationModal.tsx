import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  CheckSquare, 
  FileText, 
  Code, 
  BarChart3, 
  ShoppingCart, 
  Wallet, 
  Users, 
  Flag, 
  Database, 
  Trash2, 
  ArrowRight, 
  Sparkles,
  Layers,
  Plus
} from 'lucide-react';
import { PM_SCENARIO_LIST, PMScenarioDef, generatePMSimulatedTasks } from '../data/pmScenarios';
import { TaskItem } from '../types';

interface PMSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAllPMTasks: (tasks: TaskItem[]) => void;
  onInsertSingleTask: (rawText: string) => Promise<void>;
  apiKey?: string;
  endpoint?: string;
}

export const PMSimulationModal: React.FC<PMSimulationModalProps> = ({
  isOpen,
  onClose,
  onLoadAllPMTasks,
  onInsertSingleTask
}) => {
  const [injectingId, setInjectingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const getIcon = (type: PMScenarioDef['iconType']) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'test': return <CheckSquare className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'doc': return <FileText className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'code': return <Code className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'chart': return <BarChart3 className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'cart': return <ShoppingCart className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'wallet': return <Wallet className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'users': return <Users className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'flag': return <Flag className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'server': return <Database className="w-4 h-4 text-[var(--text-sub)]" />;
      case 'trash': return <Trash2 className="w-4 h-4 text-[var(--text-faint)]" />;
      default: return <Briefcase className="w-4 h-4 text-[var(--text-sub)]" />;
    }
  };

  const handleLoadFullSuite = () => {
    const tasks = generatePMSimulatedTasks();
    onLoadAllPMTasks(tasks);
    onClose();
  };

  const handleInject = async (scenario: PMScenarioDef) => {
    setInjectingId(scenario.id);
    try {
      await onInsertSingleTask(scenario.rawInput);
    } finally {
      setInjectingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="acrylic-panel w-full max-w-2xl rounded-2xl p-4 sm:p-5 border border-[var(--border-medium)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)]">
              <Briefcase className="w-5 h-5 text-sky-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  职场精选工作流模版
                </h3>
                <span className="text-[10px] bg-[var(--chip-bg)] text-[var(--text-sub)] px-1.5 py-0.5 rounded border border-[var(--chip-border)] font-medium">
                  精选场景库
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
                覆盖进度推进、需求评审、立项采购、人员协调与技术运维等典型事项，支持单项或成套导入
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--chip-bg)] transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-sub)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>共收录 {PM_SCENARIO_LIST.length} 项典型职场任务示例</span>
          </div>

          <button
            type="button"
            onClick={handleLoadFullSuite}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>一键导入全部示例待办</span>
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 text-xs space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PM_SCENARIO_LIST.map((scenario) => {
              const isInjecting = injectingId === scenario.id;
              return (
                <div
                  key={scenario.id}
                  className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-main)]">
                        {getIcon(scenario.iconType)}
                        {scenario.categoryName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-sub)]">
                        {scenario.expectedCategory} · {scenario.expectedPriority}
                      </span>
                    </div>

                    <p className="text-[var(--text-main)] font-medium text-xs">
                      {scenario.title}
                    </p>

                    <div className="p-2 rounded-lg bg-[var(--chip-bg)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-sub)] break-words">
                      "{scenario.rawInput}"
                    </div>

                    <p className="text-[10px] text-[var(--text-faint)] leading-normal">
                      {scenario.description}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {scenario.expectedTags.map(tag => (
                        <span key={tag} className="text-[10px] text-[var(--text-sub)] bg-[var(--chip-bg)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isInjecting}
                      onClick={() => handleInject(scenario)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] font-medium text-[11px] flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isInjecting ? (
                        <span>录入中...</span>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 text-[var(--text-sub)]" />
                          <span>导入此待办</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
