import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Command, Copy, Check, Terminal, Monitor, Laptop } from 'lucide-react';

interface ShortcutPluginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutPluginModal: React.FC<ShortcutPluginModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // 1. Windows PowerShell Quick Add Script
  const psScript = `# Windows 快捷录入脚本 (按 Win+Alt+T 快速弹出输入框)
Add-Type -AssemblyName Microsoft.VisualBasic
$task = [Microsoft.VisualBasic.Interaction]::InputBox("输入待办事项 (支持自然语言、时间与#标签):", "Jev 快速待办录入", "")
if ($task) {
  Start-Process "${currentUrl}?quickadd=" + [System.Uri]::EscapeDataString($task)
}`;

  // 2. Browser Bookmarklet
  const bookmarklet = `javascript:(function(){var t=prompt("Jev 待办录入 (支持#标签及时间):");if(t)window.open("${currentUrl}?quickadd="+encodeURIComponent(t),"_blank","width=400,height=680");})();`;

  // 3. Windows Desktop Widget Launch Command (Chrome / Edge App Mode)
  const appModeCommand = `msedge.exe --app="${currentUrl}" --window-size=380,680 --window-position=1500,200`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="acrylic-panel w-full max-w-lg rounded-2xl p-5 border border-[var(--border-medium)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)]">
              <Command className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                桌面快捷指令与小窗口插件
              </h3>
              <p className="text-[11px] text-[var(--text-faint)]">
                从桌面任意位置或浏览器无缝录入待办事项
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {/* Card 1: Windows 独立小组件窗口模式 */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-main)] flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                Windows 极简桌面小组件启动命令
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(appModeCommand, 'appmode')}
                className="text-[11px] flex items-center gap-1 text-[var(--text-sub)] hover:text-[var(--text-main)] font-medium"
              >
                {copiedKey === 'appmode' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'appmode' ? '已复制' : '复制命令'}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
              在 Windows 终端或快捷方式目标中运行，将以 380px 纯净无边框小窗口固定在桌面右侧：
            </p>
            <pre className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] font-mono overflow-x-auto select-all">
              {appModeCommand}
            </pre>
          </div>

          {/* Card 2: Windows 快捷键录入 (PowerShell) */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-main)] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                Windows 快捷弹窗脚本 (PowerShell)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(psScript, 'ps')}
                className="text-[11px] flex items-center gap-1 text-[var(--text-sub)] hover:text-[var(--text-main)] font-medium"
              >
                {copiedKey === 'ps' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'ps' ? '已复制' : '复制脚本'}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
              保存为 <code className="text-[var(--text-main)] font-mono">QuickAdd.ps1</code>，绑定到快捷键（如通过 Quicker、AutoHotkey 或任务栏），即可一键弹窗打标录入：
            </p>
            <pre className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-sub)] font-mono overflow-x-auto max-h-24">
              {psScript}
            </pre>
          </div>

          {/* Card 3: 浏览器书签插件 (Bookmarklet) */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--text-main)] flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                浏览器快速添加书签 (Bookmarklet)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(bookmarklet, 'bm')}
                className="text-[11px] flex items-center gap-1 text-[var(--text-sub)] hover:text-[var(--text-main)] font-medium"
              >
                {copiedKey === 'bm' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'bm' ? '已复制' : '复制代码'}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
              将复制的代码添加到浏览器书签网址，在任何网页按一下书签即可随时呼出 Jev 待办录入。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-medium)] rounded-lg transition-colors"
          >
            完成
          </button>
        </div>
      </motion.div>
    </div>
  );
};
