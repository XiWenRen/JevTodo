import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  X,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';

export interface JevLogRecord {
  id: string;
  timestamp: string;
  triggerType: string;
  status: string;
  durationMs: number;
  inputText: string;
  gateway: string;
  apiKeyMasked: string;
  payload?: any;
  result?: any;
  error?: string;
}

export interface JevUsageStats {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  todayCalls: number;
  avgDurationMs: number;
  byTriggerType: Record<string, number>;
  keysSummary: Record<string, number>;
}

interface JevApiKeyUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey?: string;
}

export const JevApiKeyUsageModal: React.FC<JevApiKeyUsageModalProps> = ({
  isOpen,
  onClose,
  currentApiKey
}) => {
  const [stats, setStats] = useState<JevUsageStats | null>(null);
  const [records, setRecords] = useState<JevLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onlyCurrentKey, setOnlyCurrentKey] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const maskedCurrentKey = useMemo(() => {
    if (!currentApiKey || currentApiKey.trim().length === 0) return '(未配置)';
    const trimmed = currentApiKey.trim();
    if (trimmed.length <= 12) return `${trimmed.slice(0, 4)}... (长${trimmed.length})`;
    return `${trimmed.slice(0, 10)}...${trimmed.slice(-6)} (长${trimmed.length})`;
  }, [currentApiKey]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = new URL('/api/jev/logs', window.location.origin);
      url.searchParams.set('format', 'json');
      if (onlyCurrentKey && currentApiKey && currentApiKey.trim().length > 0) {
        url.searchParams.set('key', currentApiKey.trim());
      }
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        throw new Error(`获取日志失败 (HTTP ${res.status})`);
      }
      const data = await res.json();
      setStats(data.stats || null);
      setRecords(data.records || []);
    } catch (e: any) {
      setErrorMsg(e?.message || '无法获取 Jev 调用日志');
    } finally {
      setIsLoading(false);
    }
  }, [onlyCurrentKey, currentApiKey]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const handleClear = async () => {
    if (!window.confirm('确定要清空 Jev 服务的运行日志吗？该操作将重置调用历史。')) return;
    try {
      setIsLoading(true);
      await fetch('/api/jev/logs?clear=true');
      await fetchLogs();
    } catch (err: any) {
      setErrorMsg('清空日志失败: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!records.length) return;
    const blob = new Blob([JSON.stringify({ stats, records }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jev_usage_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Filter type
      if (filterType !== 'all') {
        if (filterType === 'error') {
          const isError = !r.status.includes('200') && !r.status.includes('OK');
          if (!isError) return false;
        } else if (r.triggerType !== filterType) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inInput = r.inputText?.toLowerCase().includes(q);
        const inStatus = r.status?.toLowerCase().includes(q);
        const inKey = r.apiKeyMasked?.toLowerCase().includes(q);
        const inResult = JSON.stringify(r.result || '').toLowerCase().includes(q);
        if (!inInput && !inStatus && !inKey && !inResult) return false;
      }

      return true;
    });
  }, [records, filterType, searchQuery]);

  if (!isOpen) return null;

  const successRate = stats && stats.totalCalls > 0
    ? Math.round((stats.successCalls / stats.totalCalls) * 100)
    : 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5">
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
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-2xl rounded-2xl border border-[var(--border-medium)] flex flex-col max-h-[88vh] overflow-hidden shadow-2xl z-10"
          style={{
            backgroundColor: 'var(--bg-drawer)',
            color: 'var(--text-main)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--chip-bg)]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    Jev API 使用量与调用审计
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    已绑定用户 Key
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-sub)]">
                  TypeSafe System One 大模型实时分析调用详情与耗时统计
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={isLoading}
                className="p-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors text-xs flex items-center gap-1 disabled:opacity-50"
                title="刷新日志"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="text-[11px] hidden sm:inline">刷新</span>
              </button>
              {records.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="p-1.5 rounded-lg hover:bg-[var(--chip-hover)] text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors text-xs flex items-center gap-1"
                    title="导出为 JSON 格式"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">导出</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-faint)] hover:text-rose-400 transition-colors text-xs flex items-center gap-1"
                    title="清空日志"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden sm:inline">清空</span>
                  </button>
                </>
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

          {/* Current Key & Endpoint Bar */}
          <div className="px-4 py-2.5 bg-[var(--chip-bg)]/20 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-sub)]">当前使用密钥:</span>
              <code className="px-2 py-0.5 rounded bg-[var(--chip-bg)] text-[var(--text-main)] font-mono text-[11px] border border-[var(--border-subtle)]">
                {maskedCurrentKey}
              </code>
            </div>
            {currentApiKey && currentApiKey.trim().length > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[var(--text-sub)] select-none">
                <input
                  type="checkbox"
                  checked={onlyCurrentKey}
                  onChange={(e) => setOnlyCurrentKey(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] text-emerald-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-emerald-500"
                />
                <span>仅筛选当前 API Key 的调用记录</span>
              </label>
            )}
          </div>

          {/* Stats Overview 4-Card Grid */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 border-b border-[var(--border-subtle)]">
            {/* Total Calls */}
            <div className="p-2.5 rounded-xl bg-[var(--chip-bg)]/30 border border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                <span>总调用量</span>
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-[var(--text-main)]">
                  {stats?.totalCalls ?? 0}
                </span>
                <span className="text-[10px] text-[var(--text-faint)]">次</span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-400 font-medium">
                成功率 {successRate}%
              </div>
            </div>

            {/* Today Calls */}
            <div className="p-2.5 rounded-xl bg-[var(--chip-bg)]/30 border border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                <span>今日调用</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-[var(--text-main)]">
                  {stats?.todayCalls ?? 0}
                </span>
                <span className="text-[10px] text-[var(--text-faint)]">次</span>
              </div>
              <div className="mt-1 text-[10px] text-[var(--text-sub)]">
                近 24 小时活跃
              </div>
            </div>

            {/* Avg Latency */}
            <div className="p-2.5 rounded-xl bg-[var(--chip-bg)]/30 border border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                <span>平均响应耗时</span>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-[var(--text-main)]">
                  {stats?.avgDurationMs ?? 0}
                </span>
                <span className="text-[10px] text-[var(--text-faint)]">ms</span>
              </div>
              <div className="mt-1 text-[10px] text-[var(--text-sub)]">
                高速推理端点
              </div>
            </div>

            {/* Success vs Error */}
            <div className="p-2.5 rounded-xl bg-[var(--chip-bg)]/30 border border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                <span>成功 / 异常</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base font-bold font-mono text-emerald-400">
                  {stats?.successCalls ?? 0}
                </span>
                <span className="text-xs font-mono text-[var(--text-faint)]">/</span>
                <span className="text-base font-bold font-mono text-rose-400">
                  {stats?.failedCalls ?? 0}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-[var(--text-sub)]">
                {stats?.failedCalls ? '存在未成功请求' : '全部正常执行'}
              </div>
            </div>
          </div>

          {/* Trigger Distribution & Filters */}
          <div className="p-3 border-b border-[var(--border-subtle)] space-y-2 shrink-0">
            {/* Filter Pills and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs select-none">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    filterType === 'all'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-[var(--text-sub)] hover:bg-[var(--chip-hover)]'
                  }`}
                >
                  全部 ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    filterType === 'preview'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-[var(--text-sub)] hover:bg-[var(--chip-hover)]'
                  }`}
                >
                  即时预测 ({stats?.byTriggerType['preview'] || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('create_task')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    filterType === 'create_task'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-[var(--text-sub)] hover:bg-[var(--chip-hover)]'
                  }`}
                >
                  任务创建 ({stats?.byTriggerType['create_task'] || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('daily_evolve')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    filterType === 'daily_evolve'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-[var(--text-sub)] hover:bg-[var(--chip-hover)]'
                  }`}
                >
                  日程演进 ({stats?.byTriggerType['daily_evolve'] || stats?.byTriggerType['manual'] || 0})
                </button>
                {stats && stats.failedCalls > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('error')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      filterType === 'error'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'text-rose-400/80 hover:bg-rose-500/10'
                    }`}
                  >
                    异常 ({stats.failedCalls})
                  </button>
                )}
              </div>

              {/* Search box */}
              <div className="relative min-w-[140px] sm:w-48">
                <Search className="w-3.5 h-3.5 text-[var(--text-faint)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索任务/状态..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-[var(--text-main)] placeholder-[var(--text-faint)] focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Record List */}
          <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[220px]">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-faint)] space-y-2">
                <KeyRound className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
                <p>暂无符合条件的 Jev 调用记录</p>
                <p className="text-[11px] text-[var(--text-sub)]">
                  当您在输入框输入任务、创建待办或跨日自动流转时，Jev AI 的详细调用日志将在此呈现。
                </p>
              </div>
            ) : (
              filteredRecords.map((item) => {
                const isExpanded = expandedId === item.id;
                const isSuccess = item.status.includes('200') || item.status.includes('OK');
                const result = item.result;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--chip-bg)]/20 hover:bg-[var(--chip-bg)]/40 transition-colors text-xs space-y-2"
                  >
                    {/* Top Row: Timestamp, Trigger badge, Status badge, Latency */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Trigger Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            item.triggerType === 'preview'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : item.triggerType === 'create_task'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : item.triggerType === 'daily_evolve' || item.triggerType === 'manual'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {item.triggerType === 'preview'
                            ? '实时预判'
                            : item.triggerType === 'create_task'
                            ? '创建评估'
                            : item.triggerType === 'daily_evolve' || item.triggerType === 'manual'
                            ? '日程流转'
                            : item.triggerType}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {item.status}
                        </span>

                        {/* Latency */}
                        <span className="text-[10px] text-[var(--text-faint)] font-mono flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-yellow-400" />
                          {item.durationMs}ms
                        </span>
                      </div>

                      {/* Time */}
                      <span className="text-[11px] text-[var(--text-faint)] font-mono">
                        {item.timestamp?.slice(11, 19) || item.timestamp}
                      </span>
                    </div>

                    {/* Middle Row: Input content */}
                    <div className="text-[var(--text-main)] font-medium leading-relaxed bg-[var(--chip-bg)]/40 p-2 rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[var(--text-sub)] select-none">输入内容: </span>
                      <span>"{item.inputText}"</span>
                    </div>

                    {/* Decision Snapshot Pills (if available) */}
                    {result && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {result.category && (
                          <span className="px-2 py-0.5 rounded bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--border-subtle)]">
                            分类: <strong className="text-emerald-400">{result.category}</strong>
                          </span>
                        )}
                        {Array.isArray(result.matter_tags) && result.matter_tags.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-[var(--chip-bg)] text-[var(--text-sub)] border border-[var(--border-subtle)]">
                            标签: <span className="text-sky-400">{result.matter_tags.join(', ')}</span>
                          </span>
                        )}
                        {(result.time_scope || result.dueDate) && (
                          <span className="px-2 py-0.5 rounded bg-[var(--chip-bg)] text-[var(--text-sub)] border border-[var(--border-subtle)] flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3 text-purple-400" />
                            <span>{result.dueDate || result.time_scope}</span>
                          </span>
                        )}
                        {result.conflictAvoided && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                            ⚡ 自动避障排期
                          </span>
                        )}
                        {typeof result.urgencyScore === 'number' && (
                          <span className="px-2 py-0.5 rounded bg-[var(--chip-bg)] text-[var(--text-sub)] border border-[var(--border-subtle)]">
                            紧迫度: <span className="font-mono text-amber-400">{(result.urgencyScore * 100).toFixed(0)}%</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Error message (if any) */}
                    {item.error && (
                      <div className="text-rose-400 text-[11px] bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                        错误: {item.error}
                      </div>
                    )}

                    {/* Footer: Expand button for technical audit */}
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-faint)]">
                      <span className="font-mono truncate max-w-[240px]">
                        Key: {item.apiKeyMasked}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-[var(--text-sub)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? '收起详情' : '展开调用报文'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Collapsible raw payload / result inspection */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                        {item.payload && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-sub)] mb-1">
                              <span>Jev 智能请求 Payload</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(`req-${item.id}`, JSON.stringify(item.payload, null, 2))}
                                className="hover:text-[var(--text-main)] flex items-center gap-0.5"
                              >
                                {copiedId === `req-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId === `req-${item.id}` ? '已复制' : '复制'}</span>
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-black/40 border border-[var(--border-subtle)] font-mono text-[10px] overflow-x-auto max-h-40 leading-relaxed text-[var(--text-sub)]">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </div>
                        )}

                        {item.result && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-sub)] mb-1">
                              <span>Jev 判定结果 Snapshot</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(`res-${item.id}`, JSON.stringify(item.result, null, 2))}
                                className="hover:text-[var(--text-main)] flex items-center gap-0.5"
                              >
                                {copiedId === `res-${item.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId === `res-${item.id}` ? '已复制' : '复制'}</span>
                              </button>
                            </div>
                            <pre className="p-2.5 rounded-lg bg-black/40 border border-[var(--border-subtle)] font-mono text-[10px] overflow-x-auto max-h-40 leading-relaxed text-emerald-400/90">
                              {JSON.stringify(item.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 bg-[var(--chip-bg)]/30 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-faint)]">
            <span>
              已展示 {filteredRecords.length} / {records.length} 条调用记录
            </span>
            <span className="font-mono text-[10px]">
              TypeSafe Jev · 安全本地/Serverless双模审计
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
