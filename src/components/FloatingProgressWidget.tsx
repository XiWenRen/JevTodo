import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TaskItem } from '../types';
import { useActiveSkin } from '../plugins/skins/SkinRegistry';

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
  const { activeSkin } = useActiveSkin();
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

        {/* Dynamic Companion Mascot rendered via Active Skin Plugin */}
        <activeSkin.CompanionWidget 
          progressPercent={progressPercent}
          isAllCompleted={isAllCompleted}
          isBlinking={isBlinking}
          size={size}
        />

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
