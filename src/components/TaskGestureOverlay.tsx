import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Clock, Check, X } from 'lucide-react';
import { TaskItem as ITaskItem } from '../types';
import { CardRect } from './TaskItem';

export type GestureActionType = 'none' | 'delete' | 'defer' | 'planning' | 'complete';

export interface GestureData {
  task: ITaskItem;
  point: { x: number; y: number };
  cardRect: CardRect;
}

interface TaskGestureOverlayProps {
  gestureData: GestureData | null;
  onClose: () => void;
  onAction: (action: GestureActionType, task: ITaskItem) => void;
}

export const TaskGestureOverlay: React.FC<TaskGestureOverlayProps> = ({
  gestureData,
  onClose,
  onAction
}) => {
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeAction, setActiveAction] = useState<GestureActionType>('none');
  const [isNearCancel, setIsNearCancel] = useState(false);
  const [isFinishing, setIsFinishing] = useState<GestureActionType | null>(null);
  const [isPacked, setIsPacked] = useState(false);
  const [showSectors, setShowSectors] = useState(false);

  // Initialize and orchestrate sequential animation
  useEffect(() => {
    if (gestureData) {
      setCurrentPos(gestureData.point);
      setActiveAction('none');
      setIsNearCancel(false);
      setIsFinishing(null);
      setIsPacked(false);
      setShowSectors(false);

      const packTimer = setTimeout(() => {
        setIsPacked(true);
      }, 20);

      const sectorsTimer = setTimeout(() => {
        setShowSectors(true);
      }, 100);

      return () => {
        clearTimeout(packTimer);
        clearTimeout(sectorsTimer);
      };
    }
  }, [gestureData]);

  // Pointer tracking & sector detection (Full 180° Semicircle Trisected into 3x 60°)
  useEffect(() => {
    if (!gestureData) return;
    const { point: startPoint } = gestureData;

    const rOuter = 140;
    const rCenterButton = 28;
    const cy = Math.max(rOuter + 28, Math.min(window.innerHeight - 80, startPoint.y));
    const cx = Math.max(rOuter + 20, Math.min(window.innerWidth - rOuter - 20, startPoint.x));

    const handlePointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      setCurrentPos({ x, y });

      const deltaX = x - cx;
      const deltaY = y - cy;
      const dist = Math.hypot(deltaX, deltaY);

      // Cancel zone detection: close to center button or dragged downwards into lower hemisphere
      const inCancelZone = dist < rCenterButton + 14 || (deltaY > 12 && Math.abs(deltaX) < 42);

      if (inCancelZone) {
        if (!isNearCancel) {
          setIsNearCancel(true);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(10); } catch {}
          }
        }
        if (activeAction !== 'none') {
          setActiveAction('none');
        }
        return;
      }

      if (isNearCancel) {
        setIsNearCancel(false);
      }

      // Calculate angle in degrees (-180° to 180°)
      const angleDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      let detected: GestureActionType = 'none';

      // 3 Equal 60° Slices spanning the entire 180° upper semicircle:
      // Left (-180° to -120°): 删除 (Center = -150°)
      // Center (-120° to -60°): 延后 (Center = -90°)
      // Right (-60° to 0°): 完成 (Center = -30°)
      if (angleDeg >= -180 && angleDeg < -120) {
        detected = 'delete';
      } else if (angleDeg >= -120 && angleDeg < -60) {
        detected = 'defer';
      } else if (angleDeg >= -60 && angleDeg <= 0) {
        detected = 'complete';
      } else if (deltaX < -32 && deltaY < 24) {
        detected = 'delete';
      } else if (deltaX > 32 && deltaY < 24) {
        detected = 'complete';
      } else if (deltaY < -32 && Math.abs(deltaX) <= Math.abs(deltaY) * 0.75) {
        detected = 'defer';
      }

      if (detected !== activeAction) {
        setActiveAction(detected);
        if (detected !== 'none' && typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(14);
          } catch {}
        }
      }
    };

    const handlePointerUp = () => {
      if (activeAction !== 'none' && gestureData) {
        setIsFinishing(activeAction);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([16, 20]);
          } catch {}
        }
        setTimeout(() => {
          onAction(activeAction, gestureData.task);
          onClose();
        }, 160);
      } else {
        onClose();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', onClose);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', onClose);
    };
  }, [gestureData, activeAction, isNearCancel, onAction, onClose]);

  if (!gestureData) return null;

  const { task, point: startPoint, cardRect } = gestureData;

  const W = typeof window !== 'undefined' ? window.innerWidth : 800;
  const H = typeof window !== 'undefined' ? window.innerHeight : 600;

  // Geometry: Full 180° upper semicircle, trisected into 3 x 60° options
  const rOuter = 140;
  const rInner = 36;

  const cy = Math.max(rOuter + 28, Math.min(H - 80, startPoint.y));
  const cx = Math.max(rOuter + 20, Math.min(W - rOuter - 20, startPoint.x));

  // Placement for icon and label along sector centerline
  const rIcon = rInner + (rOuter - rInner) * 0.65; // ~103px
  const rText = rInner + (rOuter - rInner) * 0.28; // ~65px

  // Generates SVG path for a circular ring sector
  const describeArcSector = (
    centerX: number,
    centerY: number,
    rIn: number,
    rOut: number,
    startAngleDeg: number,
    endAngleDeg: number
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const sRad = toRad(startAngleDeg);
    const eRad = toRad(endAngleDeg);

    const x1 = centerX + rIn * Math.cos(sRad);
    const y1 = centerY + rIn * Math.sin(sRad);
    const x2 = centerX + rOut * Math.cos(sRad);
    const y2 = centerY + rOut * Math.sin(sRad);
    const x3 = centerX + rOut * Math.cos(eRad);
    const y3 = centerY + rOut * Math.sin(eRad);
    const x4 = centerX + rIn * Math.cos(eRad);
    const y4 = centerY + rIn * Math.sin(eRad);

    const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} L ${x2} ${y2} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x1} ${y1} Z`;
  };

  // 3 Equal 60° Slices across the 180° Semicircle with clean 2° divider gaps:
  // Left: -179° to -121° (Span = 58°, Centerline = EXACTLY -150.0°)
  // Center: -119° to -61° (Span = 58°, Centerline = EXACTLY -90.0°)
  // Right: -59° to -1° (Span = 58°, Centerline = EXACTLY -30.0°)
  const leftSectorPath = describeArcSector(cx, cy, rInner, rOuter, -179, -121);
  const centerSectorPath = describeArcSector(cx, cy, rInner, rOuter, -119, -61);
  const rightSectorPath = describeArcSector(cx, cy, rInner, rOuter, -59, -1);

  // Exact geometric coordinates along sector centerline
  const getPoint = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    };
  };

  // Centerlines: -150° (Left), -90° (Center), -30° (Right)
  const leftIconPos = getPoint(-150, rIcon);
  const leftTextPos = getPoint(-150, rText);

  const centerIconPos = getPoint(-90, rIcon);
  const centerTextPos = getPoint(-90, rText);

  const rightIconPos = getPoint(-30, rIcon);
  const rightTextPos = getPoint(-30, rText);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] select-none touch-none overflow-hidden">
        {/* Soft, immersive blur backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
        />

        {/* 180° Semicircle Trisected Radial Selection Area */}
        {showSectors && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 440, damping: 28 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* SVG Frosted Glass Sectors */}
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                {/* Refined delicate soft glows */}
                <filter id="softGlowRed" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f43f5e" floodOpacity="0.6" />
                </filter>
                <filter id="softGlowOrange" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.6" />
                </filter>
                <filter id="softGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#10b981" floodOpacity="0.6" />
                </filter>

                {/* Glassmorphic Gradient Fills */}
                <radialGradient id="glassRedNormal" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.08" />
                </radialGradient>
                <radialGradient id="glassRedActive" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#e11d48" stopOpacity="0.55" />
                </radialGradient>

                <radialGradient id="glassOrangeNormal" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.08" />
                </radialGradient>
                <radialGradient id="glassOrangeActive" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.55" />
                </radialGradient>

                <radialGradient id="glassGreenNormal" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
                </radialGradient>
                <radialGradient id="glassGreenActive" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.55" />
                </radialGradient>
              </defs>

              {/* --- Sector 1: 删除 (Left 60° · Frosted Rose) --- */}
              <path
                d={leftSectorPath}
                fill={activeAction === 'delete' ? 'url(#glassRedActive)' : 'url(#glassRedNormal)'}
                stroke={activeAction === 'delete' ? '#fb7185' : 'rgba(244, 63, 94, 0.4)'}
                strokeWidth={activeAction === 'delete' ? 1.5 : 0.8}
                filter={activeAction === 'delete' ? 'url(#softGlowRed)' : undefined}
                className="transition-all duration-150"
              />

              {/* --- Sector 2: 延后 (Center 60° · Frosted Amber) --- */}
              <path
                d={centerSectorPath}
                fill={activeAction === 'defer' || activeAction === 'planning' ? 'url(#glassOrangeActive)' : 'url(#glassOrangeNormal)'}
                stroke={activeAction === 'defer' || activeAction === 'planning' ? '#fbbf24' : 'rgba(245, 158, 11, 0.4)'}
                strokeWidth={activeAction === 'defer' || activeAction === 'planning' ? 1.5 : 0.8}
                filter={activeAction === 'defer' || activeAction === 'planning' ? 'url(#softGlowOrange)' : undefined}
                className="transition-all duration-150"
              />

              {/* --- Sector 3: 完成 (Right 60° · Frosted Emerald) --- */}
              <path
                d={rightSectorPath}
                fill={activeAction === 'complete' ? 'url(#glassGreenActive)' : 'url(#glassGreenNormal)'}
                stroke={activeAction === 'complete' ? '#34d399' : 'rgba(16, 185, 129, 0.4)'}
                strokeWidth={activeAction === 'complete' ? 1.5 : 0.8}
                filter={activeAction === 'complete' ? 'url(#softGlowGreen)' : undefined}
                className="transition-all duration-150"
              />

              {/* Slender guidance filament to pointer */}
              <line
                x1={cx}
                y1={cy}
                x2={currentPos.x}
                y2={currentPos.y}
                stroke={
                  isNearCancel
                    ? 'rgba(244, 63, 94, 0.5)'
                    : activeAction === 'delete'
                    ? '#fb7185'
                    : activeAction === 'defer' || activeAction === 'planning'
                    ? '#fbbf24'
                    : activeAction === 'complete'
                    ? '#34d399'
                    : 'rgba(255, 255, 255, 0.35)'
                }
                strokeWidth={activeAction !== 'none' || isNearCancel ? 1.5 : 1}
                strokeDasharray={activeAction !== 'none' ? undefined : '2 3'}
                opacity={activeAction !== 'none' || isNearCancel ? 0.85 : 0.45}
              />
            </svg>

            {/* STRICTLY CENTERED LABELS & ICONS (Bisector angles: -150°, -90°, -30°) */}

            {/* --- Left Sector: 删除 (Centerline -150°) --- */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
              style={{
                left: `${leftIconPos.x}px`,
                top: `${leftIconPos.y}px`,
                transform: `translate(-50%, -50%) scale(${activeAction === 'delete' ? 1.2 : 1})`
              }}
            >
              <Trash2
                className={`w-5 h-5 transition-all duration-150 ${
                  activeAction === 'delete'
                    ? 'text-white drop-shadow-[0_1px_6px_rgba(244,63,94,0.9)] stroke-[2.2]'
                    : 'text-rose-500 dark:text-rose-400 stroke-[1.8]'
                }`}
              />
            </div>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
              style={{
                left: `${leftTextPos.x}px`,
                top: `${leftTextPos.y}px`,
                transform: `translate(-50%, -50%) scale(${activeAction === 'delete' ? 1.12 : 1})`
              }}
            >
              <span
                className={`text-xs tracking-wider transition-all duration-150 select-none ${
                  activeAction === 'delete'
                    ? 'text-white font-bold drop-shadow-[0_1px_4px_rgba(244,63,94,0.9)]'
                    : 'text-rose-600 dark:text-rose-300 font-semibold'
                }`}
              >
                删除
              </span>
            </div>

            {/* --- Center Sector: 延后 (Centerline -90°) --- */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
              style={{
                left: `${centerIconPos.x}px`,
                top: `${centerIconPos.y}px`,
                transform: `translate(-50%, -50%) scale(${activeAction === 'defer' || activeAction === 'planning' ? 1.2 : 1})`
              }}
            >
              <Clock
                className={`w-5 h-5 transition-all duration-150 ${
                  activeAction === 'defer' || activeAction === 'planning'
                    ? 'text-white drop-shadow-[0_1px_6px_rgba(245,158,11,0.9)] stroke-[2.2]'
                    : 'text-amber-500 dark:text-amber-400 stroke-[1.8]'
                }`}
              />
            </div>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
              style={{
                left: `${centerTextPos.x}px`,
                top: `${centerTextPos.y}px`,
                transform: `translate(-50%, -50%) scale(${activeAction === 'defer' || activeAction === 'planning' ? 1.12 : 1})`
              }}
            >
              <span
                className={`text-xs tracking-wider transition-all duration-150 select-none ${
                  activeAction === 'defer' || activeAction === 'planning'
                    ? 'text-white font-bold drop-shadow-[0_1px_4px_rgba(245,158,11,0.9)]'
                    : 'text-amber-600 dark:text-amber-300 font-semibold'
                }`}
              >
                延后
              </span>
            </div>

            {/* --- Right Sector: 完成 (Centerline -30°) --- */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
              style={{
                left: `${rightIconPos.x}px`,
                top: `${rightIconPos.y}px`,
                transform: `translate(-50%, -50%) scale(${activeAction === 'complete' ? 1.2 : 1})`
              }}
            >
              <Check
                className={`w-5 h-5 transition-all duration-150 ${
                  activeAction === 'complete'
                    ? 'text-white drop-shadow-[0_1px_6px_rgba(16,185,129,0.9)] stroke-[2.4]'
                    : 'text-emerald-500 dark:text-emerald-400 stroke-[2]'
                }`}
              />
            </div>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
              style={{
                left: `${rightTextPos.x}px`,
                top: `${rightTextPos.y}px`,
                transform: `translate(-50%, -50%) scale(${activeAction === 'complete' ? 1.12 : 1})`
              }}
            >
              <span
                className={`text-xs tracking-wider transition-all duration-150 select-none ${
                  activeAction === 'complete'
                    ? 'text-white font-bold drop-shadow-[0_1px_4px_rgba(16,185,129,0.9)]'
                    : 'text-emerald-600 dark:text-emerald-300 font-semibold'
                }`}
              >
                完成
              </span>
            </div>

            {/* Central Cancel Hub */}
            <div
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[56px] h-[56px] rounded-full backdrop-blur-2xl flex flex-col items-center justify-center pointer-events-none transition-all duration-200 ${
                isNearCancel
                  ? 'bg-rose-500/20 dark:bg-rose-500/25 border border-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.45)] scale-110'
                  : 'bg-white/80 dark:bg-neutral-900/80 border border-white/50 dark:border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.18)]'
              }`}
              style={{
                left: `${cx}px`,
                top: `${cy}px`
              }}
            >
              {isNearCancel && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1.35, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.1, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border border-rose-400/70"
                />
              )}

              <X
                className={`w-3.5 h-3.5 mb-0.5 transition-colors duration-150 ${
                  isNearCancel
                    ? 'text-rose-500 dark:text-rose-400 stroke-[2.4]'
                    : 'text-neutral-500 dark:text-neutral-400 stroke-[2]'
                }`}
              />
              <span
                className={`text-[9.5px] font-medium tracking-wider select-none leading-none transition-colors duration-150 ${
                  isNearCancel
                    ? 'text-rose-600 dark:text-rose-300 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {isNearCancel ? '松手取消' : '取消'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Task Element */}
        <motion.div
          layout
          initial={{
            left: cardRect.left,
            top: cardRect.top,
            width: cardRect.width,
            height: cardRect.height,
            borderRadius: 12,
            opacity: 1
          }}
          animate={
            isFinishing
              ? {
                  scale: 0.15,
                  opacity: 0,
                  left:
                    isFinishing === 'delete'
                      ? leftIconPos.x - 65
                      : isFinishing === 'defer' || isFinishing === 'planning'
                      ? centerIconPos.x - 65
                      : rightIconPos.x - 65,
                  top:
                    isFinishing === 'delete'
                      ? leftIconPos.y - 17
                      : isFinishing === 'defer' || isFinishing === 'planning'
                      ? centerIconPos.y - 17
                      : rightIconPos.y - 17
                }
              : isPacked
              ? {
                  left: currentPos.x - 65,
                  top: currentPos.y - 17,
                  width: 130,
                  height: 34,
                  borderRadius: 999,
                  opacity: 1,
                  scale: isNearCancel ? 0.94 : 1
                }
              : {
                  left: cardRect.left,
                  top: cardRect.top,
                  width: cardRect.width,
                  height: cardRect.height,
                  borderRadius: 12,
                  opacity: 1
                }
          }
          transition={{
            type: 'spring',
            stiffness: 440,
            damping: 30
          }}
          className="fixed pointer-events-none z-50 overflow-hidden shadow-xl"
        >
          <div
            className={`w-full h-full flex items-center px-3 transition-colors duration-150 backdrop-blur-2xl ${
              isPacked
                ? `rounded-full border ${
                    isNearCancel
                      ? 'border-dashed border-rose-400/80 bg-rose-950/60 dark:bg-rose-950/60 shadow-[0_2px_12px_rgba(244,63,94,0.3)] text-rose-300'
                      : activeAction === 'delete'
                      ? 'border-rose-400/75 bg-rose-500/20 shadow-[0_4px_18px_rgba(244,63,94,0.35)] text-white'
                      : activeAction === 'defer' || activeAction === 'planning'
                      ? 'border-amber-400/75 bg-amber-500/20 shadow-[0_4px_18px_rgba(245,158,11,0.35)] text-white'
                      : activeAction === 'complete'
                      ? 'border-emerald-400/75 bg-emerald-500/20 shadow-[0_4px_18px_rgba(16,185,129,0.35)] text-white'
                      : 'border-white/40 dark:border-white/15 bg-white/80 dark:bg-neutral-900/80 text-neutral-800 dark:text-neutral-200 shadow-lg'
                  }`
                : 'border border-white/30 dark:border-white/15 bg-white/90 dark:bg-neutral-900/90 rounded-xl text-[var(--text-main)] justify-between py-2 shadow-lg'
            }`}
          >
            {isPacked ? (
              <div className="flex items-center gap-2 w-full select-none">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors shadow-sm ${
                    isNearCancel
                      ? 'bg-rose-400 animate-pulse'
                      : activeAction === 'delete'
                      ? 'bg-rose-400'
                      : activeAction === 'defer' || activeAction === 'planning'
                      ? 'bg-amber-400'
                      : activeAction === 'complete'
                      ? 'bg-emerald-400'
                      : 'bg-[var(--accent-fg)] opacity-80'
                  }`}
                />
                <span className="text-[11.5px] font-medium truncate flex-1 leading-none">
                  {isNearCancel ? '松手取消' : task.title}
                </span>
              </div>
            ) : (
              <div className="w-full">
                <div className="text-sm font-semibold leading-snug line-clamp-1 text-[var(--text-main)]">
                  {task.title}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
