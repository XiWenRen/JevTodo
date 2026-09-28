import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X, ArrowRight } from 'lucide-react';
import { TaskItem, AppTheme } from '../types';
import { CherryIcon } from './CherryIcon';

interface CherryClockModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  durationMinutes?: number;
  soundEnabled?: boolean;
  theme?: AppTheme;
  onClose: () => void;
  onComplete: (taskId: string, durationMinutes: number) => void;
}

import { useActiveSkin } from '../plugins/skins/SkinRegistry';
import { FocusPetConfig } from '../plugins/skins/types';

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

/**
 * Realistic Cherry Fruit with Progressive Teeth Bite Marks
 * Non-anthropomorphic juicy fruit with bite indentations, pulp texture, and pit core.
 * Center aligned at viewBox (50, 50).
 */
const ProgressiveCherry: React.FC<{ stage: number; direction: 'left' | 'right' | 'top' }> = ({ 
  stage, 
  direction 
}) => {
  const transformStyle = direction === 'left' 
    ? 'scaleX(-1)' 
    : direction === 'top' 
      ? 'rotate(45deg)' 
      : 'none';

  return (
    <div 
      className="relative w-16 h-16 sm:w-18 sm:h-18 select-none filter drop-shadow-[0_4px_12px_rgba(225,29,72,0.7)]"
      style={{ transform: transformStyle }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="cherryGrad" cx="36%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ff5277" />
            <stop offset="35%" stopColor="#e11d48" />
            <stop offset="85%" stopColor="#9f1239" />
            <stop offset="100%" stopColor="#4c0519" />
          </radialGradient>
          <radialGradient id="pulpGrad" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="70%" stopColor="#be123c" />
            <stop offset="100%" stopColor="#881337" />
          </radialGradient>
          <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </linearGradient>
        </defs>

        {/* Stem and Leaf */}
        {stage < 4 && (
          <g>
            <path
              d="M 50 34 Q 60 10 78 4"
              fill="none"
              stroke="url(#stemGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 68 8 Q 84 4 86 16 Q 74 18 68 8 Z"
              fill="#65a30d"
              stroke="#365314"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* STAGE 0: Whole Fresh Cherry (Center aligned at 50, 50) */}
        {stage === 0 && (
          <g>
            <circle cx="50" cy="50" r="28" fill="url(#cherryGrad)" />
            <ellipse cx="40" cy="40" rx="8" ry="4.5" fill="#ffffff" opacity="0.75" transform="rotate(-30 40 40)" />
            <circle cx="48" cy="36" r="2.2" fill="#ffffff" opacity="0.8" />
          </g>
        )}

        {/* STAGE 1: Big Bite taken on the side facing the mouth */}
        {stage === 1 && (
          <g>
            <path
              d="M 50 22 
                 A 28 28 0 0 1 78 50 
                 A 28 28 0 0 1 50 78 
                 A 28 28 0 0 1 27 65
                 Q 33 58 31 53
                 Q 37 45 29 40
                 Q 36 33 34 28
                 A 28 28 0 0 1 50 22 Z"
              fill="url(#cherryGrad)"
            />
            {/* Exposed Pulp with bite texture */}
            <path
              d="M 27 65 Q 33 58 31 53 Q 37 45 29 40 Q 36 33 34 28 Q 42 46 27 65 Z"
              fill="url(#pulpGrad)"
            />
            <ellipse cx="56" cy="40" rx="5" ry="3" fill="#ffffff" opacity="0.65" transform="rotate(-25 56 40)" />
          </g>
        )}

        {/* STAGE 2: Half Eaten, Core Pit exposed */}
        {stage === 2 && (
          <g>
            <path
              d="M 50 22 
                 A 28 28 0 0 1 78 50 
                 A 28 28 0 0 1 52 78
                 Q 42 65 45 57
                 Q 39 48 46 38
                 Q 44 30 50 22 Z"
              fill="url(#cherryGrad)"
            />
            {/* Exposed Pit / Core */}
            <ellipse cx="49" cy="50" rx="9" ry="10" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
            <ellipse cx="47" cy="47" rx="3" ry="3.5" fill="#d97706" opacity="0.75" />
          </g>
        )}

        {/* STAGE 3: Only Pit and Stem left */}
        {stage === 3 && (
          <g>
            <ellipse cx="50" cy="42" rx="9" ry="10" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
            <ellipse cx="48" cy="39" rx="3" ry="3.5" fill="#d97706" opacity="0.8" />
            <circle cx="58" cy="46" r="2.5" fill="#be123c" />
            <circle cx="42" cy="48" r="2" fill="#be123c" />
          </g>
        )}

        {/* STAGE 4: Completely disappeared (swallowed) */}
        {stage === 4 && null}
      </svg>
    </div>
  );
};

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
  const breakSeconds = 5 * 60; // 5 minutes standard break

  const [phase, setPhase] = useState<ClockPhase>('focus');
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0);

  const [secondsLeft, setSecondsLeft] = useState<number>(totalFocusSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  const { activeSkin } = useActiveSkin();
  const pets = activeSkin.focusPets && activeSkin.focusPets.length > 0 
    ? activeSkin.focusPets 
    : [
        {
          id: 'hamster',
          name: '小仓鼠',
          image: '/assets/animals/hamster.webp',
          cherryCenter: { left: '20%', top: '16%' },
          biteDirection: 'left' as const
        }
      ];

  const [currentAnimal, setCurrentAnimal] = useState<FocusPetConfig>(pets[0]);
  const [biteStage, setBiteStage] = useState<number>(0);
  const [crumbs, setCrumbs] = useState<{ id: number; x: number; y: number }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(0);
  const remainingSecondsRef = useRef<number>(totalFocusSeconds);
  const isCompletedRef = useRef<boolean>(false);

  // Focus phase completion: award cherry, notify, and transition into 5-min break
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

    // Switch to 5-minute break
    setPhase('break');
    setSecondsLeft(breakSeconds);
    remainingSecondsRef.current = breakSeconds;
    endTimeRef.current = Date.now() + breakSeconds * 1000;
    isCompletedRef.current = false;
    setIsRunning(true);
    setBiteStage(0);
  }, [soundEnabled, task, durationMinutes, onComplete, breakSeconds]);

  // Break phase completion: notify and transition back to next focus phase
  const handleBreakPhaseComplete = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (soundEnabled) {
      playCherryCompletionChime();
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⏰ 休息结束！', {
          body: `5分钟休息已结束，即将开始下一轮番茄时钟专注！`,
          icon: '/favicon.ico'
        });
      } catch {}
    }

    // Switch back to focus
    setPhase('focus');
    setSecondsLeft(totalFocusSeconds);
    remainingSecondsRef.current = totalFocusSeconds;
    endTimeRef.current = Date.now() + totalFocusSeconds * 1000;
    isCompletedRef.current = false;
    setIsRunning(true);
    setBiteStage(0);
  }, [soundEnabled, totalFocusSeconds]);

  // Skip break directly into next focus phase
  const handleSkipBreak = useCallback(() => {
    if (phase !== 'break') return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase('focus');
    setSecondsLeft(totalFocusSeconds);
    remainingSecondsRef.current = totalFocusSeconds;
    endTimeRef.current = Date.now() + totalFocusSeconds * 1000;
    isCompletedRef.current = false;
    setIsRunning(true);
    setBiteStage(0);
  }, [phase, totalFocusSeconds]);

  // Toggle running (pause / resume) with timestamp recalculation
  const toggleRunning = useCallback(() => {
    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        endTimeRef.current = Date.now() + remainingSecondsRef.current * 1000;
      } else {
        const diffMs = endTimeRef.current - Date.now();
        const rem = Math.max(0, Math.ceil(diffMs / 1000));
        remainingSecondsRef.current = rem;
        setSecondsLeft(rem);
      }
      return next;
    });
  }, []);

  // Initialize session & random animal from active skin
  useEffect(() => {
    if (isOpen) {
      const randomIndex = Math.floor(Math.random() * pets.length);
      setCurrentAnimal(pets[randomIndex] || pets[0]);
      isCompletedRef.current = false;
      setPhase('focus');
      setCompletedPomodoros(0);
      remainingSecondsRef.current = totalFocusSeconds;
      endTimeRef.current = Date.now() + totalFocusSeconds * 1000;
      setSecondsLeft(totalFocusSeconds);
      setIsRunning(true);
      setShowExitConfirm(false);
      setBiteStage(0);

      // Request notification permission if not yet decided
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, totalFocusSeconds, pets]);

  // Main countdown interval based on absolute wall-clock timestamp + visibility/focus listeners
  useEffect(() => {
    if (!isOpen) return;

    const syncRemaining = () => {
      if (!isRunning || isCompletedRef.current) return;
      const now = Date.now();
      const diffMs = endTimeRef.current - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
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

    if (isRunning) {
      syncRemaining();
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

  // Progressive biting cycle: advances every 1800ms while running in focus mode
  useEffect(() => {
    if (!isOpen || !isRunning || phase !== 'focus') return;

    const biteTimer = setInterval(() => {
      setBiteStage(prev => {
        const next = (prev + 1) % 5;
        if (next === 1 || next === 2 || next === 3) {
          setCrumbs([
            { id: Date.now() + 1, x: -14, y: 10 },
            { id: Date.now() + 2, x: 16, y: 14 },
            { id: Date.now() + 3, x: 0, y: 18 }
          ]);
          setTimeout(() => setCrumbs([]), 750);
        }
        return next;
      });
    }, 1800);

    return () => clearInterval(biteTimer);
  }, [isOpen, isRunning, phase]);

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

  // Keyboard shortcut: Space to pause/resume, Esc to close
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between select-none bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden p-6 sm:p-8 backdrop-blur-3xl"
      >
        {/* Top-Right Controls: ONLY Pause/Play and Close */}
        <div className="w-full flex items-center justify-end gap-2.5 z-20">
          <button
            type="button"
            onClick={toggleRunning}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--chip-bg)] transition-all active:scale-95"
            title={isRunning ? '暂停 (空格)' : '继续 (空格)'}
          >
            {isRunning ? (
              <Pause className="w-5 h-5 opacity-80 hover:opacity-100" />
            ) : (
              <Play className="w-5 h-5 fill-current text-rose-500 opacity-90 hover:opacity-100" />
            )}
          </button>

          <button
            type="button"
            onClick={handleRequestClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-sub)] hover:text-rose-400 hover:bg-[var(--chip-bg)] transition-all active:scale-95"
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5 opacity-80 hover:opacity-100" />
          </button>
        </div>

        {/* Center Stage: Countdown Clock ABOVE, Animal with Cherry IN THE MIDDLE */}
        <div className="flex flex-col items-center justify-center my-auto z-10 space-y-6 sm:space-y-8">
          {/* Top: Large Minimal Countdown Clock */}
          <div className="text-center">
            <div className="text-6xl sm:text-7xl md:text-8xl font-mono font-light tracking-tight text-[var(--text-main)] drop-shadow-sm leading-none select-none">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>

            {/* Status and Focus Badge: completely calm, static, and elegant (no flashing/pulsing) */}
            <div className="mt-4 flex flex-col items-center gap-2 select-none">
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
                  title="跳过本次休息，立即进入下一个番茄时钟"
                >
                  <span>跳过休息，开始下一轮专注</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 
            Middle Stage: 
            Animal image stays COMPLETELY STILL (no bobbing/scaling as requested).
            Cherry is accurately positioned directly on the mouth with progressive eating lifecycle.
          */}
          <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 select-none pointer-events-none">
            {/* Soft Ambient Glow */}
            <div 
              className={`absolute w-52 h-52 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
                phase === 'focus' ? 'bg-rose-500/15' : 'bg-emerald-500/15'
              }`}
            />

            {/* Animal Box (Completely static, no movement) */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <img
                src={currentAnimal.image}
                alt={currentAnimal.name}
                className="w-full h-full object-contain filter drop-shadow-[0_10px_24px_rgba(0,0,0,0.3)] pointer-events-none select-none"
              />

              {/* 
                THE CHERRY: 
                Positioned exactly at the animal's open mouth using transform translate(-50%, -50%)
              */}
              <motion.div
                key={biteStage === 0 ? 'new-cherry' : `cherry-${biteStage}`}
                initial={biteStage === 0 ? { scale: 0, opacity: 0 } : false}
                animate={{ 
                  scale: biteStage === 4 ? 0 : 1, 
                  opacity: biteStage === 4 ? 0 : 1 
                }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 24
                }}
                className="absolute z-20 pointer-events-none"
                style={{
                  left: currentAnimal.cherryCenter.left,
                  top: currentAnimal.cherryCenter.top,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <ProgressiveCherry 
                  stage={biteStage} 
                  direction={currentAnimal.biteDirection} 
                />

                {/* Flying Fruit Crumbs on Bite */}
                {crumbs.map(crumb => (
                  <motion.span
                    key={crumb.id}
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{ opacity: 0, scale: 0.3, x: crumb.x, y: crumb.y }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]"
                  />
                ))}
              </motion.div>

              {/* Happy Nom-Nom Heart when swallowed (Stage 4) */}
              {isRunning && phase === 'focus' && biteStage === 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -28, scale: [0.4, 1.2, 1.1, 0.9] }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute text-base font-bold text-rose-400 select-none drop-shadow"
                  style={{
                    left: currentAnimal.cherryCenter.left,
                    top: currentAnimal.cherryCenter.top,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  💖
                </motion.div>
              )}

              {/* Break Mode Peaceful Resting Pill */}
              {phase === 'break' && (
                <div className="absolute -top-7 text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 select-none flex items-center gap-1.5 shadow-sm">
                  <span>☕</span>
                  <span>休息蓄力中</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom blank spacer for vertical balance */}
        <div className="h-6 w-full pointer-events-none" />

        {/* 
          Exit Confirmation Modal: 
          Solid, fully opaque, non-transparent high contrast panel
        */}
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
