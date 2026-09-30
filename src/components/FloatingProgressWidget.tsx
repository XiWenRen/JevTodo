import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
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

  const [activityState, setActivityState] = useState<CompanionActivityState>('walking');
  const [animDur, setAnimDur] = useState<string>('1.1s');
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

  // 投喂成功后的美味满足表情气泡维持状态
  const [showFedThought, setShowFedThought] = useState(false);

  useEffect(() => {
    if (isChomping) {
      setShowFedThought(true);
      const timer = setTimeout(() => {
        setShowFedThought(false);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [isChomping]);

// 萌系伴侣专属想法表情 (纯净极简矢量设计，清爽治愈，告别油腻谄媚)
const CuteCompanionThought: React.FC<{ mood: 'wait' | 'magnet' | 'fed' }> = ({ mood }) => {
  if (mood === 'fed') {
    // 投喂完成：惬意从容闭眼放松，微抿笑意 ( - ◡ - )，安静治愈，不浮夸谄媚
    return (
      <div className="relative flex items-center justify-center w-5 h-3 text-[var(--text-main,#334155)]">
        <svg viewBox="0 0 24 14" className="w-5 h-3 overflow-visible">
          {/* 左眼：惬意细线弯月弧 */}
          <path d="M 4 7 Q 6.5 4.5 9 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {/* 右眼：惬意细线弯月弧 */}
          <path d="M 15 7 Q 17.5 4.5 20 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {/* 微抿的满足浅笑 */}
          <path d="M 10.5 9.5 Q 12 11 13.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (mood === 'magnet') {
    // 磁吸靠近：灵动好奇轻笑 (• ‿ •)，眼神清亮，自然期待
    return (
      <div className="relative flex items-center justify-center w-5 h-3 text-[var(--text-main,#334155)]">
        <svg viewBox="0 0 24 14" className="w-5 h-3 overflow-visible">
          {/* 清澈黑曜石豆豆眼（带纯净微白高光） */}
          <circle cx="6.5" cy="6.5" r="2" fill="currentColor" />
          <circle cx="5.9" cy="5.9" r="0.7" fill="#ffffff" />
          <circle cx="17.5" cy="6.5" r="2" fill="currentColor" />
          <circle cx="16.9" cy="5.9" r="0.7" fill="#ffffff" />
          {/* 自然微扬的浅笑嘴 */}
          <path d="M 10.5 9.5 Q 12 11 13.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 等待投喂 (wait)：清爽纯真小豆豆眼 (•  •)，安静陪伴
  return (
    <div className="relative flex items-center justify-center w-5 h-3 text-[var(--text-main,#334155)]">
      <svg viewBox="0 0 24 14" className="w-5 h-3 overflow-visible">
        {/* 清澈平静小圆眼 */}
        <circle cx="6.5" cy="6.5" r="1.8" fill="currentColor" />
        <circle cx="6" cy="6" r="0.6" fill="#ffffff" />
        <circle cx="17.5" cy="6.5" r="1.8" fill="currentColor" />
        <circle cx="17" cy="6" r="0.6" fill="#ffffff" />
        {/* 平静微翘的小三瓣猫嘴 */}
        <path d="M 10.2 9.5 Q 11.1 10.5 12 9.5 Q 12.9 10.5 13.8 9.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  );
};

  // 生成温暖自然的伴侣纯对话内容，将关键数据直接加粗高光内嵌在文案中
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
        content: (
          <span>
            {greeting}，今天清单里还没有安排待办，整个人都很清闲呢。随时在下方输入框添加新任务吧~
          </span>
        ),
        canOrganize: false
      };
    }

    if (remaining === 0) {
      return {
        greeting,
        content: (
          <span>
            {greeting}，今天规划的 <strong className="text-emerald-500 font-semibold">{totalTasksCount} 项工作</strong>已经全部完成啦{totalCherryCount > 0 ? <>（收获 🍒 <strong className="text-rose-500 font-semibold">{totalCherryCount} 颗樱桃</strong>）</> : null}！效率超高，快去休息一下吧 🎉 需要我帮你整理其他事情吗？
          </span>
        ),
        canOrganize: true
      };
    }

    if (completedTasksCount === 0) {
      return {
        greeting,
        content: (
          <span>
            {greeting}，今天共有 <strong className="text-amber-500 font-semibold">{totalTasksCount} 项待办</strong>待处理{overdueCount > 0 ? <>（其中 <strong className="text-rose-500 font-semibold">{overdueCount} 项已逾期</strong>）</> : null}。需要我帮你整理其他事情吗？
          </span>
        ),
        canOrganize: true
      };
    }

    return {
      greeting,
      content: (
        <span>
          {greeting}，你今天已经完成 <strong className="text-emerald-500 font-semibold">{completedTasksCount} 项工作</strong>{totalCherryCount > 0 ? <>（收获 🍒 <strong className="text-rose-500 font-semibold">{totalCherryCount} 颗樱桃</strong>）</> : null}，还剩 <strong className="text-amber-500 font-semibold">{remaining} 项待办</strong>{overdueCount > 0 ? <>（其中 <strong className="text-rose-500 font-semibold">{overdueCount} 项已逾期</strong>）</> : null}。需要我帮你整理其他事情吗？
        </span>
      ),
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

  // 当樱桃拖拽手势激活时，唤醒悬浮球宠物待命（高速跑动状态狂奔迎接樱桃）
  useEffect(() => {
    if (isGestureActive) {
      clearAllTimers();
      setActivityState('running');
      setAnimDur('0.36s');
    } else if (!isPopoverOpen && !isHovered) {
      startLinearSlowdown();
    }
  }, [isGestureActive]);

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

  // 鼠标离开：若气泡未展开且未处于投喂手势，才进入线性放慢步频 -> 站定 -> 趴下 -> 熟睡流程
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isPopoverOpen && !isGestureActive) {
      startLinearSlowdown();
    }
  };

  // 整理气泡关闭且鼠标未悬停时，若未处于投喂手势，也触发平滑线性减速入睡
  useEffect(() => {
    if (!isPopoverOpen && !isHovered && !isGestureActive && (activityState === 'walking' || activityState === 'running' || activityState === 'decelerating')) {
      startLinearSlowdown();
    }
  }, [isPopoverOpen, isHovered, isGestureActive]);

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
              } w-[220px] rounded-2xl px-3.5 py-2.5 z-[130] select-none shadow-2xl flex flex-col shrink-0 text-left`}
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

              {/* 对话正文：关键数据直接在文本中高亮，无关闭按钮无冗余空白，句末统一为循环图标按钮 */}
              <div className="text-xs text-[var(--text-sub)] leading-relaxed select-text">
                {dialogue.content}
                {dialogue.canOrganize && (
                  <button
                    type="button"
                    onClick={handleExecuteReorder}
                    className="inline-flex items-center justify-center w-5 h-5 ml-1.5 rounded-md bg-[var(--chip-bg)] hover:bg-[var(--chip-hover)] text-amber-500 hover:text-amber-400 border border-[var(--border-subtle)] transition-all active:scale-95 hover:scale-105 cursor-pointer align-middle shadow-2xs select-none"
                    title="整理其他事情"
                  >
                    <SlidersHorizontal className="w-2.5 h-2.5 stroke-[2.2]" />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 方案一温润呼吸光斑地台（去繁化简，衬托精灵球的物理弹跳） */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isGestureActive && !isChomping && (
          <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-visible">
            {/* 1. 伴侣身后柔和的暖心环境辉光 */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{
                scale: [0.95, 1.1, 0.95],
                opacity: [0.25, 0.45, 0.25]
              }}
              exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="absolute -inset-3 rounded-full blur-xl pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${activeSkin.accentColor || '#f59e0b'}45 0%, ${activeSkin.accentColor || '#f59e0b'}12 65%, transparent 100%)`
              }}
            />

            {/* 2. 伴侣脚下温润有机光斑地台 */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                scale: [0.95, 1.1, 0.95],
                opacity: [0.45, 0.75, 0.45]
              }}
              exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.18 } }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[72px] h-[20px] rounded-full blur-[4px] pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, ${activeSkin.accentColor || '#f59e0b'}80 0%, ${activeSkin.accentColor || '#f59e0b'}25 60%, transparent 85%)`
              }}
            />
          </div>
        )}

        {/* 宠物斜上方小想法气泡 (带尾巴小圆点，呈现更精致小巧的纯矢量萌表情) */}
        {((isGestureActive && !isChomping) || showFedThought) && (
          <motion.div
            key={showFedThought ? 'fed-thought' : isMagnetized ? 'magnet-thought' : 'wait-thought'}
            initial={{ opacity: 0, y: 4, scale: 0.6 }}
            animate={{ 
              opacity: 1, 
              y: [0, -2, 0],
              scale: showFedThought ? [1, 1.15, 1.02] : 1 
            }}
            exit={{ opacity: 0, y: -3, scale: 0.6, transition: { duration: 0.15 } }}
            transition={{
              y: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' },
              scale: { type: 'spring', stiffness: 450, damping: 24 }
            }}
            className={`absolute -top-7 ${isRightSide ? '-left-2 items-end' : '-right-2 items-start'} pointer-events-none select-none z-30 flex flex-col`}
          >
            {/* 想法主气泡 */}
            <div
              className="px-1.5 py-0.5 rounded-lg flex items-center justify-center shadow-md"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-panel) 96%, #ffffff 4%)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
              }}
            >
              <CuteCompanionThought mood={showFedThought ? 'fed' : isMagnetized ? 'magnet' : 'wait'} />
            </div>

            {/* 漫画风格的小想法尾巴圆点 (从气泡斜向指向宠物) */}
            <div className={`flex flex-col ${isRightSide ? 'items-end pr-1' : 'items-start pl-1'} gap-[1.5px] mt-[1.5px]`}>
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-panel) 96%, #ffffff 4%)',
                  border: '0.5px solid var(--border-subtle)'
                }} 
              />
              <span 
                className="w-1 h-1 rounded-full opacity-80" 
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--bg-panel) 96%, #ffffff 4%)',
                  border: '0.5px solid var(--border-subtle)'
                }} 
              />
            </div>
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

      {/* 跑轮伴侣主按钮 (支持神奇宝贝精灵球捕获弹跳晃动) */}
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
            ? { scale: [1, 1.28, 0.9, 1.12, 1], y: [0, -6, 0] }
            : isGestureActive
            ? {
                y: [0, -10, 2, -5, 1, 0, 0, 0, 0],
                rotate: [0, -12, 10, -7, 4, 0, 0, 0, 0],
                scale: [1, 1.07, 0.95, 1.03, 1, 1, 1, 1, 1]
              }
            : { scale: 1, y: 0, rotate: 0 }
        }
        transition={
          isChomping
            ? { duration: 0.45, ease: 'easeOut' }
            : isGestureActive
            ? {
                repeat: Infinity,
                duration: 2.8,
                ease: 'easeInOut',
                times: [0, 0.1, 0.22, 0.35, 0.45, 0.55, 0.75, 0.9, 1]
              }
            : { duration: 0.2 }
        }
        whileHover={{ scale: isGestureActive ? 1.08 : 1.08 }}
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

        {/* 球内宠物渲染层：保持原生自然质感与高帧率动画，去除生硬的角度拉扯与翻转 */}
        <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
          <CompanionWidget {...companionProps} />
        </div>
      </motion.button>
    </div>
  );
};
