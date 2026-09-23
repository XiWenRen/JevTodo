import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Trash2, 
  Clock, 
  AlertTriangle, 
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

  const processSplit = (text: string) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);

    try {
      const splitStrings = splitTasksWithJev(text);
      const items: BatchParsedTask[] = splitStrings.map((str, index) => {
        const { dueDate, dueDateIso, dueTimestamp, cleanTitle } = extractDateTime(str);
        const { tags } = extractFlomoTags(cleanTitle);

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
            action: 'append_to_existing'
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
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const handleUpdateItemTitle = (id: string, newTitle: string) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
  };

  const handleUpdateItemCategory = (id: string, newCategory: TaskCategory) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, category: newCategory } : item));
  };

  const handleUpdateItemPriority = (id: string, newPriority: TaskPriority) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, priority: newPriority } : item));
  };

  const handleDeleteItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSetDupAction = (id: string, action: 'add_new' | 'append_to_existing' | 'ignore') => {
    setParsedItems(prev => prev.map(item => {
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
    }));
  };

  const handleConfirm = () => {
    const tasksToAdd: BatchParsedTask[] = [];
    const tasksToAppend: Array<{ matchedTask: ITaskItem; supplementalText: string; tags?: string[]; dueDate?: string }> = [];

    parsedItems.filter(i => i.selected).forEach(item => {
      if (item.duplicateInfo) {
        if (item.duplicateInfo.action === 'append_to_existing') {
          tasksToAppend.push({
            matchedTask: item.duplicateInfo.matchedTask,
            supplementalText: item.title,
            tags: item.tags,
            dueDate: item.dueDate
          });
        } else if (item.duplicateInfo.action === 'add_new') {
          tasksToAdd.push(item);
        }
      } else {
        tasksToAdd.push(item);
      }
    });

    onConfirmBatch(tasksToAdd, tasksToAppend);
    onClose();
  };

  const loadSampleText = (type: 'meeting' | 'daily') => {
    if (type === 'meeting') {
      const sample = `1. 今天下午排查服务告警 #运维 P0\n2. 明天上午方案评审 #研发\n3. 周四提交预算 #财务\n4. 调研分布式数据库 #规划`;
      setInputText(sample);
      processSplit(sample);
    } else {
      const sample = `- 下午去医院拿体检报告 #健康\n- 晚上买牛奶 #生活\n- 周三报销发票`;
      setInputText(sample);
      processSplit(sample);
    }
  };

  if (!isOpen) return null;

  const selectedCount = parsedItems.filter(i => i.selected).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[var(--border-medium)] flex flex-col max-h-[85vh] bg-[var(--bg-panel)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-main)]">批量录入</h3>
              <div className="flex items-center bg-[var(--chip-bg)] p-0.5 rounded-lg border border-[var(--chip-border)]">
                <button
                  type="button"
                  onClick={() => setActiveStep('input')}
                  className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                    activeStep === 'input' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold' : 'text-[var(--text-faint)]'
                  }`}
                >
                  文本
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (inputText.trim()) processSplit(inputText);
                  }}
                  disabled={!inputText.trim()}
                  className={`px-2 py-0.5 rounded text-xs whitespace-nowrap disabled:opacity-40 ${
                    activeStep === 'review' ? 'bg-[var(--chip-hover)] text-[var(--text-main)] font-semibold' : 'text-[var(--text-faint)]'
                  }`}
                >
                  列表 ({parsedItems.length})
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 flex-1 overflow-y-auto min-h-[220px]">
            {activeStep === 'input' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-faint)]">
                  <span>每行一项，支持 #标签 与序号：</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadSampleText('meeting')}
                      className="text-blue-400 hover:underline"
                    >
                      会议示例
                    </button>
                    <span>/</span>
                    <button
                      type="button"
                      onClick={() => loadSampleText('daily')}
                      className="text-blue-400 hover:underline"
                    >
                      日常示例
                    </button>
                  </div>
                </div>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`每行一个任务，例如：\n明天下午3点开会 #工作\n周四提交预算申报 #财务\n- 晚上记得买牛奶`}
                  rows={8}
                  className="w-full bg-[var(--chip-bg)] border border-[var(--border-subtle)] focus:border-[var(--border-medium)] rounded-xl p-2.5 text-xs text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none resize-none font-mono leading-relaxed"
                />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Control bar */}
                <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)] text-xs text-[var(--text-sub)]">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(selectedCount < parsedItems.length)}
                    className="flex items-center gap-1.5 hover:text-[var(--text-main)]"
                  >
                    {selectedCount === parsedItems.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-[var(--text-faint)]" />
                    )}
                    <span>全选 ({selectedCount}/{parsedItems.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStep('input')}
                    className="flex items-center gap-1 text-[var(--text-faint)] hover:text-[var(--text-main)]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重改文本</span>
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-1.5">
                  {parsedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border text-xs transition-colors ${
                        item.selected
                          ? item.duplicateInfo
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-[var(--chip-border)] bg-[var(--chip-bg)]'
                          : 'border-transparent opacity-40 bg-[var(--chip-bg)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleItem(item.id)}
                          className="text-[var(--text-faint)] hover:text-[var(--text-main)] shrink-0"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItemTitle(item.id, e.target.value)}
                          className="flex-1 min-w-0 bg-transparent text-xs text-[var(--text-main)] outline-none"
                        />

                        {/* Category */}
                        <select
                          value={item.category}
                          onChange={(e) => handleUpdateItemCategory(item.id, e.target.value as TaskCategory)}
                          className="bg-[var(--chip-bg)] border border-[var(--chip-border)] rounded px-1 py-0.5 text-[10px] text-[var(--text-sub)] outline-none shrink-0"
                        >
                          <option value="即刻完成">即刻</option>
                          <option value="近期完成">近期</option>
                          <option value="规划待办">规划</option>
                        </select>

                        {/* Priority */}
                        <select
                          value={item.priority}
                          onChange={(e) => handleUpdateItemPriority(item.id, e.target.value as TaskPriority)}
                          className="bg-[var(--chip-bg)] border border-[var(--chip-border)] rounded px-1 py-0.5 text-[10px] font-mono text-[var(--text-sub)] outline-none shrink-0"
                        >
                          <option value="P0">P0</option>
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-[var(--text-faint)] hover:text-rose-400 shrink-0 p-0.5"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Duplicate resolution strip */}
                      {item.duplicateInfo && (
                        <div className="mt-1.5 pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between gap-1 text-[10px]">
                          <span className="text-amber-400 truncate flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            重复:「{item.duplicateInfo.matchedTask.title}」
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSetDupAction(item.id, 'append_to_existing')}
                              className={`px-1.5 py-0.2 rounded ${
                                item.duplicateInfo.action === 'append_to_existing'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-[var(--chip-bg)] text-[var(--text-sub)]'
                              }`}
                            >
                              追加
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDupAction(item.id, 'add_new')}
                              className={`px-1.5 py-0.2 rounded ${
                                item.duplicateInfo.action === 'add_new'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-[var(--chip-bg)] text-[var(--text-sub)]'
                              }`}
                            >
                              新建
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetDupAction(item.id, 'ignore')}
                              className={`px-1.5 py-0.2 rounded ${
                                item.duplicateInfo.action === 'ignore'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-[var(--chip-bg)] text-[var(--text-sub)]'
                              }`}
                            >
                              忽略
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-3.5 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-faint)]">
              {activeStep === 'review' ? `${selectedCount} 项待导入` : ''}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] whitespace-nowrap"
              >
                取消
              </button>

              {activeStep === 'review' ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                  className="px-3.5 py-1 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-fg)] font-medium text-xs hover:opacity-90 disabled:opacity-40 whitespace-nowrap flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>确定导入 ({selectedCount})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => processSplit(inputText)}
                  disabled={!inputText.trim()}
                  className="px-3.5 py-1 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-fg)] font-medium text-xs hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                >
                  智能拆分
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
