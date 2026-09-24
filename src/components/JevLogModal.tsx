import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronRight, 
  Zap, 
  Send, 
  ShieldCheck, 
  AlertCircle,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { JevInteractionLog, getJevInteractionLogs, clearJevInteractionLogs } from '../utils/jevLog';

interface JevLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
}

export const JevLogModal: React.FC<JevLogModalProps> = ({
  isOpen,
  onClose,
  apiKey
}) => {
  const [logs, setLogs] = useState<JevInteractionLog[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  // Load and subscribe to real-time log updates
  useEffect(() => {
    if (isOpen) {
      setLogs(getJevInteractionLogs());
    }

    const handleUpdate = () => {
      setLogs(getJevInteractionLogs());
    };

    window.addEventListener('jev-log-updated', handleUpdate);
    return () => {
      window.removeEventListener('jev-log-updated', handleUpdate);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('确定要清空所有 Jev 交互日志吗？')) {
      clearJevInteractionLogs();
      setLogs([]);
    }
  };

  const handleCopyJson = (data: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
    setIsCopiedAll(true);
    setTimeout(() => setIsCopiedAll(false), 2000);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border-medium)] shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-main)'
        }}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--chip-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 text-[var(--cherry-red)] flex items-center justify-center border border-rose-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Jev AI 模型交互日志</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--chip-hover)] text-[var(--text-sub)] font-mono border border-[var(--chip-border)]">
                  {logs.length} 条记录
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-faint)]">
                记录 1s 实时预测与任务创建时与 Jev 模型往返的完整交互报文
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-faint)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="px-4 py-2 bg-[var(--bg-sub)] border-b border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[var(--text-sub)] truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-mono text-[11px] truncate">
              Key: {apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-6)}` : '本地环境变量已配置'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {logs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="px-2.5 py-1 rounded-lg bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)] flex items-center gap-1 text-[11px] transition-colors"
                  title="复制全部日志为 JSON"
                >
                  {isCopiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopiedAll ? '已复制全部' : '导出全部 JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded-lg hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 text-[11px] transition-colors"
                  title="清空当前日志"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>清空</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Logs List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-faint)] space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-[var(--text-faint)] opacity-40 animate-pulse" />
              <div className="text-sm font-medium">暂无 Jev 交互记录</div>
              <p className="text-xs text-[var(--text-sub)] max-w-sm mx-auto">
                在底部输入框输入任务（例如：<span className="font-mono text-emerald-400">今天下午3点和中台完成同步</span>），停顿 1 秒后将自动调用 Jev 模型并在此生成详细报文。
              </p>
            </div>
          ) : (
            logs.map(log => {
              const isExpanded = expandedId === log.id;
              const isRemote = log.source === 'vercel-ai-gateway-jev';
              const isPreview = log.triggerType === 'preview';

              return (
                <div 
                  key={log.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--chip-bg)] overflow-hidden transition-all duration-200"
                >
                  {/* Card Header & Summary */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="p-3 cursor-pointer hover:bg-[var(--chip-hover)] flex flex-col gap-2 transition-colors select-none"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Time */}
                        <span className="font-mono text-[var(--text-faint)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(log.timestamp)}
                        </span>

                        {/* Trigger Type */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                          isPreview 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {isPreview ? <Zap className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
                          {isPreview ? '1s 实时预测' : '任务正式创建'}
                        </span>

                        {/* Engine Mode */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          isRemote 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                        }`}>
                          {isRemote ? '云端网关 Jev' : '本地校准引擎'}
                        </span>

                        {/* Duration */}
                        <span className="font-mono text-[10px] text-[var(--text-faint)]">
                          {log.durationMs}ms
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[var(--text-faint)]">
                        <span className="text-[10px]">{isExpanded ? '折叠详情' : '展开报文'}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    {/* Input Text Title */}
                    <div className="font-medium text-xs sm:text-sm text-[var(--text-main)] flex items-center gap-1.5">
                      <span className="text-[var(--cherry-red)] font-mono text-[11px]">输入:</span>
                      <span className="truncate">"{log.inputText}"</span>
                    </div>

                    {/* Result Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)]">
                        分类: <strong className="text-emerald-400">{log.category}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--chip-border)]">
                        紧迫度: <strong className="text-amber-400">{log.urgencyScore}</strong>
                      </span>
                      {log.tags && log.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {log.tags.map(t => (
                            <span key={t} className="text-[var(--tag-text)] text-[10px]">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Accordion: Full Request & Response Payloads */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-[var(--border-subtle)] bg-[var(--bg-app)] p-3 space-y-3 text-xs"
                      >
                        {/* Error info if present */}
                        {log.errorMessage && (
                          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
                            <div>
                              <div className="font-medium">远端提示 / 降级信息:</div>
                              <div className="font-mono text-[10px] break-all">{log.errorMessage}</div>
                            </div>
                          </div>
                        )}

                        {/* Request Payload */}
                        {log.requestPayload && (
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-faint)] mb-1">
                              <span className="flex items-center gap-1">
                                <FileCode className="w-3 h-3 text-amber-400" />
                                <span>请求 Payload (POST {log.endpoint}):</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyJson(log.requestPayload, `${log.id}-req`);
                                }}
                                className="hover:text-[var(--text-main)] flex items-center gap-0.5 text-[10px]"
                              >
                                {copiedId === `${log.id}-req` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                <span>{copiedId === `${log.id}-req` ? '已复制' : '复制'}</span>
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-black/40 border border-[var(--border-subtle)] font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-48 leading-relaxed">
                              {JSON.stringify(log.requestPayload, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Response Data */}
                        {log.responseData && (
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-faint)] mb-1">
                              <span className="flex items-center gap-1">
                                <FileCode className="w-3 h-3 text-emerald-400" />
                                <span>响应 Response ({log.statusCode || 200} OK):</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyJson(log.responseData, `${log.id}-res`);
                                }}
                                className="hover:text-[var(--text-main)] flex items-center gap-0.5 text-[10px]"
                              >
                                {copiedId === `${log.id}-res` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                <span>{copiedId === `${log.id}-res` ? '已复制' : '复制'}</span>
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-black/40 border border-[var(--border-subtle)] font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-48 leading-relaxed">
                              {JSON.stringify(log.responseData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--chip-bg)] flex items-center justify-between text-xs text-[var(--text-faint)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>实时监听 Jev 决策交互中</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[var(--chip-hover)] text-[var(--text-main)] hover:bg-[var(--chip-border)] transition-colors text-xs"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
};
