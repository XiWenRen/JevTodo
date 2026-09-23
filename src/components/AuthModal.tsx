import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogIn, 
  UserPlus, 
  LogOut 
} from 'lucide-react';
import { AuthUser, loginUser, registerUser } from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAuthSuccess: (user: AuthUser) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('请输入用户名');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('密码长度至少为 6 个字符');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMessage('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser(cleanUsername, password);
        if (!res.success || !res.user) {
          setErrorMessage(res.error || '登录失败，请检查用户名或密码');
          return;
        }
        setSuccessMessage('登录成功，已切换至您的专属数据空间');
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 500);
      } else {
        const res = await registerUser(cleanUsername, password);
        if (!res.success || !res.user) {
          setErrorMessage(res.error || '注册失败，可能用户名已存在');
          return;
        }
        setSuccessMessage('注册成功，专属个人云存储空间已就绪');
        setTimeout(() => {
          onAuthSuccess(res.user!);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '网络通信异常');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="acrylic-panel w-full max-w-sm rounded-2xl p-5 border border-[var(--border-medium)] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[var(--chip-bg)] text-[var(--text-main)] border border-[var(--chip-border)]">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-main)]">
                {currentUser ? '用户账号管理' : (mode === 'login' ? '登录个人账号' : '注册专属账号')}
              </h3>
              <p className="text-[10px] text-[var(--text-faint)]">
                专属个人空间 · 私密安全存储
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

        {/* If already logged in */}
        {currentUser ? (
          <div className="py-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--chip-border)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>当前登录: {currentUser.username}</span>
              </div>
              <p className="text-[11px] text-[var(--text-sub)] leading-relaxed">
                您的待办事项已绑定至此账号，受专属加密保护，仅您本人可查看与编辑。
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>退出当前账号</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-lg bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] text-xs font-medium transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Form */
          <form onSubmit={handleSubmit} className="py-3.5 space-y-3.5 text-xs">
            {/* Mode Switcher Tabs */}
            <div className="flex p-0.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-[var(--chip-bg)] text-[var(--text-main)] shadow-sm font-semibold'
                    : 'text-[var(--text-faint)] hover:text-[var(--text-main)]'
                }`}
              >
                登录账号
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-[var(--chip-bg)] text-[var(--text-main)] shadow-sm font-semibold'
                    : 'text-[var(--text-faint)] hover:text-[var(--text-main)]'
                }`}
              >
                注册新用户
              </button>
            </div>

            {/* Username Input */}
            <div className="space-y-1">
              <label className="block text-[var(--text-main)] font-medium">用户名</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如: alex 或 pm_zhang"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg pl-8 pr-3 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent-bg)]"
                />
                <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="block text-[var(--text-main)] font-medium">密码</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位密码"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg pl-8 pr-3 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent-bg)]"
                />
                <Lock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              </div>
            </div>

            {/* Confirm Password (Register mode only) */}
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="block text-[var(--text-main)] font-medium">确认密码</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码确认"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-lg pl-8 pr-3 py-2 text-[var(--text-main)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent-bg)]"
                  />
                  <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                </div>
              </div>
            )}

            {/* Security Isolation Notice */}
            <div className="p-2.5 rounded-lg bg-[var(--chip-bg)] border border-[var(--chip-border)] flex items-start gap-1.5 text-[10px] text-[var(--text-sub)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                系统已启用<strong>租户级行级隔离（Anti-IDOR）</strong>，所有任务均带专有 User ID 校验，任何用户均无法窥探或修改他人数据。
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:opacity-90 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在处理...</span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>立即登录</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>创建隔离账号并进入</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
