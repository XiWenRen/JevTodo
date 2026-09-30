import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
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
  isGestureActive?: boolean;
  isMagnetized?: boolean;
  isChomping?: boolean;
}

export const FloatingProgressWidget: React.FC<FloatingProgressWidgetProps> = ({
  tasks,
  adviceSummary: _adviceSummary,
  overdueCount,
  staleCount = 0,
  rollForwardCount = 0,
  isCompactMode = false,
  onConfirmOrganize,
  isGestureActive = false,
  isMagnetized = false,
  isChomping = false
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

  // 计算樱桃总专注完成次数
  const totalCherryCount = tasks.reduce((sum, t) => sum + (t.cherrySubtasks?.length || 0), 0);

  // 生成温暖自然的伴侣对话内容
  const getDialogueInfo = () => {
    const hour = new Date().getHours();
    let greeting = '你好主人';
    if (hour >= 5 && hour < 11) greeting = '早上好主人 ☀️';
    else if (hour >= 11 && hour < 13) greeting = '中午好主人 🌤️';
    else if (hour >= 13 && hour < 18) greeting = '下午好主人 ☕';
    else greeting = '晚上好主人 🌙';

    const remaining = Math.max(0, totalTasksCount - completedTasksCount);

    if (totalTasksCount === 0) {
      return {
        greeting,
        message: '今天还没有待办事项，整个人都很清闲呢~ 点击下方可以随时添加新任务！',
        buttonText: '开始规划待办',
        canOrganize: false
      };
    }

    if (remaining === 0) {
      return {
        greeting,
        message: `太棒了！今天规划的 ${totalTasksCount} 项工作已经全部顺利搞定，快去好好犒劳一下自己吧 🎉`,
        buttonText: '重新梳理待办',
        canOrganize: true
      };
    }

    if (completedTasksCount === 0) {
      return {
        greeting,
        message: `今天共有 ${totalTasksCount} 项工作待处理${overdueCount > 0 ? `，其中 ${overdueCount} 项已逾期` : ''}。需要我帮你按优先级梳理一下吗？`,
        buttonText: rollForwardCount > 0 ? `帮我整理待办 (${rollForwardCount})` : '帮我整理待办',
        canOrganize: true
      };
    }

    return {
      greeting,
      message: `你今天已经完成 ${completedTasksCount} 项工作，还剩 ${remaining} 项待办${overdueCount > 0 ? `（其中 ${overdueCount} 项已逾期）` : ''}。需要我帮你整理剩余任务吗？`,
      buttonText: rollForwardCount > 0 ? `帮我整理待办 (${rollForwardCount})` : '帮我整理待办',
      canOrganize: true
    };
  };

  const dialogue = getDialogueInfo();

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

  // 当樱桃拖拽手势激活时，唤醒悬浮球宠物待命
  useEffect(() => {
    if (isGestureActive) {
      clearAllTimers();
      setActivityState('running');
      setAnimDur(isMagnetized ? '0.36s' : '0.6s');
    } else if (!isPopoverOpen && !isHovered && activityState === 'running') {
      startLinearSlowdown();
    }
  }, [isGestureActive, isMagnetized]);

  // 当樱桃投喂吞食瞬间，触发高能冲刺狂奔
  useEffect(() => {
    if (isChomping) {
      startFullRunSequence();
    }
  }, [isChomping]);

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

  // 执行任务重排（包括任务重新排序、逾期顺延与待办流转）
  const handleExecuteReorder = () => {
    startFullRunSequence();
    onConfirmOrganize({
      reorderTasks: true,
      deferOverdue: overdueCount > 0,
      archiveStale: staleCount > 0,
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
      {/* ========================================================= */}
      {/* 质感对话框：无 title，低调现代配色，关键信息自然融入对话 */}
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
                isRightSide ? 'right-[58px]' : 'left-[58px]'
              } w-[228px] rounded-2xl p-3.5 z-[130] select-none shadow-2xl flex flex-col shrink-0 text-left`}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-panel) 96%, transparent)',
                backdropFilter: 'blur(28px) saturate(180%)',
                WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                border: '1px solid var(--border-medium)',
                boxShadow: '0 16px 36px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
            >
              {/* 指向悬浮球的气泡小尖角 (根据靠左/靠右自适应朝向) */}
              {isRightSide ? (
                <>
                  <div 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] pointer-events-none"
                    style={{ borderLeftColor: 'var(--border-medium)' }}
                  />
                  <div 
                    className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] pointer-events-none"
                    style={{ borderLeftColor: 'var(--bg-panel)' }}
                  />
                </>
              ) : (
                <>
                  <div 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] pointer-events-none"
                    style={{ borderRightColor: 'var(--border-medium)' }}
                  />
                  <div 
                    className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] pointer-events-none"
                    style={{ borderRightColor: 'var(--bg-panel)' }}
                  />
                </>
              )}

              {/* 对话框顶部微型状态与关闭按钮 (无大 Title，低调克制) */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-sub)]">
                  <span>{activeSkin.icon || '🐾'}</span>
                  <span className="font-medium text-[11px] text-[var(--text-main)] opacity-85">{activeSkin.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="p-1 -mr-1 rounded-full text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] transition-colors cursor-pointer"
                  title="关闭"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* 对话正文：问候语 + 关键进度与智能整理建议 */}
              <div className="space-y-1 my-0.5">
                <p className="text-xs font-semibold text-[var(--text-main)] leading-tight">
                  {dialogue.greeting}
                </p>
                <p className="text-[11.5px] text-[var(--text-sub)] leading-relaxed">
                  {dialogue.message}
                </p>
              </div>

              {/* 简单的整理操作按钮 (低调优雅，不招摇) */}
              <button
                type="button"
                onClick={handleExecuteReorder}
                className="w-full mt-2.5 py-1.5 px-3 rounded-xl text-xs font-medium text-[var(--text-main)] bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] active:scale-[0.98] border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
              >
                <span className="text-[12px] opacity-80">🪄</span>
                <span>{dialogue.buttonText}</span>
              </button>

              {/* 底部微型数据沉淀 (低调展示樱桃数与完成率) */}
              <div className="mt-2.5 pt-1.5 border-t border-[var(--border-subtle)]/60 flex items-center justify-between text-[10px] text-[var(--text-faint)] font-mono">
                <span>今日完成 {completedTasksCount}/{totalTasksCount} ({progressPercent}%)</span>
                {totalCherryCount > 0 && (
                  <span className="flex items-center gap-0.5 text-rose-400">
                    <span>🍒</span>
                    <span>{totalCherryCount}</span>
                  </span>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 跑轮伴侣主按钮 (支持拖拽移动，周围环绕 SVG 进度边框圆环) */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 跑轮伴侣主按钮 (支持拖拽移动，周围环绕 SVG 进度边框圆环) */}
      {/* ========================================================= */}
      {/* 投喂手势激活时的精致雷达光晕（精准对应 52px 磁吸捕获半径） */}
      <AnimatePresence>
        {isGestureActive && !isChomping && (
          <div className="absolute -inset-[26px] pointer-events-none z-0 flex items-center justify-center">
            {/* 1. 柔美漫反射星云光晕 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isMagnetized ? [1.02, 1.15, 1.05] : [0.92, 1.06, 0.92],
                opacity: isMagnetized ? [0.65, 0.9, 0.65] : [0.25, 0.45, 0.25]
              }}
              exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ repeat: Infinity, duration: isMagnetized ? 0.9 : 1.8, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full blur-md"
              style={{
                background: `radial-gradient(circle, ${activeSkin.accentColor || '#f59e0b'}50 0%, ${activeSkin.accentColor || '#f59e0b'}18 60%, transparent 100%)`
              }}
            />

            {/* 2. 精致外层雷达聚光环（精准对应 52px 磁吸捕获半径） */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{
                scale: isMagnetized ? 1.05 : 1,
                opacity: isMagnetized ? 1 : 0.75,
                rotate: 360
              }}
              exit={{ scale: 0.85, opacity: 0, transition: { duration: 0.15 } }}
              transition={{
                rotate: { repeat: Infinity, duration: isMagnetized ? 4 : 12, ease: 'linear' },
                scale: { type: 'spring', stiffness: 350, damping: 25 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0 rounded-full"
              style={{
                border: isMagnetized 
                  ? `2px solid ${activeSkin.accentColor || '#f59e0b'}` 
                  : `1.5px dashed ${activeSkin.accentColor || '#f59e0b'}88`,
                boxShadow: isMagnetized 
                  ? `0 0 18px ${activeSkin.accentColor || '#f59e0b'}80, inset 0 0 12px ${activeSkin.accentColor || '#f59e0b'}40` 
                  : `0 0 10px ${activeSkin.accentColor || '#f59e0b'}30`
              }}
            />

            {/* 3. 内层动态向心收缩脉冲波 */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                scale: isMagnetized ? [0.75, 1.05] : [0.85, 1.02],
                opacity: isMagnetized ? [0.6, 0] : [0.35, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{
                repeat: Infinity,
                duration: isMagnetized ? 0.75 : 1.4,
                ease: 'easeOut'
              }}
              className="absolute inset-1 rounded-full border border-white/40 pointer-events-none"
            />
          </div>
        )}

        {/* 宠物头顶单个生动表情气泡 (无文字，纯单个表情) */}
        {isGestureActive && !isChomping && (
          <motion.div
            key="halo-guide-emoji"
            initial={{ opacity: 0, y: 6, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              y: [0, -3, 0],
              scale: isMagnetized ? 1.25 : 1 
            }}
            exit={{ opacity: 0, y: 4, scale: 0.6, transition: { duration: 0.12 } }}
            transition={{
              y: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
              scale: { type: 'spring', stiffness: 450, damping: 24 }
            }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md pointer-events-none select-none z-30"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--bg-panel) 90%, transparent)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
            }}
          >
            <span>{isMagnetized ? '😋' : '🍒'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 投喂命中瞬间的纯视觉华丽完成动效 (无闪烁文字，纯特效) */}
      <AnimatePresence>
        {isChomping && (
          <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
            {/* 1. 中心向外扩展并消散的透明光波环 */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute w-[48px] h-[48px] rounded-full border-2 border-amber-400"
              style={{
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.7)'
              }}
            />

            {/* 2. 核心闪烁柔光球 */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.9 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute w-[48px] h-[48px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, rgba(244, 63, 94, 0.3) 60%, transparent 100%)'
              }}
            />

            {/* 3. 八方向放射散落的喜悦粒子与星光花瓣 */}
            {[
              { icon: '✨', angle: 0, dist: 38 },
              { icon: '🌸', angle: 45, dist: 34 },
              { icon: '💖', angle: 90, dist: 40 },
              { icon: '🍒', angle: 135, dist: 36 },
              { icon: '✨', angle: 180, dist: 38 },
              { icon: '⭐', angle: 225, dist: 34 },
              { icon: '💖', angle: 270, dist: 40 },
              { icon: '✨', angle: 315, dist: 36 }
            ].map((p, idx) => {
              const rad = (p.angle * Math.PI) / 180;
              const targetX = Math.cos(rad) * p.dist;
              const targetY = Math.sin(rad) * p.dist;

              return (
                <motion.span
                  key={idx}
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                  animate={{
                    x: targetX,
                    y: targetY,
                    scale: [0.3, 1.25, 0.4],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                  className="absolute text-xs select-none pointer-events-none drop-shadow-sm"
                >
                  {p.icon}
                </motion.span>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        id="floating-companion-ball"
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={
          isChomping
            ? { scale: [1, 1.28, 0.9, 1.12, 1] }
            : (isGestureActive && isMagnetized)
            ? { scale: 1.16 }
            : isGestureActive
            ? { scale: 1.05 }
            : { scale: 1 }
        }
        transition={{
          duration: isChomping ? 0.45 : 0.2,
          ease: 'easeOut'
        }}
        whileHover={{ scale: isGestureActive ? 1.16 : 1.08 }}
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
