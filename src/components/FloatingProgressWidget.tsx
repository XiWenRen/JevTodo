import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TaskItem } from '../types';

interface FloatingProgressWidgetProps {
  tasks: TaskItem[];
  adviceSummary: string;
  overdueCount: number;
  staleCount?: number;
  rollForwardCount?: number;
  isCompactMode?: boolean;
  onOpenConfirmModal: () => void;
}

export const FloatingProgressWidget: React.FC<FloatingProgressWidgetProps> = ({
  tasks,
  adviceSummary,
  overdueCount,
  staleCount = 0,
  rollForwardCount = 0,
  isCompactMode = false,
  onOpenConfirmModal
}) => {
  // Blinking micro-expression state
  const [isBlinking, setIsBlinking] = useState(false);

  // Calculate today / core tasks completion progress
  const todayTasks = tasks.filter(t => t.category === '即刻完成');
  const totalTasksCount = todayTasks.length > 0 ? todayTasks.length : tasks.length;
  const completedTasksCount = todayTasks.length > 0 
    ? todayTasks.filter(t => t.completed).length 
    : tasks.filter(t => t.completed).length;

  const progressPercent = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 100;

  const isAllCompleted = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

  // Mascot blinking cycle
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Geometry for compact circular progress ring (shrunk from 58px to 38px)
  const size = 38;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const handleClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([15, 20]);
      } catch {}
    }
    onOpenConfirmModal();
  };

  // Dock cleanly INSIDE the main card's right boundary
  const leftPosCalc = isCompactMode
    ? 'calc(min(calc(100vw - 8px), calc(50% + 210px)) - 46px)'
    : 'calc(min(calc(100vw - 8px), calc(50% + 288px)) - 46px)';

  return (
    <div
      className="fixed z-40 top-[50%] -translate-y-1/2 transition-all duration-300 select-none"
      style={{ left: leftPosCalc }}
    >
      <motion.button
        type="button"
        onClick={handleClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className="relative w-[38px] h-[38px] flex items-center justify-center cursor-pointer outline-none focus:outline-none group"
        title={`Cherry 智能决策助手 · 点击快速整理待办 (今日进度: ${progressPercent}%)`}
      >
        {/* Subtle Ambient Halo on Hover */}
        <div 
          className="absolute -inset-1 rounded-full opacity-40 blur-xs transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: isAllCompleted
              ? 'radial-gradient(circle, rgba(52,211,153,0.5) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(59,130,246,0.3) 60%, transparent 75%)'
          }}
        />

        {/* Precision Progress SVG Ring */}
        <svg className="w-full h-full -rotate-90 pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[var(--border-subtle)] opacity-35"
            fill="transparent"
          />
          {/* Active Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#compactJevGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="compactJevGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              {isAllCompleted ? (
                <>
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </>
              )}
            </linearGradient>
          </defs>
        </svg>

        {/* Petite Mascot Orb / Core */}
        <div 
          className="absolute inset-[3.5px] rounded-full flex items-center justify-center overflow-hidden border transition-all duration-200"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-drawer) 96%, transparent)',
            backdropFilter: 'blur(16px)',
            borderColor: 'var(--border-medium)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.18)'
          }}
        >
          {/* Sleek Mascot SVG Artwork */}
          <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="none">
            {/* Robot/Cat Helmet Ears */}
            <path
              d="M6 7.5L8.5 4.5L10 6.5M18 7.5L15.5 4.5L14 6.5"
              stroke="var(--text-sub)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            />
            {/* Head Contour */}
            <rect
              x="4"
              y="6"
              width="16"
              height="13"
              rx="6"
              fill="currentColor"
              className="text-zinc-900 dark:text-zinc-950"
            />
            {/* Glossy Visor Screen */}
            <rect
              x="5.5"
              y="7.5"
              width="13"
              height="10"
              rx="4"
              fill="#09090b"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.8"
            />

            {/* Expressive LED Matrix Optics */}
            {isBlinking ? (
              // Blink line
              <>
                <line x1="8" y1="12.5" x2="10.5" y2="12.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="13.5" y1="12.5" x2="16" y2="12.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
              </>
            ) : isAllCompleted ? (
              // Happy curve
              <>
                <path d="M8 13.5C8.5 12 10 12 10.5 13.5" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M13.5 13.5C14 12 15.5 12 16 13.5" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" />
              </>
            ) : (
              // Normal cyan glowing optics
              <>
                <circle cx="9" cy="12.5" r="1.3" fill="#38bdf8" className="shadow-xs" />
                <circle cx="15" cy="12.5" r="1.3" fill="#38bdf8" className="shadow-xs" />
                {/* Subtle blush */}
                <ellipse cx="7.5" cy="14" rx="0.8" ry="0.4" fill="rgba(244,114,182,0.4)" />
                <ellipse cx="16.5" cy="14" rx="0.8" ry="0.4" fill="rgba(244,114,182,0.4)" />
              </>
            )}
          </svg>
        </div>

        {/* Overdue Alert Dot (Micro beacon) */}
        {overdueCount > 0 ? (
          <div 
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-[var(--bg-app)] shadow-sm animate-pulse"
            title={`${overdueCount} 项任务逾期`}
          />
        ) : rollForwardCount > 0 ? (
          <div 
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-[var(--bg-app)] shadow-sm animate-pulse"
            title={`${rollForwardCount} 项待办已到期，点击由 Jev 智能流转`}
          />
        ) : null}
      </motion.button>
    </div>
  );
};
