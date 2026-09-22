import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Briefcase, 
  Play, 
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
  Terminal,
  Activity,
  Layers
} from 'lucide-react';
import { PM_SCENARIO_LIST, PMScenarioDef, generatePMSimulatedTasks } from '../data/pmScenarios';
import { TaskItem, TaskCategory } from '../types';
import { evaluateWithJev } from '../utils/jev';

interface PMSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAllPMTasks: (tasks: TaskItem[]) => void;
  onInsertSingleTask: (rawText: string) => Promise<void>;
  apiKey?: string;
  endpoint?: string;
}

interface TestResult {
  id: string;
  passed: boolean;
  actualCategory: TaskCategory;
  actualPriority: string;
  actualTags: string[];
  latencyMs: number;
}

export const PMSimulationModal: React.FC<PMSimulationModalProps> = ({
  isOpen,
  onClose,
  onLoadAllPMTasks,
  onInsertSingleTask,
  apiKey,
  endpoint
}) => {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'automated'>('scenarios');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testProgress, setTestProgress] = useState(0);
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

  const runAutomatedTest = async () => {
    setIsRunningTest(true);
    setTestResults({});
    setTestProgress(0);

    const results: Record<string, TestResult> = {};
    const total = PM_SCENARIO_LIST.length;

    for (let i = 0; i < total; i++) {
      const scenario = PM_SCENARIO_LIST[i];
      const start = performance.now();
      
      const decision = await evaluateWithJev(scenario.rawInput, { apiKey, endpoint });
      const latency = Math.round(performance.now() - start);

      const passed = decision.category === scenario.expectedCategory;
      results[scenario.id] = {
        id: scenario.id,
        passed,
        actualCategory: decision.category,
        actualPriority: decision.priority,
        actualTags: decision.tags,
        latencyMs: latency
      };

      setTestResults({ ...results });
      setTestProgress(Math.round(((i + 1) / total) * 100));
      await new Promise(r => setTimeout(r, 50));
    }

    setIsRunningTest(false);
  };

  const passedCount = Object.values(testResults).filter(r => r.passed).length;
  const totalTested = Object.keys(testResults).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="acrylic-panel w-full max-w-2xl rounded-2xl p-4 sm:p-5 border border-[var(--border-medium)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)]">
              <Briefcase className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  软件项目经理（PM）实战场景演练与系统测试
                </h3>
                <span className="text-[10px] bg-[var(--chip-bg)] text-[var(--text-sub)] font-mono px-1.5 py-0.5 rounded border border-[var(--chip-border)]">
                  10+ 真实场景
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
                模拟覆盖：进度把控、代码开发、需求与用例评审、立项采购、预算申报、人员管理、服务器运维与机房迁移
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-faint)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--chip-bg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-1 bg-[var(--chip-bg)] p-1 rounded-xl border border-[var(--chip-border)]">
            <button
              type="button"
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'scenarios'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-medium)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              场景清单与注入测试
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('automated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'automated'
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-medium)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              自动化决策评估套件
            </button>
          </div>

          {/* Quick full load button */}
          <button
            type="button"
            onClick={handleLoadFullSuite}
            className="px-3 py-1.5 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Layers className="w-3.5 h-3.5" />
            一键载入 PM 完整工作流测试数据
          </button>
        </div>

        {/* Body content based on tab */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 text-xs space-y-3">
          {activeTab === 'scenarios' ? (
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] flex items-center justify-between">
                <span className="text-[var(--text-sub)] text-[11px] leading-relaxed">
                  点击下方任一真实项目经理日常场景，即可实时将该指令发送至 <strong className="text-[var(--text-main)]">Jev 决策引擎</strong>，检验自然语言解析、时间提取、Flomo 标签打标与分类判定。
                </span>
              </div>

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
                            <span>解析中...</span>
                          ) : (
                            <>
                              <span>测试录入</span>
                              <ArrowRight className="w-3 h-3 text-[var(--text-faint)]" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Benchmark Controller */}
              <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-[var(--text-sub)]" />
                      Jev System One 决策回归自动化测试
                    </h4>
                    <p className="text-[11px] text-[var(--text-faint)] mt-0.5">
                      并行批量测试 11 个涵盖 PM 日常各维度的自然语言命题，验证分类准确率与延迟
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isRunningTest}
                    onClick={runAutomatedTest}
                    className="px-3.5 py-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {isRunningTest ? '自动化测试执行中...' : '开始全量回归测试'}
                  </button>
                </div>

                {/* Progress bar */}
                {isRunningTest && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)] font-mono">
                      <span>测试进度: {testProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--chip-bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-bg)] transition-all duration-150"
                        style={{ width: `${testProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats */}
                {totalTested > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center font-mono">
                    <div className="p-2 rounded-lg bg-[var(--chip-bg)]">
                      <span className="text-[10px] text-[var(--text-faint)] block">通过率</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {Math.round((passedCount / totalTested) * 100)}% ({passedCount}/{totalTested})
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--chip-bg)]">
                      <span className="text-[10px] text-[var(--text-faint)] block">测试用例</span>
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        {totalTested} 场景
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--chip-bg)]">
                      <span className="text-[10px] text-[var(--text-faint)] block">平均延迟</span>
                      <span className="text-sm font-semibold text-[var(--text-main)]">
                        {Math.round(
                          Object.values(testResults).reduce((acc, r) => acc + r.latencyMs, 0) /
                            totalTested
                        )}{' '}
                        ms
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Items Table */}
              <div className="space-y-1.5">
                {PM_SCENARIO_LIST.map((scenario) => {
                  const res = testResults[scenario.id];
                  return (
                    <div
                      key={scenario.id}
                      className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        {res ? (
                          res.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                          )
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-[var(--border-medium)] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-main)] truncate">
                            {scenario.title}
                          </p>
                          <p className="text-[10px] text-[var(--text-faint)] truncate font-mono">
                            预期: {scenario.expectedCategory} · {scenario.expectedPriority}
                          </p>
                        </div>
                      </div>

                      {res && (
                        <div className="text-right shrink-0 font-mono text-[11px]">
                          <span className={`font-semibold ${res.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {res.actualCategory} · {res.actualPriority}
                          </span>
                          <span className="block text-[10px] text-[var(--text-faint)]">
                            {res.latencyMs} ms
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-faint)]">
            已覆盖软件项目经理各层级核心职责场景
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 rounded-lg transition-colors shadow-sm"
          >
            完成测试并返回
          </button>
        </div>
      </motion.div>
    </div>
  );
};
