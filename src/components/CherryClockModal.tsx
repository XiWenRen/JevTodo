import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X } from 'lucide-react';
import { TaskItem, AppTheme } from '../types';

interface CherryClockModalProps {
  isOpen: boolean;
  task: TaskItem | null;
  durationMinutes?: number;
  soundEnabled?: boolean;
  theme?: AppTheme;
  onClose: () => void;
  onComplete: (taskId: string, durationMinutes: number) => void;
}

interface AnimalConfig {
  id: 'hamster' | 'dino' | 'sloth';
  name: string;
  image: string;
  // Precise cherry center coordinates relative to 256x256 animal box
  cherryCenter: {
    left: string;
    top: string;
  };
  biteDirection: 'left' | 'right' | 'top';
}

const ANIMALS: AnimalConfig[] = [
  {
    id: 'hamster',
    name: '小仓鼠',
    image: '/assets/animals/hamster.webp',
    // 松鼠/仓鼠：嘴巴在左上角，樱桃向左上更多一点
    cherryCenter: {
      left: '20%',
      top: '16%'
    },
    biteDirection: 'left'
  },
  {
    id: 'dino',
    name: '小恐龙',
    image: '/assets/animals/dino.webp',
    // 恐龙：嘴巴在上部张开，樱桃再向上一点，咬痕朝向左侧嘴内
    cherryCenter: {
      left: '60%',
      top: '20%'
    },
    biteDirection: 'left'
  },
  {
    id: 'sloth',
    name: '树懒',
    image: '/assets/animals/sloth.webp',
    // 树懒：嘴巴在左上方，樱桃向左上一点
    cherryCenter: {
      left: '35%',
      top: '18%'
    },
    biteDirection: 'left'
  }
];

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
 * Realistic Cherry with Progressive Teeth Bite Marks
 * Ball center is precisely aligned at viewBox (50, 50) for perfect 1:1 anchor positioning.
 */
const ProgressiveCherry: React.FC<{ stage: number; direction: 'left' | 'right' | 'top' }> = ({ 
  stage, 
  direction 
}) => {
  const transformStyle = 
    direction === 'right' 
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

export const CherryClockModal: React.FC<CherryClockModalProps> = ({
  isOpen,
  task,
  durationMinutes = 25,
  soundEnabled = true,
  theme: _theme,
  onClose,
  onComplete
}) => {
  const totalSeconds = Math.max(1, durationMinutes * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Randomly select 1 of 3 animals upon each session
  const [currentAnimal, setCurrentAnimal] = useState<AnimalConfig>(ANIMALS[0]);

  // Progressive Cherry Bite Stages:
  // 0: Whole fresh cherry
  // 1: Big bite (teeth indentations, juice particles)
  // 2: Half eaten, core pit visible
  // 3: Only pit & stem left
  // 4: Completely swallowed (disappeared, nom-nom heart)
  const [biteStage, setBiteStage] = useState<number>(0);
  const [crumbs, setCrumbs] = useState<{ id: number; x: number; y: number }[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session & random animal
  useEffect(() => {
    if (isOpen) {
      const randomIndex = Math.floor(Math.random() * ANIMALS.length);
      setCurrentAnimal(ANIMALS[randomIndex]);
      setSecondsLeft(totalSeconds);
      setIsRunning(true);
      setIsFinished(false);
      setShowExitConfirm(false);
      setBiteStage(0);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, totalSeconds]);

  // Main countdown interval
  useEffect(() => {
    if (!isOpen || isFinished) return;

    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);

            if (soundEnabled) {
              playCherryCompletionChime();
            }

            if (task) {
              onComplete(task.id, durationMinutes);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isRunning, isFinished, soundEnabled, task, durationMinutes, onComplete]);

  // Progressive biting cycle: advances every 1800ms while running (relaxed, leisurely pace, animal stays completely STILL)
  useEffect(() => {
    if (!isOpen || !isRunning || isFinished) return;

    const biteTimer = setInterval(() => {
      setBiteStage(prev => {
        const next = (prev + 1) % 5;
        // Splash crumbs on bites
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
  }, [isOpen, isRunning, isFinished]);

  // Keyboard shortcut: Space to pause/resume, Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFinished) {
          setIsRunning(prev => !prev);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFinished, secondsLeft, totalSeconds]);

  const handleRequestClose = useCallback(() => {
    if (isFinished || secondsLeft === totalSeconds) {
      onClose();
      return;
    }
    setShowExitConfirm(true);
  }, [isFinished, secondsLeft, totalSeconds, onClose]);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

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
            onClick={() => setIsRunning(prev => !prev)}
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
            <motion.div 
              key={`${minutes}:${seconds}`}
              initial={{ opacity: 0.92, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-6xl sm:text-7xl md:text-8xl font-mono font-light tracking-tight text-[var(--text-main)] drop-shadow-sm leading-none"
            >
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </motion.div>

            {isFinished && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm text-emerald-400 font-medium tracking-wide"
              >
                已达成 1 颗樱桃专注勋章 🍒
              </motion.div>
            )}
          </div>

          {/* 
            Middle Stage: 
            Animal image stays COMPLETELY STILL (no bobbing/scaling as requested).
            Cherry is accurately positioned directly on the mouth with progressive eating lifecycle.
          */}
          <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 select-none pointer-events-none">
            {/* Soft Ambient Glow */}
            <div 
              className="absolute w-52 h-52 rounded-full bg-rose-500/15 blur-3xl pointer-events-none"
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
              {isRunning && !isFinished && biteStage === 4 && (
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

              {/* Finished Celebration Banner */}
              {isFinished && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 0.9 }}
                  className="absolute -top-8 text-2xl select-none"
                >
                  🎉 🍒 🎉
                </motion.div>
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
                <div className="text-3xl select-none">🍒</div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-main)]">
                    提前离开将不记录樱桃
                  </h3>
                  <p className="text-xs text-[var(--text-sub)] mt-1.5 leading-relaxed">
                    倒计时尚未完成，提前退出不会生成樱桃子任务，确认要离开吗？
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
