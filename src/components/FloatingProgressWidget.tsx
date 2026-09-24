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

  // 执行整理确认
  const handleExecute = () => {
    onConfirmOrganize({
      reorderTasks: true,
      deferOverdue: overdueCount > 0,
      archiveStale: staleCount > 0,
      rollForwardDueTasks: rollForwardCount > 0
    });
    setIsPopoverOpen(false);
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

  // 定位于主卡片右边缘外部浮动
  const leftPosCalc = isCompactMode
    ? 'calc(min(calc(100vw - 8px), calc(50% + 210px)) - 48px)'
    : 'calc(min(calc(100vw - 8px), calc(50% + 288px)) - 48px)';

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
    border: `${(1.2 + progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(progressRatio * 60)}%, #f59e0b ${Math.round(progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(progressRatio * 4)}px ${8 + Math.round(progressRatio * 10)}px rgba(0,0,0,${(0.1 + progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(progressRatio * 12)}px rgba(245, 158, 11, ${(progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  };

  const buttonStyle = activeSkin.getCompanionButtonStyle 
    ? activeSkin.getCompanionButtonStyle(companionProps) 
    : defaultButtonStyle;

  return (
    <div
      className="fixed z-40 top-[50%] -translate-y-1/2 transition-all duration-300 select-none"
      style={{ left: leftPosCalc }}
    >
      {/* ========================================================= */}
      {/* 从悬浮球向左丝滑展开的气泡弹窗 (直接锚定在悬浮球左侧) */}
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
              initial={{ opacity: 0, scale: 0.9, x: 14 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              transition={{ type: 'spring', stiffness: 480, damping: 30 }}
              className="absolute right-[52px] top-1/2 -translate-y-1/2 w-[226px] rounded-xl border p-3 z-[130] select-none text-left"
              style={{
                transformOrigin: 'right center',
                backgroundColor: 'color-mix(in srgb, var(--bg-drawer) 97%, transparent)',
                backdropFilter: 'blur(32px) saturate(190%)',
                WebkitBackdropFilter: 'blur(32px) saturate(190%)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-main)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
            >
              {/* 向右指向小仓鼠悬浮球的气泡小尖角 */}
              <div 
                className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] pointer-events-none"
                style={{ borderLeftColor: 'var(--border-medium)' }}
              />
              <div 
                className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4.5px] border-y-transparent border-l-[5px] pointer-events-none"
                style={{ borderLeftColor: 'color-mix(in srgb, var(--bg-drawer) 98%, transparent)' }}
              />

              {/* 头部：标题、进度与关闭 */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11.5px] font-semibold text-[var(--text-main)]">
                    Jev 智能整理
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-amber-500 font-bold">
                    {progressPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(false)}
                    className="p-0.5 rounded text-[var(--text-faint)] hover:text-[var(--text-main)] hover:bg-[var(--chip-hover)] transition-colors cursor-pointer"
                    title="关闭"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 微型进度条 */}
              <div className="w-full h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 核心提示单行化 */}
              <div className="text-[11px] text-[var(--text-sub)] leading-snug mb-2.5">
                {overdueCount > 0 ? (
                  <span>
                    重排顺序，顺延 <b className="text-amber-500 font-medium">{overdueCount}项逾期</b> 至明日
                  </span>
                ) : (
                  <span>按紧迫度与时间维度智能重排执行顺序</span>
                )}
              </div>

              {/* 流转待办极简条目 */}
              {rollForwardCount > 0 && (
                <div className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-md mb-2 flex items-center justify-between">
                  <span>今日待流转:</span>
                  <span className="font-semibold underline">{rollForwardCount} 项</span>
                </div>
              )}

              {/* 精简操作按钮组 */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleExecute}
                  className="w-full h-7 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition-all active:scale-[0.98] cursor-pointer hover:opacity-90 border"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-fg)',
                    borderColor: 'var(--btn-primary-border)',
                    boxShadow: 'var(--btn-primary-shadow)'
                  }}
                >
                  <Check className="w-3 h-3" />
                  <span>{rollForwardCount > 0 ? `整理并流转 (${rollForwardCount})` : '立即整理'}</span>
                </button>

                {rollForwardCount > 0 && (
                  <button
                    type="button"
                    onClick={handleRollForwardOnly}
                    className="w-full h-6 rounded-md font-medium text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/25"
                  >
                    <ArrowRight className="w-2.5 h-2.5 text-cyan-400" />
                    <span>仅流转 ({rollForwardCount})</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 跑轮伴侣主按钮 (皮肤插件渲染伴侣形象与动态光效) */}
      {/* ========================================================= */}
      <motion.button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="relative w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer outline-none focus:outline-none group z-10 overflow-visible"
        style={buttonStyle}
        title={`${activeSkin.name} · 今日完成率 ${progressPercent}% (点击展开智能整理气泡)`}
      >
        <CompanionWidget {...companionProps} />
      </motion.button>
    </div>
  );
};
