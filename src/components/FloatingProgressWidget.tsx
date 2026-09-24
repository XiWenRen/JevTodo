import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { TaskItem } from '../types';
import { OrganizeOptions } from './JevOrganizeConfirmModal';
import { useActiveSkin } from '../plugins/skins/SkinRegistry';
import { CompanionRenderProps, CompanionActivityState } from '../plugins/skins/types';

interface FloatingProgressWidgetProps {
  tasks: TaskItem[];
  adviceSummary: string;
  overdueCount: number;
  staleCount?: number;
  rollForwardCount?: number;
  isCompactMode?: boolean;
  onConfirmOrganize: (options: OrganizeOptions) => void;
  onOpenConfirmModal?: () => void;
}

export const FloatingProgressWidget: React.FC<FloatingProgressWidgetProps> = ({
  tasks,
  adviceSummary: _adviceSummary,
  overdueCount,
  staleCount = 0,
  rollForwardCount = 0,
  isCompactMode = false,
  onConfirmOrganize
}) => {
  const { activeSkin } = useActiveSkin();
  const CompanionWidget = activeSkin.CompanionWidget;

  const [activityState, setActivityState] = useState<CompanionActivityState>('sleeping');
  const [animDur, setAnimDur] = useState<string>('1.4s');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  // 计算今日/核心任务进度
  const todayTasks = tasks.filter(t => t.category === '即刻完成');
  const totalTasksCount = todayTasks.length > 0 ? todayTasks.length : tasks.length;
  const completedTasksCount = todayTasks.length > 0 
    ? todayTasks.filter(t => t.completed).length 
    : tasks.filter(t => t.completed).length;

  const progressPercent = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 100;

  // 进度深度系数 0 ~ 1 (无任务完成时跑轮淡雅轻盈，随完成度加深显色润泽)
  const progressRatio = Math.max(0, Math.min(1, progressPercent / 100));

  const timerIdsRef = useRef<NodeJS.Timeout[]>([]);
  const isFirstMount = useRef<boolean>(true);
  const prevCompletedCountRef = useRef<number>(completedTasksCount);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // 清除所有调度定时器
  const clearAllTimers = () => {
    timerIdsRef.current.forEach(id => clearTimeout(id));
    timerIdsRef.current = [];
  };

  const scheduleStep = (fn: () => void, delayMs: number) => {
    const id = setTimeout(fn, delayMs);
    timerIdsRef.current.push(id);
    return id;
  };

  // 线性平滑减速直到站定，再慢慢趴下入睡：
  // 走 (walking) -> 线性放慢步频 (1.8s -> 2.6s -> 3.6s -> 4.8s) -> 站定 (stopped) -> 慢慢趴下 (settling) -> 安稳熟睡 (sleeping)
  const startLinearSlowdown = () => {
    clearAllTimers();
    setActivityState('slowing');

    // 线性递增动画周期，步频与跑轮由快到慢逐步减速
    // 第 1 档缓行: 1.8s
    setAnimDur('1.8s');

    scheduleStep(() => {
      // 第 2 档慢步: 2.6s
      setAnimDur('2.6s');

      scheduleStep(() => {
        // 第 3 档极慢收步: 3.6s
        setAnimDur('3.6s');

        scheduleStep(() => {
          // 第 4 档临近刹车: 4.8s
          setAnimDur('4.8s');

          scheduleStep(() => {
            // 第 5 档停下站定: 四足平稳落于底轨，身体挺拔自然 (800ms)
            setActivityState('stopped');

            scheduleStep(() => {
              // 第 6 档慢慢趴下: 肚皮轻落贴轨，四肢蜷曲内收，双眼半耷拉放松 (1200ms)
              setActivityState('settling');

              scheduleStep(() => {
                // 第 7 档安稳熟睡: 双眼完全闭合，进入轻柔呼吸循环，飘出 Zzz 气泡
                setActivityState('sleeping');
              }, 1200);
            }, 800);
          }, 900);
        }, 800);
      }, 700);
    }, 600);
  };

  // 完整平滑状态链路：冲刺跑 (1.8s) -> 慢跑减速 (1.0s) -> 轻松漫步 (1.2s) -> 线性放慢步频 -> 站定 -> 慢慢趴下 -> 安稳熟睡
  const startFullRunSequence = () => {
    clearAllTimers();

    // 阶段 1：飞快冲刺
    setActivityState('running');
    setAnimDur('0.34s');

    scheduleStep(() => {
      // 阶段 2：慢速缓跑
      setActivityState('decelerating');
      setAnimDur('0.72s');

      scheduleStep(() => {
        // 阶段 3：慢走漫步
        setActivityState('walking');
        setAnimDur('1.2s');

        scheduleStep(() => {
          // 阶段 4：若未 hover 且未打开整理气泡，开始线性减速入睡
          if (!isHovered && !isPopoverOpen) {
            startLinearSlowdown();
          }
        }, 1200);
      }, 1000);
    }, 1800);
  };

  // 任务完成时，驱动仓鼠高速冲刺狂奔带轮运转
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevCompletedCountRef.current = completedTasksCount;
      return;
    }

    if (completedTasksCount > prevCompletedCountRef.current) {
      startFullRunSequence();
    }
    prevCompletedCountRef.current = completedTasksCount;
  }, [completedTasksCount, isHovered, isPopoverOpen]);

  // 监听 ESC 键关闭气泡
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPopoverOpen) {
        setIsPopoverOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopoverOpen]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // 鼠标悬停：唤醒并开始轻快漫步
  const handleMouseEnter = () => {
    setIsHovered(true);
    clearAllTimers();
    if (activityState !== 'running' && activityState !== 'decelerating') {
      setActivityState('walking');
      setAnimDur('1.2s');
    }
  };

  // 鼠标离开：若气泡未展开，立即进入线性放慢步频 -> 站定 -> 趴下 -> 熟睡流程
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isPopoverOpen) {
      startLinearSlowdown();
    }
  };

  // 整理气泡关闭且鼠标未悬停时，也触发平滑线性减速入睡
  useEffect(() => {
    if (!isPopoverOpen && !isHovered && (activityState === 'walking' || activityState === 'running' || activityState === 'decelerating')) {
      startLinearSlowdown();
    }
  }, [isPopoverOpen]);

  // 点击悬浮球：启动冲刺飞奔序列 + 向左展开智能整理微型气泡
  const handleClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([16, 22]);
      } catch {}
    }

    startFullRunSequence();

    // 展开/收起向左气泡
    setIsPopoverOpen(prev => !prev);
  };

  // 仅执行流转
  const handleRollForwardOnly = () => {
    onConfirmOrganize({
      reorderTasks: false,
      deferOverdue: false,
      archiveStale: false,
      rollForwardDueTasks: true
    });
    setIsPopoverOpen(false);
  };

  const isStopped = activityState === 'stopped';
  const isSettling = activityState === 'settling';
  const isSleeping = activityState === 'sleeping';
  const isStationary = isStopped || isSettling || isSleeping;

  // -------------------------------------------------------------
  // 可拖拽悬浮球坐标管理与本地持久化 (localStorage)
  // -------------------------------------------------------------
  const STORAGE_KEY = 'cherry_floating_widget_coords_v2';

  const getDefaultPos = () => {
    if (typeof window === 'undefined') return { x: 300, y: 300 };
    const widgetWidth = isCompactMode ? 420 : 576;
    const rightEdge = Math.min(window.innerWidth - 8, (window.innerWidth / 2) + (widgetWidth / 2));
    const x = Math.max(10, Math.min(window.innerWidth - 58, rightEdge - 48));
    const y = Math.max(10, Math.min(window.innerHeight - 58, (window.innerHeight / 2) - 24));
    return { x, y };
  };

  const [coords, setCoords] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  // 窗口 resize 时安全钳制坐标在视口内
  useEffect(() => {
    const handleResize = () => {
      setCoords(prev => {
        if (!prev) return getDefaultPos();
        const clampedX = Math.max(8, Math.min(window.innerWidth - 56, prev.x));
        const clampedY = Math.max(8, Math.min(window.innerHeight - 56, prev.y));
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCompactMode]);

  const currentCoords = coords || getDefaultPos();
  const isRightSide = currentCoords.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 300);

  // 指针拖拽跟踪
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // 捕获指针以持续跟踪移动
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentCoords.x,
      initY: currentCoords.y
    };
    hasDraggedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (!hasDraggedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasDraggedRef.current = true;
      setIsPopoverOpen(false); // 拖拽时收起气泡
    }

    if (hasDraggedRef.current) {
      const nextX = Math.max(8, Math.min(window.innerWidth - 56, dragStartRef.current.initX + dx));
      const nextY = Math.max(8, Math.min(window.innerHeight - 56, dragStartRef.current.initY + dy));
      setCoords({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (hasDraggedRef.current) {
      // 保存拖拽后的终点位置到本地存储
      const finalX = Math.max(8, Math.min(window.innerWidth - 56, currentCoords.x));
      const finalY = Math.max(8, Math.min(window.innerHeight - 56, currentCoords.y));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: finalX, y: finalY }));
      } catch {}
    } else {
      // 纯点击触发切换气泡
      handleClick();
    }

    dragStartRef.current = null;
    hasDraggedRef.current = false;
  };

  const companionProps: CompanionRenderProps = {
    progressPercent,
    progressRatio,
    isAllCompleted: progressPercent === 100,
    activityState,
    animDur,
    isStationary,
    isStopped,
    isSettling,
    isSleeping,
    isHovered
  };

  const defaultButtonStyle: React.CSSProperties = {
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(progressRatio * 20)}%, #fef3c7 ${Math.round(progressRatio * 5)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: `0 ${2 + Math.round(progressRatio * 4)}px ${8 + Math.round(progressRatio * 10)}px rgba(0,0,0,${(0.1 + progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(progressRatio * 12)}px rgba(245, 158, 11, ${(progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + progressRatio * 0.22).toFixed(2)})`,
    transition: 'box-shadow 0.8s ease, background-color 0.8s ease'
  };

  const buttonStyle = activeSkin.getCompanionButtonStyle 
    ? activeSkin.getCompanionButtonStyle(companionProps) 
    : defaultButtonStyle;

  return (
    <div
      className="fixed z-40 select-none touch-none transition-none"
      style={{ left: `${currentCoords.x}px`, top: `${currentCoords.y}px` }}
    >
      {/* ========================================================= */}
      {/* 极简圆润椭圆形气泡：仅保留一个高对比度流转按钮，外圈进度边框 */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isPopoverOpen && (
          <>
            {/* 点击空白处自然收回气泡 */}
            <div 
              className="fixed inset-0 z-[120] cursor-default" 
              onClick={() => setIsPopoverOpen(false)}
            />

            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.9, x: isRightSide ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: isRightSide ? 8 : -8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className={`absolute top-1/2 -translate-y-1/2 ${
                isRightSide ? 'right-[54px]' : 'left-[54px]'
              } rounded-full p-1.5 z-[130] select-none shadow-2xl flex items-center shrink-0`}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-drawer) 97%, transparent)',
                backdropFilter: 'blur(32px) saturate(190%)',
                WebkitBackdropFilter: 'blur(32px) saturate(190%)',
                border: `2px solid color-mix(in srgb, #10b981 ${progressPercent}%, #f59e0b)`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {/* 指向悬浮球的气泡小尖角 (根据靠左/靠右自适应朝向) */}
              {isRightSide ? (
                <>
                  <div 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] pointer-events-none"
                    style={{ borderLeftColor: `color-mix(in srgb, #10b981 ${progressPercent}%, #f59e0b)` }}
                  />
                  <div 
                    className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] pointer-events-none"
                    style={{ borderLeftColor: 'color-mix(in srgb, var(--bg-drawer) 98%, transparent)' }}
                  />
                </>
              ) : (
                <>
                  <div 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] pointer-events-none"
                    style={{ borderRightColor: `color-mix(in srgb, #10b981 ${progressPercent}%, #f59e0b)` }}
                  />
                  <div 
                    className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] pointer-events-none"
                    style={{ borderRightColor: 'color-mix(in srgb, var(--bg-drawer) 98%, transparent)' }}
                  />
                </>
              )}

              {/* 唯一定义的单按钮：清晰高对比度仅流转待办 */}
              <button
                type="button"
                onClick={handleRollForwardOnly}
                className="h-8 px-4 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white active:scale-95 whitespace-nowrap tracking-wide"
              >
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{rollForwardCount > 0 ? `仅流转待办 (${rollForwardCount})` : '仅流转待办'}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 跑轮伴侣主按钮 (支持拖拽移动，周围环绕 SVG 进度边框圆环) */}
      {/* ========================================================= */}
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="relative w-[48px] h-[48px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing outline-none focus:outline-none select-none group z-10 overflow-visible touch-none"
        style={buttonStyle}
        title={`${activeSkin.name} · 今日完成率 ${progressPercent}% (可按住拖拽定位，点击展开流转气泡)`}
      >
        {/* 周围一圈动态指示进度的边框圆环 */}
        <svg className="absolute -inset-1 w-[56px] h-[56px] pointer-events-none -rotate-90">
          <circle
            cx="28"
            cy="28"
            r="23"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="2.5"
          />
          <circle
            cx="28"
            cy="28"
            r="23"
            fill="none"
            stroke="url(#hamster-progress-gradient)"
            strokeWidth="2.5"
            strokeDasharray={144.5}
            strokeDashoffset={144.5 - (144.5 * progressPercent) / 100}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="hamster-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        <CompanionWidget {...companionProps} />
      </motion.button>
    </div>
  );
};
