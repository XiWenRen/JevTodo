import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X, ArrowRight } from 'lucide-react';
import { TaskItem, AppTheme } from '../types';
import { CherryIcon } from './CherryIcon';
import { useActiveSkin } from '../plugins/skins/SkinRegistry';

interface CherryClockModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  durationMinutes?: number;
  soundEnabled?: boolean;
  theme?: AppTheme;
  onClose: () => void;
  onComplete: (taskId: string, durationMinutes: number) => void;
}

export function playCherryCompletionChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.9);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.35);
    gain2.gain.setValueAtTime(0.35, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 1.4);
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

export type ClockPhase = 'focus' | 'break';

export const CherryClockModal: React.FC<CherryClockModalProps> = ({
  isOpen,
  task,
  durationMinutes = 25,
  soundEnabled = true,
  theme: _theme,
  onClose,
  onComplete
}) => {
  const totalFocusSeconds = Math.max(1, durationMinutes * 60);
  const breakSeconds = 5 * 60;

  const [phase, setPhase] = useState<ClockPhase>('focus');
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0);

  const [secondsLeft, setSecondsLeft] = useState<number>(totalFocusSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const { activeSkin } = useActiveSkin();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(0);
  const remainingSecondsRef = useRef<number>(totalFocusSeconds);
  const isCompletedRef = useRef<boolean>(false);

  const handleFocusPhaseComplete = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setCompletedPomodoros(prev => {
      const nextCount = prev + 1;

      if (soundEnabled) {
        playCherryCompletionChime();
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🍒 番茄时钟专注完成！', {
            body: `「${task?.title || '专注任务'}」已完成第 ${nextCount} 轮专注，收获 1 颗樱桃勋章！进入 5 分钟休息时间~`,
            icon: '/favicon.ico'
          });
        } catch {}
      }

      return nextCount;
    });

    if (task) {
      onComplete(task.id, durationMinutes);
    }

    setPhase('break');
    remainingSecondsRef.current = breakSeconds;
    setSecondsLeft(breakSeconds);
    endTimeRef.current = Date.now() + breakSeconds * 1000;
    isCompletedRef.current = false;
  }, [task, durationMinutes, soundEnabled, onComplete, breakSeconds]);

  const handleBreakPhaseComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (soundEnabled) {
      playCherryCompletionChime();
    }

    setPhase('focus');
    remainingSecondsRef.current = totalFocusSeconds;
    setSecondsLeft(totalFocusSeconds);
    endTimeRef.current = Date.now() + totalFocusSeconds * 1000;
    isCompletedRef.current = false;
  }, [soundEnabled, totalFocusSeconds]);

  const handleSkipBreak = useCallback(() => {
    handleBreakPhaseComplete();
  }, [handleBreakPhaseComplete]);

  useEffect(() => {
    if (isOpen) {
      setPhase('focus');
      setCompletedPomodoros(0);
      remainingSecondsRef.current = totalFocusSeconds;
      setSecondsLeft(totalFocusSeconds);
      endTimeRef.current = Date.now() + totalFocusSeconds * 1000;
      setIsRunning(true);
      setShowExitConfirm(false);
      isCompletedRef.current = false;
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isOpen, totalFocusSeconds]);

  const toggleRunning = useCallback(() => {
    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        endTimeRef.current = Date.now() + remainingSecondsRef.current * 1000;
      } else {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        remainingSecondsRef.current = remaining;
        setSecondsLeft(remaining);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (isRunning) {
      endTimeRef.current = Date.now() + remainingSecondsRef.current * 1000;

      const syncRemaining = () => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        remainingSecondsRef.current = remaining;
        setSecondsLeft(remaining);

        if (remaining <= 0) {
          if (phase === 'focus') {
            handleFocusPhaseComplete();
          } else {
            handleBreakPhaseComplete();
          }
        }
      };

      timerRef.current = setInterval(syncRemaining, 500);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          syncRemaining();
        }
      };
      const handleWindowFocus = () => {
        syncRemaining();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, isRunning, phase, handleFocusPhaseComplete, handleBreakPhaseComplete]);

  const handleRequestClose = useCallback(() => {
    if (phase === 'break' || secondsLeft === totalFocusSeconds) {
      onClose();
      return;
    }
    setShowExitConfirm(true);
  }, [phase, secondsLeft, totalFocusSeconds, onClose]);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRunning();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleRunning, handleRequestClose]);

  if (!isOpen || !task) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // 获取当前伴侣大舞台渲染器
  const CompanionStageComponent = activeSkin.CompanionStage;
  const CompanionFallbackComponent = activeSkin.CompanionWidget;

  // 构造大舞台通用的伴侣渲染属性
  const companionProps = {
    progressPercent: Math.round(((totalFocusSeconds - secondsLeft) / totalFocusSeconds) * 100),
    progressRatio: (totalFocusSeconds - secondsLeft) / totalFocusSeconds,
    isAllCompleted: false,
    activityState: (phase === 'break' ? 'sleeping' : !isRunning ? 'stopped' : 'walking') as any,
    animDur: phase === 'break' ? '2.8s' : !isRunning ? '0s' : '1.1s',
    isStationary: phase === 'break' || !isRunning,
    isStopped: !isRunning,
    isSettling: false,
    isSleeping: phase === 'break',
    isHovered: false,
    size: 230,
    focusPhase: phase,
    isPaused: !isRunning
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between select-none bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden p-4 sm:p-6 backdrop-blur-3xl"
      >
        {/* 顶部控制栏 */}
        <div className="w-full flex items-center justify-between z-20 max-w-2xl px-2">
          {/* 左侧：任务标题 */}
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold truncate text-[var(--text-main)] opacity-90">
              {task.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRunning}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] transition-all active:scale-95"
              title={isRunning ? '暂停 (空格)' : '继续 (空格)'}
            >
              {isRunning ? (
                <Pause className="w-4 h-4 opacity-80 hover:opacity-100" />
              ) : (
                <Play className="w-4 h-4 fill-current text-rose-500 opacity-90 hover:opacity-100" />
              )}
            </button>

            <button
              type="button"
              onClick={handleRequestClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-rose-400 hover:bg-[var(--chip-bg)] transition-all active:scale-95"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4 opacity-80 hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* 中央舞台区：倒计时与伴侣大舞台 */}
        <div className="flex flex-col items-center justify-center my-auto z-10 space-y-4 sm:space-y-6">
          {/* 大时钟数字 */}
          <div className="text-center">
            <div className="text-6xl sm:text-7xl md:text-8xl font-mono font-light tracking-tight text-[var(--text-main)] drop-shadow-sm leading-none select-none">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>

            <div className="mt-3 flex flex-col items-center gap-2 select-none">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
                  phase === 'focus'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                }`}>
                  {phase === 'focus' ? `🎯 专注第 ${completedPomodoros + 1} 轮` : '☕ 休息时间 (5分钟) · 喝口水舒展一下'}
                </span>
                {completedPomodoros > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-medium">
                    <CherryIcon size={14} />
                    <span>已达成 {completedPomodoros} 颗樱桃勋章</span>
                  </span>
                )}
              </div>

              {phase === 'break' && (
                <button
                  type="button"
                  onClick={handleSkipBreak}
                  className="mt-1 px-3.5 py-1.5 rounded-full text-xs font-medium text-emerald-300 hover:text-white bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/35 transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
                >
                  <span>跳过休息，开始下一轮专注</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 
            核心伴侣大舞台：
            100% 矢量渲染当前选定伴侣（跑轮仓鼠/萌猫/柯基/恐龙），完全告别位图贴图
          */}
          <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 select-none pointer-events-none">
            {/* 氛围呼吸光晕 */}
            <div 
              className={`absolute w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                phase === 'focus' ? 'bg-amber-500/15' : 'bg-emerald-500/15'
              }`}
            />

            {/* 伴侣大舞台组件容器 */}
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center">
              {CompanionStageComponent ? (
                <CompanionStageComponent {...companionProps} />
              ) : (
                <CompanionFallbackComponent {...companionProps} />
              )}
            </div>
          </div>
        </div>

        {/* 底部留白占位，保持视觉居中平衡 */}
        <div className="w-full h-8 z-10" />

        {/* 离开确认弹窗 */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="max-w-xs w-full rounded-2xl p-6 text-center space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-[var(--border-medium)]"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  opacity: 1
                }}
              >
                <div className="flex justify-center select-none">
                  <CherryIcon size={38} className="filter drop-shadow-[0_2px_8px_rgba(244,63,94,0.4)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    提前离开将不记录此轮樱桃
                  </h3>
                  <p className="text-xs text-[var(--text-sub)] mt-1.5 leading-relaxed">
                    {completedPomodoros > 0
                      ? `当前番茄时钟尚未完成，提前退出不会记录此轮樱桃（此前已达成的 ${completedPomodoros} 颗樱桃勋章已安全入账），确认要离开吗？`
                      : '倒计时尚未完成，提前退出不会生成樱桃子任务，确认要离开吗？'}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-main)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] border border-[var(--border-subtle)] transition-colors active:scale-95"
                  >
                    继续专注
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExit}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/25 transition-colors active:scale-95"
                  >
                    确认退出
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
