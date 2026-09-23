import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Key, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Palette, 
  Check, 
  Cloud, 
  Database,
  HardDrive,
  Layers
} from 'lucide-react';
import { AppSettings, AppTheme } from '../types';
import { AuthUser } from '../utils/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  isCloudConfigured?: boolean;
  onTriggerCloudSync?: () => Promise<void>;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  isCloudConfigured = false,
  onTriggerCloudSync,
  currentUser,
  onOpenAuth
}) => {
  const [apiKey, setApiKey] = useState(settings.jevApiKey || '');
  const [endpoint, setEndpoint] = useState(settings.jevEndpoint || 'https://ai-gateway.vercel.sh/typesafe/v1/systemone');
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(settings.theme || 'obsidian');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const themesList: { id: AppTheme; name: string; desc: string; bg: string; border: string; accent: string }[] = [
    {
      id: 'obsidian',
      name: '深邃墨黑',
      desc: '沉稳炭黑，消除光污染，统一单色质感',
      bg: '#0c0e12',
      border: 'rgba(255,255,255,0.15)',
      accent: '#f3f4f6'
    },
    {
      id: 'paper',
      name: '极简明眸白',
      desc: '素雅纸白，极简无眩光，现代出版物风格',
      bg: '#f5f6f9',
      border: 'rgba(0,0,0,0.12)',
      accent: '#111827'
    },
    {
      id: 'sand',
      name: '暖杏素纸',
      desc: '温润护眼暖木色，长久沉浸不疲劳',
      bg: '#f6f4ee',
      border: 'rgba(0,0,0,0.1)',
      accent: '#33271a'
    },
    {
      id: 'mist',
      name: '柔雾月灰',
      desc: '静谧石板冷灰，工业工作室设计调性',
      bg: '#edf1f5',
      border: 'rgba(0,0,0,0.1)',
      accent: '#1e293b'
    }
  ];

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

      if (data.source === 'vercel-ai-gateway-jev') {
        setTestStatus('success');
        setTestMessage(`通信正常！Jev 智能决策响应正常: [${data.category}] 优先级: ${data.priority}`);
      } else {
        setTestStatus('success');
        setTestMessage(`智能决策引擎运行正常: [${data.category}] 优先级: ${data.priority}`);
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
      theme: selectedTheme
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="acrylic-panel w-full max-w-lg rounded-2xl p-5 border border-[var(--border-medium)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)]">
              <Cpu className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                偏好设置 & 云端服务
              </h3>
              <p className="text-[11px] text-[var(--text-faint)]">
                界面主题、智能引擎设置与数据同步状态
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-5 pr-1 text-xs">
          {/* Section 1: Theme Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
              <Palette className="w-3.5 h-3.5 text-[var(--text-sub)]" />
              <span>界面主题风格</span>
            </div>
            <p className="text-[11px] text-[var(--text-faint)]">
              提供从沉稳暗黑到明眸素白的淡雅调色板，完全统一视觉语言
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {themesList.map((t) => {
                const isSelected = selectedTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTheme(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--text-main)] ring-1 ring-[var(--text-main)] shadow-sm'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border-medium)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border shadow-inner shrink-0"
                          style={{ backgroundColor: t.bg, borderColor: t.border }}
                        />
                        <span className="font-medium text-xs text-[var(--text-main)]">{t.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--text-main)] shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                      {t.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Data Persistence & Cloud Sync */}
          <div className="border-t border-[var(--border-subtle)] pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-main)]">
                <Database className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                <span>数据存储与多端同步</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--chip-bg)] border border-[var(--chip-border)] text-[var(--text-sub)]">
                安全加密
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCloudConfigured ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                  <span className="font-medium text-[var(--text-main)]">
                    {isCloudConfigured ? '云端实时同步已连接' : '本地私密离线模式'}
                  </span>
                </div>
                {isCloudConfigured && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="text-[11px] px-2 py-0.5 rounded bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>立即同步</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                {isCloudConfigured
                  ? '系统已连接专属云端空间，您的待办项在多台电脑、手机或桌面小组件间全自动实时同步。'
                  : '当前待办事项安全保存在当前设备的本地浏览器中。登录个人账号后，即可激活多设备全自动实时同步。'}
              </p>

              <div className="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-faint)]">
                  {currentUser ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      当前账号: {currentUser.username} (专属数据加密保护中)
                    </span>
                  ) : (
                    <span>未登录账号 (数据保存在当前浏览器)</span>
                  )}
                </span>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="text-[11px] text-[var(--text-main)] hover:underline font-medium"
                  >
                    {currentUser ? '管理账号 / 退出' : '登录或注册'}
                  </button>
                )}
              </div>

              {syncMessage && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {syncMessage}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Jev Model Configuration */}
          <div className="border-t border-[var(--border-subtle)] pt-3.5 space-y-3">
            <div className="p-3 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text-main)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                  关于 Jev 智能引擎
                </span>
                <span className="text-[10px] text-[var(--text-sub)]">
                  开箱即用
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                Jev 智能决策引擎能够瞬间理解自然语言中的时间要素、重要程度与任务意图，全自动规整归类待办，精准且无幻觉。
              </p>
            </div>

            {/* Custom API Key Input (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-[var(--text-main)] font-medium">
                自定义 Jev 服务密钥 (可选)
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="留空即使用内置默认智能服务"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg pl-3 pr-9 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent-bg)] font-mono text-xs"
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
                * 默认已启用内置高性能智能引擎，无需任何配置即可畅享完整体验。
              </p>
            </div>

            {/* Gateway Endpoint */}
            <div className="space-y-1.5">
              <label className="block text-[var(--text-main)] font-medium">
                智能服务端点地址 (可选)
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://ai-gateway.vercel.sh/typesafe/v1/systemone"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg px-3 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent-bg)] font-mono text-xs"
              />
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="w-full py-2 px-3 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-medium)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                {testStatus === 'testing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--text-sub)]" />
                    <span>正在测试连接...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                    <span>测试智能引擎连通性</span>
                  </>
                )}
              </button>

              {testStatus === 'success' && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-[11px] flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{testMessage}</span>
                </div>
              )}

              {testStatus === 'failed' && (
                <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 rounded-lg transition-all shadow-sm"
          >
            保存配置
          </button>
        </div>
      </motion.div>
    </div>
  );
};
