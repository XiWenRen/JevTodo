import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Check, 
  ListPlus, 
  Trash2, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  ArrowRight,
  PlusCircle,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';
import { TaskItem as ITaskItem, TaskCategory, TaskPriority } from '../types';
import { splitTasksWithJev, extractDateTime, extractFlomoTags, detectDuplicateWithJev } from '../utils/jev';

export interface BatchParsedTask {
  id: string;
  rawText: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  urgencyScore: number;
  tags: string[];
  dueDate?: string;
  dueDateIso?: string;
  dueTimestamp?: number;
  selected: boolean;
  duplicateInfo?: {
    matchedTask: ITaskItem;
    similarity: number;
    reason: string;
    action: 'add_new' | 'append_to_existing' | 'ignore';
  };
}

interface JevBatchSplitModalProps {
  isOpen: boolean;
  initialText?: string;
  existingTasks: ITaskItem[];
  onConfirmBatch: (tasksToAdd: BatchParsedTask[], tasksToAppend: Array<{ matchedTask: ITaskItem; supplementalText: string; tags?: string[]; dueDate?: string }>) => void;
  onClose: () => void;
}

export const JevBatchSplitModal: React.FC<JevBatchSplitModalProps> = ({
  isOpen,
  initialText = '',
  existingTasks,
  onConfirmBatch,
  onClose
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [parsedItems, setParsedItems] = useState<BatchParsedTask[]>([]);
  const [activeStep, setActiveStep] = useState<'input' | 'review'>('input');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sync initialText when modal opens
  useEffect(() => {
    if (isOpen) {
      const textToUse = initialText || '';
      setInputText(textToUse);
      if (textToUse.trim()) {
        processSplit(textToUse);
        setActiveStep('review');
      } else {
        setParsedItems([]);
        setActiveStep('input');
      }
    }
  }, [isOpen, initialText]);

  // Execute Jev intelligent parsing on batch text
  const processSplit = (text: string) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);

    try {
      const splitStrings = splitTasksWithJev(text);
      const items: BatchParsedTask[] = splitStrings.map((str, index) => {
        const { dueDate, dueDateIso, dueTimestamp, cleanTitle } = extractDateTime(str);
        const { tags } = extractFlomoTags(cleanTitle);

        // Preliminary category & priority heuristic
        const lower = str.toLowerCase();
        let category: TaskCategory = '近期完成';
        let priority: TaskPriority = 'P2';
        let urgencyScore = 0.65;

        const isPast = /(昨天|昨日|昨晚|昨早|前天|前日|前晚|大前天|上周|上星期)/.test(lower);
        if (!isPast && (/(今天|今晚|下午|马上|紧急|现在|尽快|宕机|告警|502)/.test(lower) || (dueDate && dueDate.includes('今天')))) {
          category = '即刻完成';
          priority = /(宕机|告警|紧急|重要|p0)/.test(lower) ? 'P0' : 'P1';
          urgencyScore = 0.92;
        } else if (/(下个月|明年|长远|规划|计划|想学|学习|调研)/.test(lower)) {
          category = '规划待办';
          priority = 'P3';
          urgencyScore = 0.3;
        } else {
          category = '近期完成';
          priority = /(重要|紧要|p1)/.test(lower) ? 'P1' : 'P2';
        }

        // Check duplicate with Jev
        const dupCheck = detectDuplicateWithJev(str, existingTasks);

        return {
          id: `batch-${Date.now()}-${index}`,
          rawText: str,
          title: cleanTitle.replace(/#([\u4e00-\u9fa5\w-]+)/g, '').trim() || str,
          category,
          priority,
          urgencyScore,
          tags,
          dueDate,
          dueDateIso,
          dueTimestamp,
          selected: true,
          duplicateInfo: dupCheck.isDuplicate && dupCheck.matchedTask ? {
            matchedTask: dupCheck.matchedTask,
            similarity: dupCheck.similarity,
            reason: dupCheck.reason,
            action: 'append_to_existing' // default to helpful append option
          } : undefined
        };
      });

      setParsedItems(items);
      setActiveStep('review');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectAll = (select: boolean) => {
    setParsedItems(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleToggleItem = (id: string) => {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateItemTitle = (id: string, newTitle: string) => {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  const handleUpdateItemCategory = (id: string, category: TaskCategory) => {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, category } : item))
    );
  };

  const handleUpdateItemPriority = (id: string, priority: TaskPriority) => {
    setParsedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, priority } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSetDupAction = (id: string, action: 'add_new' | 'append_to_existing' | 'ignore') => {
    setParsedItems(prev =>
      prev.map(item => {
        if (item.id === id && item.duplicateInfo) {
          return {
            ...item,
            duplicateInfo: {
              ...item.duplicateInfo,
              action
            }
          };
        }
        return item;
      })
    );
  };

  // Submit batch
  const handleConfirm = () => {
    const tasksToAdd: BatchParsedTask[] = [];
    const tasksToAppend: Array<{ matchedTask: ITaskItem; supplementalText: string; tags?: string[]; dueDate?: string }> = [];

    parsedItems.forEach(item => {
      if (!item.selected) return;

      if (item.duplicateInfo) {
        if (item.duplicateInfo.action === 'append_to_existing') {
          tasksToAppend.push({
            matchedTask: item.duplicateInfo.matchedTask,
            supplementalText: item.rawText,
            tags: item.tags,
            dueDate: item.dueDate
          });
        } else if (item.duplicateInfo.action === 'add_new') {
          tasksToAdd.push(item);
        }
        // if 'ignore', do nothing
      } else {
        tasksToAdd.push(item);
      }
    });

    onConfirmBatch(tasksToAdd, tasksToAppend);
    onClose();
  };

  // Quick preset sample text
  const loadSampleText = (type: 'meeting' | 'daily') => {
    if (type === 'meeting') {
      const sample = `项目组周二例会行动项：
1. 今天下午3点前排查服务器502告警并恢复服务 #运维 P0
2. 明天上午10点组织前端性能重构方案评审 #研发
3. 周四下班前提交Q3硬件采购与预算申报 #预算 #采购
4. 周五前跟测试组对齐双活迁移冒烟测试用例 #测试
5. 调研新一代分布式数据库技术选型 #规划`;
      setInputText(sample);
      processSplit(sample);
    } else {
      const sample = `今日备忘：
- 下午2点去医院拿体检报告 #健康
- 晚上记得买牛奶和咖啡豆 #生活
- 周三前跟张经理对齐合同发票报销
- 下个月准备报考PMP项目管理证书`;
      setInputText(sample);
      processSplit(sample);
    }
  };

  if (!isOpen) return null;

  const selectedCount = parsedItems.filter(i => i.selected).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative w-full max-w-2xl acrylic-panel rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-subtle)] flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--chip-bg)]/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)]">
                <ListPlus className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[var(--text-main)]">
                    Cherry 批量待办录入与智能拆分
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-sub)]">
                    AI 语义解析
                  </span>
                </div>
                <p className="text-xs text-[var(--text-sub)] mt-0.5">
                  粘贴会议纪要、聊天记录或清单，Cherry 自动按换行与序号智能拆分为独立任务并检测重复
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-main)] px-5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveStep('input')}
              className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeStep === 'input'
                  ? 'border-[var(--accent-fg)] text-[var(--text-main)] font-semibold'
                  : 'border-transparent text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>1. 文本输入区</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (inputText.trim()) {
                  processSplit(inputText);
                }
              }}
              disabled={!inputText.trim()}
              className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                activeStep === 'review'
                  ? 'border-[var(--accent-fg)] text-[var(--text-main)] font-semibold'
                  : 'border-transparent text-[var(--text-sub)] hover:text-[var(--text-main)] disabled:opacity-40'
              }`}
            >
              <span>2. 智能拆分确认 ({parsedItems.length})</span>
              {parsedItems.some(i => i.duplicateInfo) && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="检测到疑似重复项" />
              )}
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 flex-1 overflow-y-auto min-h-[300px]">
            {activeStep === 'input' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-[var(--text-sub)]">
                  <span>支持多行文本、序号 (1. / 1、)、符号清单 (- / *)、分号分隔：</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--text-faint)]">载入示例:</span>
                    <button
                      type="button"
                      onClick={() => loadSampleText('meeting')}
                      className="text-[11px] text-[var(--accent-fg)] hover:underline"
                    >
                      会议纪要
                    </button>
                    <span className="text-[var(--text-faint)]">|</span>
                    <button
                      type="button"
                      onClick={() => loadSampleText('daily')}
                      className="text-[11px] text-[var(--accent-fg)] hover:underline"
                    >
                      日常待办
                    </button>
                  </div>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`在此粘贴一大堆内容，例如：\n1. 明天下午3点开会讨论新架构 #工作\n2. 周四前提交财年预算申报 #财务\n3. 周五体检 #健康\n- 另外记得买牛奶和咖啡`}
                  rows={9}
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-subtle)] focus:border-[var(--accent-fg)] rounded-xl p-3.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none resize-none font-mono leading-relaxed transition-colors shadow-inner"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[var(--text-faint)]">
                    {inputText.trim() ? `已输入 ${inputText.trim().split(/\r?\n/).length} 行文本` : '等待输入待办内容...'}
                  </span>
                  <button
                    type="button"
                    onClick={() => processSplit(inputText)}
                    disabled={!inputText.trim() || isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)] font-medium text-xs hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cherry 智能拆分 ({splitTasksWithJev(inputText).length} 项)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Control bar */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] text-xs text-[var(--text-sub)]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(selectedCount < parsedItems.length)}
                      className="flex items-center gap-1.5 hover:text-[var(--text-main)] transition-colors"
                    >
                      {selectedCount === parsedItems.length ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent-fg)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-faint)]" />
                      )}
                      <span>全选 / 反选 ({selectedCount}/{parsedItems.length})</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveStep('input')}
                    className="flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>返回修改原文</span>
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-2.5">
                  {parsedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        item.selected
                          ? item.duplicateInfo
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-[var(--chip-border)] bg-[var(--chip-bg)]'
                          : 'border-transparent bg-[var(--bg-main)] opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item.id)}
                          className="mt-1 text-[var(--text-faint)] hover:text-[var(--accent-fg)] shrink-0 transition-colors"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--accent-fg)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Title input */}
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItemTitle(item.id, e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-[var(--text-main)] outline-none border-b border-transparent focus:border-[var(--border-subtle)] pb-0.5"
                          />

                          {/* Classification & Metadata row */}
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            {/* Category Selector */}
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateItemCategory(item.id, e.target.value as TaskCategory)}
                              className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[var(--text-sub)] outline-none cursor-pointer"
                            >
                              <option value="即刻完成">即刻完成</option>
                              <option value="近期完成">近期完成</option>
                              <option value="规划待办">规划待办</option>
                            </select>

                            {/* Priority Selector */}
                            <select
                              value={item.priority}
                              onChange={(e) => handleUpdateItemPriority(item.id, e.target.value as TaskPriority)}
                              className="bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[var(--text-sub)] font-mono outline-none cursor-pointer"
                            >
                              <option value="P0">P0 (紧急)</option>
                              <option value="P1">P1 (重要)</option>
                              <option value="P2">P2 (常规)</option>
                              <option value="P3">P3 (长期)</option>
                            </select>

                            {/* Extracted Due Date */}
                            {item.dueDate && (
                              <span className="inline-flex items-center gap-1 text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                                <Clock className="w-2.5 h-2.5" />
                                {item.dueDate}
                              </span>
                            )}

                            {/* Tags */}
                            {item.tags.map(t => (
                              <span key={t} className="text-[var(--tag-text)]">
                                #{t}
                              </span>
                            ))}
                          </div>

                          {/* Duplicate Detection Alert & Decision Switcher */}
                          {item.duplicateInfo && (
                            <div className="mt-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs space-y-1.5">
                              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Cherry 识别到与已有待办「{item.duplicateInfo.matchedTask.title}」重复 (相似度 {Math.round(item.duplicateInfo.similarity * 100)}%)
                                </span>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[11px] text-[var(--text-faint)]">处理方案:</span>
                                <button
                                  type="button"
                                  onClick={() => handleSetDupAction(item.id, 'append_to_existing')}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                    item.duplicateInfo.action === 'append_to_existing'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-[var(--bg-main)] text-[var(--text-sub)] border border-[var(--border-subtle)] hover:bg-[var(--chip-hover)]'
                                  }`}
                                >
                                  补充信息到原任务
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetDupAction(item.id, 'ignore')}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                    item.duplicateInfo.action === 'ignore'
                                      ? 'bg-rose-500 text-white shadow-sm'
                                      : 'bg-[var(--bg-main)] text-[var(--text-sub)] border border-[var(--border-subtle)] hover:bg-[var(--chip-hover)]'
                                  }`}
                                >
                                  忽略放弃
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetDupAction(item.id, 'add_new')}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                                    item.duplicateInfo.action === 'add_new'
                                      ? 'bg-emerald-500 text-white shadow-sm'
                                      : 'bg-[var(--bg-main)] text-[var(--text-sub)] border border-[var(--border-subtle)] hover:bg-[var(--chip-hover)]'
                                  }`}
                                >
                                  仍独立创建
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded text-[var(--text-faint)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors mt-0.5"
                          title="移除此项"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--chip-bg)]/40 flex items-center justify-between">
            <span className="text-xs text-[var(--text-sub)]">
              {activeStep === 'review'
                ? `准备录入 ${selectedCount} 项待办`
                : '点击拆分按钮即可预览分类判定与去重状态'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] transition-colors"
              >
                取消
              </button>

              {activeStep === 'review' ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)] font-medium text-xs hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all shadow-sm"
                >
                  <Check className="w-4 h-4 stroke-[2.4]" />
                  <span>确认添加 ({selectedCount} 项)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => processSplit(inputText)}
                  disabled={!inputText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-fg)] font-medium text-xs hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>下一步：智能拆分预览</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
