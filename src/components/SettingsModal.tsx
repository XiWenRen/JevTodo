import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Database,
  Clock,
  Volume2,
  KeyRound,
  ChevronRight,
  Activity,
  Sparkles
} from 'lucide-react';
import { AppSettings } from '../types';
import { AuthUser } from '../utils/auth';
import { playCherryCompletionChime } from './CherryClockModal';

type SettingsTab = 'ai' | 'clock' | 'sync';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  isCloudConfigured?: boolean;
  onTriggerCloudSync?: () => Promise<void>;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onOpenApiKeyUsage?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isCloudConfigured = false,
  onTriggerCloudSync,
  currentUser,
  onOpenAuth,
  onOpenApiKeyUsage
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [apiKey, setApiKey] = useState(settings.jevApiKey || '');
  const initialEndpoint = (!settings.jevEndpoint || settings.jevEndpoint.includes('ai-gateway.vercel.sh'))
    ? 'https://api.typesafe.ai/v1/systemone'
    : settings.jevEndpoint;
  const [endpoint, setEndpoint] = useState(initialEndpoint);
  const [cherryDuration, setCherryDuration] = useState<number>(settings.cherryDurationMinutes || 25);
  const [cherrySound, setCherrySound] = useState<boolean>(settings.cherrySoundEnabled ?? true);
  const [allowFallback, setAllowFallback] = useState<boolean>(settings.allowFallback ?? false);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasConfiguredKey = Boolean(
    (apiKey && apiKey.trim().length > 0) || 
    (settings.jevApiKey && settings.jevApiKey.trim().length > 0)
  );

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');

    try {
      const res = await fetch('/api/jev/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: '今天下午三点进行紧急线上故障排查评审 #运维',
          apiKey: apiKey.trim(),
          endpoint: endpoint.trim(),
          isTest: true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setTestStatus('failed');
        setTestMessage(data.error || `网关返回状态码: ${res.status}`);
        return;
      }

      if (data.source && data.source !== 'jev-calibrated-local') {
        setTestStatus('success');
        setTestMessage(`通信正常！TypeSafe Jev 模型响应成功: [${data.category}]`);
      } else {
        setTestStatus('success');
        setTestMessage(`智能决策引擎运行正常: [${data.category}]`);
      }
    } catch (e: any) {
      setTestStatus('failed');
      setTestMessage(`网络连接异常: ${e.message || '无法连接到服务'}`);
    }
  };

  const handleManualSync = async () => {
    if (!onTriggerCloudSync) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await onTriggerCloudSync();
      setSyncMessage('云端数据同步完成');
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (e) {
      setSyncMessage('同步失败，已保留本地缓存');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      jevApiKey: apiKey.trim(),
      jevEndpoint: endpoint.trim(),
      cherryDurationMinutes: cherryDuration,
      cherrySoundEnabled: cherrySound,
      allowFallback
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="acrylic-panel w-full max-w-lg rounded-2xl border border-[var(--border-medium)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-drawer)',
          color: 'var(--text-main)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--chip-bg)]/40">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)] flex items-center justify-center shadow-xs">
              <Cpu className="w-4 h-4 text-emerald-400" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                偏好设置 & 服务配置
              </h3>
              <p className="text-[11px] text-[var(--text-faint)]">
                智能引擎、专注时钟与多端数据同步
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-faint)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--chip-bg)] transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Segmented Control */}
        <div className="p-2 border-b border-[var(--border-subtle)] bg-[var(--chip-bg)]/20 shrink-0">
          <div className="flex items-center p-1 bg-[var(--bg-main)] rounded-xl border border-[var(--border-subtle)] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-[var(--chip-bg)] text-[var(--text-main)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>智能引擎与密钥</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clock')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'clock'
                  ? 'bg-[var(--chip-bg)] text-[var(--text-main)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>专注时钟</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'sync'
                  ? 'bg-[var(--chip-bg)] text-[var(--text-main)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>数据与同步</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: 智能引擎与服务密钥 */}
          {activeTab === 'ai' && (
            <div className="space-y-3.5">
              {/* Info Card */}
              <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-main)] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TypeSafe Jev 大模型智能引擎</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    System One 架构
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                  通过自然语言解析任务分类、重要程度、动态标签，并在安排时间时结合现有日程智能避开冲突时段。
                </p>
              </div>

              {/* Service API Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[var(--text-main)] font-medium flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                    <span>自定义 Jev 服务密钥 (API Key)</span>
                  </label>
                  <span className="text-[10px] text-[var(--text-faint)]">
                    可选配置
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="留空即使用内置默认智能服务"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl pl-3 pr-9 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-emerald-500/50 font-mono text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-main)]"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-faint)]">
                  * 默认已内置智能服务；输入您的专属 TypeSafe API Key 可享专属资源配额并激活调用审计。
                </p>
              </div>

              {/* API Key Usage & Audit Entry Button */}
              {hasConfiguredKey ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                        <span>Jev API 使用量与调用审计</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">已配置</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-sub)]">
                        实时查阅总调用量、今日调用、平均耗时与全量报文流水
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenApiKeyUsage?.();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium flex items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>查看用量</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] flex items-center justify-between text-[11px] text-[var(--text-sub)]">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
                    <span>输入个人 API Key 后，可在此实时查阅调用量统计与审计流水</span>
                  </span>
                </div>
              )}

              {/* Endpoint Address */}
              <div className="space-y-1.5">
                <label className="block text-[var(--text-main)] font-medium">
                  智能服务端点地址 (可选)
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://api.typesafe.ai/v1/systemone"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl px-3 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-emerald-500/50 font-mono text-xs transition-colors"
                />
              </div>

              {/* Fallback Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)]">
                <div className="space-y-0.5 pr-3">
                  <div className="text-xs font-medium text-[var(--text-main)] flex items-center gap-1.5">
                    <span>允许本地算法降级</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${allowFallback ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {allowFallback ? '已开启' : '已关闭 (严格Jev驱动)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-faint)] leading-normal">
                    默认关闭以确保所有分类、标签与时间推导 100% 由 Jev 远端大模型输出；仅在网络完全不可用时由本地规则兜底。
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={allowFallback}
                    onChange={(e) => setAllowFallback(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[var(--bg-main)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-[var(--border-subtle)]"></div>
                </label>
              </div>

              {/* Test Connection Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="w-full py-2 px-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-medium)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5 font-medium cursor-pointer"
                >
                  {testStatus === 'testing' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--text-sub)]" />
                      <span>正在测试连接...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      <span>测试智能引擎连通性</span>
                    </>
                  )}
                </button>

                {testStatus === 'success' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[11px] flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                    <span>{testMessage}</span>
                  </div>
                )}

                {testStatus === 'failed' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 专注时钟 */}
          {activeTab === 'clock' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
                    <span className="text-sm">🍒</span>
                    <span>樱桃时钟专注偏好</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                    沉浸专注
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-faint)] leading-relaxed">
                  为每个待办开启专属樱桃番茄钟，专注完成后将自动沉淀为该任务专属的樱桃记录。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-3">
                {/* Duration Setting */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-main)] font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-400" /> 单次专注时长
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {cherryDuration} 分钟
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[15, 20, 25, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCherryDuration(mins)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          cherryDuration === mins
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-[var(--bg-main)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={cherryDuration}
                        onChange={(e) => setCherryDuration(Math.max(1, Math.min(180, parseInt(e.target.value) || 25)))}
                        className="w-14 px-1.5 py-0.5 text-xs text-center rounded-lg bg-[var(--bg-main)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono outline-none"
                      />
                      <span className="text-[11px] text-[var(--text-faint)]">分钟</span>
                    </div>
                  </div>
                </div>

                {/* Sound Setting */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border-subtle)]/60">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                    <div>
                      <div className="text-xs font-medium text-[var(--text-main)]">到期提示铃音</div>
                      <div className="text-[10px] text-[var(--text-faint)]">倒计时归零时自动播放清脆完成提示铃音</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playCherryCompletionChime()}
                      className="px-2 py-0.5 text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-colors cursor-pointer"
                    >
                      试听铃音
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cherrySound}
                        onChange={(e) => setCherrySound(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-[var(--border-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 数据与多端同步 */}
          {activeTab === 'sync' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isCloudConfigured ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                    <span className="font-semibold text-[var(--text-main)]">
                      {isCloudConfigured ? '云端实时同步已连接' : '本地私密离线模式'}
                    </span>
                  </div>
                  {isCloudConfigured && (
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                      <span>立即同步</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                  {isCloudConfigured
                    ? '系统已连接专属云端空间，您的待办项在多台电脑、手机或桌面小组件间全自动实时同步。'
                    : '当前待办事项安全保存在当前设备的本地浏览器中。登录个人账号后，即可激活多设备全自动实时同步。'}
                </p>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-faint)]">
                    {currentUser ? (
                      <span className="text-emerald-500 font-medium">
                        当前账号: {currentUser.username} (专属数据加密中)
                      </span>
                    ) : (
                      <span>未登录账号 (数据保存在本地浏览器)</span>
                    )}
                  </span>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline font-medium cursor-pointer"
                    >
                      {currentUser ? '管理账号 / 退出' : '登录或注册'}
                    </button>
                  )}
                </div>

                {syncMessage && (
                  <div className="text-[10px] text-emerald-500 font-medium">
                    {syncMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--chip-bg)]/30 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] rounded-lg transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            保存配置
          </button>
        </div>
      </motion.div>
    </div>
  );
};
