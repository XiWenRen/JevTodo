import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { TaskItem } from '../types';
import { OrganizeOptions } from './JevOrganizeConfirmModal';

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

type HamsterActivityState = 
  | 'running' 
  | 'decelerating' 
  | 'walking' 
  | 'slowing' 
  | 'stopped' 
  | 'settling' 
  | 'sleeping';

export const FloatingProgressWidget: React.FC<FloatingProgressWidgetProps> = ({
  tasks,
  adviceSummary: _adviceSummary,
  overdueCount,
  staleCount = 0,
  rollForwardCount = 0,
  isCompactMode = false,
  onConfirmOrganize
}) => {
  const [activityState, setActivityState] = useState<HamsterActivityState>('sleeping');
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

  return (
    <div
      className="fixed z-40 top-[50%] -translate-y-1/2 transition-all duration-300 select-none"
      style={{ left: leftPosCalc }}
    >
      <style>{`
        /* ============================================================ */
        /* 世界著名开源纯 CSS 跑轮仓鼠 (方案四：无形轨道 · 奔跑能量流光版) */
        /* ============================================================ */
        .kinetic-energy-comet {
          position: absolute;
          inset: -2.5px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 110deg,
            rgba(245, 158, 11, 0.2) 200deg,
            rgba(245, 158, 11, 0.75) 290deg,
            #fbbf24 335deg,
            #fef08a 355deg,
            #ffffff 360deg
          );
          -webkit-mask: radial-gradient(circle, transparent 20px, black 21.5px);
          mask: radial-gradient(circle, transparent 20px, black 21.5px);
          animation: wheelSpinClockwise 0.4s linear infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.6));
          z-index: 5;
        }

        .kantner-hamster-wheel {
          --dur: ${animDur};
          position: relative;
          width: 12em;
          height: 12em;
          font-size: 3.35px;
          pointer-events: none;
        }

        .kantner-hamster-wheel .wheel-track,
        .kantner-hamster-wheel .wheel-spinner,
        .kantner-hamster-wheel .hamster-facing-right,
        .kantner-hamster-wheel .hamster-unit,
        .kantner-hamster-wheel .hamster-unit div {
          position: absolute;
        }

        /* 1. 平滑水晶跑轮外轨 (去除辐条遮挡，质感随今日完成度逐渐加深) */
        .kantner-hamster-wheel .wheel-track {
          border-radius: 50%;
          inset: 0;
          z-index: 1;
          opacity: ${(0.28 + progressRatio * 0.72).toFixed(2)};
          background: radial-gradient(100% 100% at center, transparent 48%, hsla(38, ${Math.round(35 + progressRatio * 50)}%, ${Math.round(88 - progressRatio * 10)}%, ${(0.15 + progressRatio * 0.65).toFixed(2)}) 48.5%);
          border: ${(0.18 + progressRatio * 0.1).toFixed(2)}em solid rgba(245, 158, 11, ${(0.16 + progressRatio * 0.68).toFixed(2)});
          box-shadow: inset 0 0 ${(0.3 + progressRatio * 0.4).toFixed(2)}em rgba(245, 158, 11, ${(0.05 + progressRatio * 0.22).toFixed(2)});
          transition: opacity 0.8s ease, border 0.8s ease, box-shadow 0.8s ease;
        }

        /* 2. 顺时针旋转跑轮本体 (微透水晶高光 + 4处微型外沿防滑块) */
        .kantner-hamster-wheel .wheel-spinner {
          inset: 0;
          border-radius: 50%;
          z-index: 2;
          animation: wheelSpinClockwise var(--dur) linear infinite;
          transform-origin: 50% 50%;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          pointer-events: none;
        }

        /* 静止态 (停下站定 / 慢慢趴下 / 熟睡)：停止四肢与躯干的关键帧摇摆动画，由 CSS transition 接管平滑姿态 */
        .kantner-hamster-wheel.is-stationary .hamster__head,
        .kantner-hamster-wheel.is-stationary .hamster__ear,
        .kantner-hamster-wheel.is-stationary .hamster__eye,
        .kantner-hamster-wheel.is-stationary .hamster__body,
        .kantner-hamster-wheel.is-stationary .hamster__limb--fr,
        .kantner-hamster-wheel.is-stationary .hamster__limb--fl,
        .kantner-hamster-wheel.is-stationary .hamster__limb--br,
        .kantner-hamster-wheel.is-stationary .hamster__limb--bl,
        .kantner-hamster-wheel.is-stationary .hamster__tail {
          animation: none !important;
        }

        /* 跑轮反光晶莹弧光 (随着完成度提高，高光更加饱满透亮) */
        .kantner-hamster-wheel .wheel-specular {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          opacity: ${(0.3 + progressRatio * 0.7).toFixed(2)};
          background: conic-gradient(
            from 30deg,
            transparent 0deg,
            rgba(255, 255, 255, ${(0.15 + progressRatio * 0.28).toFixed(2)}) 25deg,
            rgba(255, 255, 255, 0.05) 50deg,
            transparent 75deg,
            transparent 180deg,
            rgba(245, 158, 11, ${(0.1 + progressRatio * 0.25).toFixed(2)}) 210deg,
            transparent 240deg
          );
          -webkit-mask: radial-gradient(circle, transparent 5.1em, black 5.3em);
          mask: radial-gradient(circle, transparent 5.1em, black 5.3em);
          transition: opacity 0.8s ease;
        }

        /* 4处微型外沿防滑块 (随完成度加深显色) */
        .kantner-hamster-wheel .wheel-grip {
          position: absolute;
          border-radius: 0.12em;
          background: rgba(245, 158, 11, ${(0.22 + progressRatio * 0.72).toFixed(2)});
          box-shadow: 0 0 2px rgba(245, 158, 11, ${(0.12 + progressRatio * 0.58).toFixed(2)});
          transition: background 0.8s ease, box-shadow 0.8s ease;
        }
        .kantner-hamster-wheel .wheel-grip-t {
          top: 0.08em;
          left: 50%;
          transform: translateX(-50%);
          width: 0.9em;
          height: 0.22em;
        }
        .kantner-hamster-wheel .wheel-grip-b {
          bottom: 0.08em;
          left: 50%;
          transform: translateX(-50%);
          width: 0.9em;
          height: 0.22em;
        }
        .kantner-hamster-wheel .wheel-grip-l {
          left: 0.08em;
          top: 50%;
          transform: translateY(-50%);
          width: 0.22em;
          height: 0.9em;
        }
        .kantner-hamster-wheel .wheel-grip-r {
          right: 0.08em;
          top: 50%;
          transform: translateY(-50%);
          width: 0.22em;
          height: 0.9em;
        }

        @keyframes wheelSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* 3. 仓鼠朝向右侧奔跑容器 (水平镜像朝右，顺时针驱动跑轮) */
        .kantner-hamster-wheel .hamster-facing-right {
          inset: 0;
          transform: scaleX(-1);
          transform-origin: 50% 50%;
          z-index: 3;
        }

        /* 仓鼠本体 */
        .kantner-hamster-wheel .hamster-unit {
          top: 50%;
          left: calc(50% - 3.5em);
          width: 7em;
          height: 3.75em;
          transform: rotate(4deg) translate(-0.8em, 1.85em);
          transform-origin: 50% 0;
          animation: hamsterAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 阶段 5：线性减速后停下站定 (四足平稳落于跑轮底轨，身体端正自然) */
        .kantner-hamster-wheel.is-stopped .hamster-unit {
          transform: rotate(3deg) translate(-0.8em, 1.95em);
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 阶段 6：慢慢趴下收爪 (身体沉向跑道，四肢缩进腹下，眼皮半耷拉) */
        .kantner-hamster-wheel.is-settling .hamster-unit {
          transform: rotate(1deg) translate(-0.8em, 2.22em);
          transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 阶段 7：安稳熟睡呼吸 (完全放松闭眼，胸腹柔和起伏) */
        .kantner-hamster-wheel.is-sleeping .hamster-unit {
          transform: rotate(0deg) translate(-0.8em, 2.25em);
          animation: hamsterSleepBreath 2.8s ease-in-out infinite !important;
          transition: transform 0.8s ease;
        }

        @keyframes hamsterSleepBreath {
          0%, 100% { transform: rotate(0deg) translate(-0.8em, 2.25em) scale(1, 0.96); }
          50% { transform: rotate(0deg) translate(-0.8em, 2.33em) scale(0.98, 1.02); }
        }

        /* 仓鼠头部 */
        .kantner-hamster-wheel .hamster__head {
          animation: hamsterHeadAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: hsl(30,90%,55%);
          border-radius: 70% 30% 0 100% / 40% 25% 25% 60%;
          box-shadow: 0 -0.25em 0 hsl(30,90%,80%) inset,
                      0.75em -1.55em 0 hsl(30,90%,90%) inset;
          top: 0;
          left: -2em;
          width: 2.75em;
          height: 2.5em;
          transform-origin: 100% 50%;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel.is-stopped .hamster__head {
          transform: rotate(2deg) translateY(0);
          transition: transform 0.5s ease-out;
        }
        .kantner-hamster-wheel.is-settling .hamster__head {
          transform: rotate(1deg) translateY(0.12em);
          transition: transform 0.8s ease;
        }
        .kantner-hamster-wheel.is-sleeping .hamster__head {
          transform: rotate(0deg) translateY(0.18em);
          transition: transform 0.8s ease;
        }

        /* 耳朵 */
        .kantner-hamster-wheel .hamster__ear {
          animation: hamsterEarAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: hsl(0,90%,85%);
          border-radius: 50%;
          box-shadow: -0.25em 0 hsl(30,90%,55%) inset;
          top: -0.25em;
          right: -0.25em;
          width: 0.75em;
          height: 0.75em;
          transform-origin: 50% 75%;
          transition: transform 0.6s ease;
        }

        /* 眼睛 (清醒睁眼 -> 慢慢半眯 -> 闭目熟睡) */
        .kantner-hamster-wheel .hamster__eye {
          animation: hamsterEyeAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background-color: hsl(0,0%,0%);
          border-radius: 50%;
          top: 0.375em;
          left: 1.25em;
          width: 0.55em;
          height: 0.55em;
          transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 停下站定：双目圆睁专注 */
        .kantner-hamster-wheel.is-stopped .hamster__eye {
          height: 0.55em;
          border-radius: 50%;
          transform: none;
          background-color: hsl(0,0%,0%);
          transition: all 0.5s ease-out;
        }

        /* 慢慢趴下：眼睛半闭，眼神柔和放松 */
        .kantner-hamster-wheel.is-settling .hamster__eye {
          height: 0.24em;
          border-radius: 0.12em;
          background-color: hsl(30,80%,25%);
          transform: translateY(0.12em);
          transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 睡着：眼皮完全闭合 */
        .kantner-hamster-wheel.is-sleeping .hamster__eye {
          height: 0.12em;
          border-radius: 0.06em;
          background-color: hsl(30,90%,30%);
          transform: translateY(0.2em);
          transition: all 0.6s ease;
        }

        /* 鼻子 */
        .kantner-hamster-wheel .hamster__nose {
          background: hsl(0,90%,75%);
          border-radius: 35% 65% 85% 15% / 70% 50% 50% 30%;
          top: 0.75em;
          left: 0;
          width: 0.25em;
          height: 0.28em;
        }

        /* 躯干 */
        .kantner-hamster-wheel .hamster__body {
          animation: hamsterBodyAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: hsl(30,90%,90%);
          border-radius: 50% 30% 50% 30% / 15% 60% 40% 40%;
          box-shadow: 0.1em 0.75em 0 hsl(30,90%,55%) inset,
                      0.15em -0.5em 0 hsl(30,90%,80%) inset;
          top: 0.25em;
          left: 2em;
          width: 4.5em;
          height: 3em;
          transform-origin: 17% 50%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel.is-stopped .hamster__body {
          transform: rotate(0deg);
        }
        .kantner-hamster-wheel.is-settling .hamster__body {
          transform: rotate(0deg);
        }
        .kantner-hamster-wheel.is-sleeping .hamster__body {
          transform: rotate(0deg);
        }

        /* 前肢 (FR / FL) */
        .kantner-hamster-wheel .hamster__limb--fr,
        .kantner-hamster-wheel .hamster__limb--fl {
          clip-path: polygon(0 0,100% 0,70% 80%,60% 100%,0% 100%,40% 80%);
          top: 2em;
          left: 0.5em;
          width: 1em;
          height: 1.5em;
          transform-origin: 50% 0;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel .hamster__limb--fr {
          animation: hamsterFRLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,80%) 80%,hsl(0,90%,75%) 80%);
          transform: rotate(15deg) translateZ(-1px);
        }

        .kantner-hamster-wheel .hamster__limb--fl {
          animation: hamsterFLLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,90%) 80%,hsl(0,90%,85%) 80%);
          transform: rotate(15deg);
        }

        /* 停下站定：双前肢微屈端正落于底轨 */
        .kantner-hamster-wheel.is-stopped .hamster__limb--fr {
          transform: rotate(8deg) translateY(0.02em);
        }
        .kantner-hamster-wheel.is-stopped .hamster__limb--fl {
          transform: rotate(6deg) translateY(0.02em);
        }

        /* 慢慢趴下收爪 */
        .kantner-hamster-wheel.is-settling .hamster__limb--fr,
        .kantner-hamster-wheel.is-settling .hamster__limb--fl {
          transform: rotate(4deg) translateY(0.16em) scaleY(0.85);
        }

        /* 睡眠时四肢收缩进腹下 */
        .kantner-hamster-wheel.is-sleeping .hamster__limb--fr,
        .kantner-hamster-wheel.is-sleeping .hamster__limb--fl {
          transform: rotate(2deg) translateY(0.22em) scaleY(0.68);
        }

        /* 后肢 (BR / BL) */
        .kantner-hamster-wheel .hamster__limb--br,
        .kantner-hamster-wheel .hamster__limb--bl {
          border-radius: 0.75em 0.75em 0 0;
          clip-path: polygon(0 0,100% 0,100% 30%,70% 90%,70% 100%,30% 100%,40% 90%,0% 30%);
          top: 1em;
          left: 2.8em;
          width: 1.5em;
          height: 2.5em;
          transform-origin: 50% 30%;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel .hamster__limb--br {
          animation: hamsterBRLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,80%) 90%,hsl(0,90%,75%) 90%);
          transform: rotate(-25deg) translateZ(-1px);
        }

        .kantner-hamster-wheel .hamster__limb--bl {
          animation: hamsterBLLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,90%) 90%,hsl(0,90%,85%) 90%);
          transform: rotate(-25deg);
        }

        /* 停下站定：双后肢平稳支撑底轨 */
        .kantner-hamster-wheel.is-stopped .hamster__limb--br {
          transform: rotate(-12deg) translateY(0.02em);
        }
        .kantner-hamster-wheel.is-stopped .hamster__limb--bl {
          transform: rotate(-10deg) translateY(0.02em);
        }

        /* 慢慢趴下收爪 */
        .kantner-hamster-wheel.is-settling .hamster__limb--br,
        .kantner-hamster-wheel.is-settling .hamster__limb--bl {
          transform: rotate(-10deg) translateY(0.12em) scaleY(0.85);
        }

        /* 睡眠时四肢收缩进腹下 */
        .kantner-hamster-wheel.is-sleeping .hamster__limb--br,
        .kantner-hamster-wheel.is-sleeping .hamster__limb--bl {
          transform: rotate(-8deg) translateY(0.18em) scaleY(0.68);
        }

        /* 尾巴 */
        .kantner-hamster-wheel .hamster__tail {
          animation: hamsterTailAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: hsl(0,90%,85%);
          border-radius: 0.25em 50% 50% 0.25em;
          box-shadow: 0 -0.2em 0 hsl(0,90%,75%) inset;
          top: 1.5em;
          right: -0.5em;
          width: 1em;
          height: 0.5em;
          transform: rotate(30deg) translateZ(-1px);
          transform-origin: 0.25em 0.25em;
          transition: transform 0.6s ease;
        }

        .kantner-hamster-wheel.is-stopped .hamster__tail {
          transform: rotate(24deg);
        }
        .kantner-hamster-wheel.is-settling .hamster__tail {
          transform: rotate(16deg);
        }
        .kantner-hamster-wheel.is-sleeping .hamster__tail {
          transform: rotate(12deg);
        }

        @keyframes hamsterAnim {
          from, to { transform: rotate(4deg) translate(-0.8em,1.85em); }
          50% { transform: rotate(0) translate(-0.8em,1.85em); }
        }

        @keyframes hamsterHeadAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(8deg); }
        }

        @keyframes hamsterEyeAnim {
          from, 90%, to { transform: scaleY(1); }
          95% { transform: scaleY(0); }
        }

        @keyframes hamsterEarAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(12deg); }
        }

        @keyframes hamsterBodyAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(-2deg); }
        }

        @keyframes hamsterFRLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(50deg) translateZ(-1px); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(-30deg) translateZ(-1px); }
        }

        @keyframes hamsterFLLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(-30deg); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(50deg); }
        }

        @keyframes hamsterBRLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(-60deg) translateZ(-1px); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(20deg) translateZ(-1px); }
        }

        @keyframes hamsterBLLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(20deg); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(-60deg); }
        }

        @keyframes hamsterTailAnim {
          from, 25%, 50%, 75%, to { transform: rotate(30deg) translateZ(-1px); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(10deg) translateZ(-1px); }
        }

        /* 熟睡飘出的梦幻 Zzz 浮动微光气泡 */
        @keyframes zzz-float-a {
          0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
          40% { opacity: 0.95; }
          100% { opacity: 0; transform: translate(6px, -12px) scale(1.18); }
        }
        @keyframes zzz-float-b {
          0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
          40% { opacity: 0.95; }
          100% { opacity: 0; transform: translate(9px, -17px) scale(1.28); }
        }
      `}</style>

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
      {/* 跑轮仓鼠主按钮 (方案四进阶：质感随任务完成度加深) */}
      {/* ========================================================= */}
      <motion.button
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        className="relative w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer outline-none focus:outline-none group z-10 overflow-visible"
        style={{
          backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(progressRatio * 20)}%, #fef3c7 ${Math.round(progressRatio * 5)}%)`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `${(1.2 + progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(progressRatio * 60)}%, #f59e0b ${Math.round(progressRatio * 55)}%)`,
          boxShadow: `0 ${2 + Math.round(progressRatio * 4)}px ${8 + Math.round(progressRatio * 10)}px rgba(0,0,0,${(0.1 + progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(progressRatio * 12)}px rgba(245, 158, 11, ${(progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + progressRatio * 0.22).toFixed(2)})`,
          transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
        }}
        title={`跑轮小仓鼠 · 今日完成率 ${progressPercent}% (点击展开智能整理气泡)`}
      >
        {/* 奔跑冲刺时激发的无形轨道动态能量流光 (平时完全隐形，奔跑时顺时针甩出彗星光弧) */}
        <div
          className="kinetic-energy-comet"
          style={{
            opacity: activityState === 'running' ? 1 : activityState === 'decelerating' ? 0.35 : 0,
            transition: 'opacity 0.6s ease, transform 0.4s cubic-bezier(0.34, 1.25, 0.64, 1)',
            transform: activityState === 'running' ? 'scale(1)' : 'scale(0.95)'
          }}
        />

        {/* 冲刺飞奔时在跑轮外围闪烁的微型星芒粒子 */}
        {activityState === 'running' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <span 
              className="absolute -top-1.5 -right-0.5 text-[10px] text-amber-400 font-bold animate-pulse"
              style={{ animationDuration: '0.6s' }}
            >
              ✦
            </span>
            <span 
              className="absolute -bottom-1 -left-0.5 text-[8px] text-yellow-300 font-bold animate-pulse"
              style={{ animationDuration: '0.9s' }}
            >
              ✦
            </span>
          </div>
        )}

        {/* Jon Kantner 经典纯 CSS 跑轮仓鼠容器 (支持冲刺、慢步、线性减速、站定、趴下、熟睡) */}
        <div className={`kantner-hamster-wheel ${isStationary ? 'is-stationary' : ''} ${isSleeping ? 'is-sleeping' : isSettling ? 'is-settling' : isStopped ? 'is-stopped' : ''}`}>
          {/* 1. 原版平滑跑轮外轨 */}
          <div className="wheel-track"></div>

          {/* 2. 顺时针旋转跑轮本体 (微透水晶高光 + 4处微型外沿防滑抓齿) */}
          <div className="wheel-spinner">
            <div className="wheel-specular" />
            <div className="wheel-grip wheel-grip-t" />
            <div className="wheel-grip wheel-grip-r" />
            <div className="wheel-grip wheel-grip-b" />
            <div className="wheel-grip wheel-grip-l" />
          </div>

          {/* 3. 仓鼠朝右奔跑角色容器 (水平镜像朝右，顺时针驱动跑轮) */}
          <div className="hamster-facing-right">
            <div className="hamster-unit">
              <div className="hamster__body">
                <div className="hamster__head">
                  <div className="hamster__ear"></div>
                  <div className="hamster__eye"></div>
                  <div className="hamster__nose"></div>
                </div>
                <div className="hamster__limb hamster__limb--fr"></div>
                <div className="hamster__limb hamster__limb--fl"></div>
                <div className="hamster__limb hamster__limb--br"></div>
                <div className="hamster__limb hamster__limb--bl"></div>
                <div className="hamster__tail"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 熟睡飘出的 Zzz 气泡 (仅在完全睡着时浮出，位于朝右睡熟的仓鼠鼻头右上方) */}
        {isSleeping && (
          <div className="absolute top-1 right-2 pointer-events-none font-mono font-bold select-none z-20">
            <span 
              className="absolute text-[8px] text-amber-500/90 font-bold"
              style={{ animation: 'zzz-float-a 2.4s infinite' }}
            >
              z
            </span>
            <span 
              className="absolute text-[6px] text-amber-400/90 font-bold left-1.5 -top-1"
              style={{ animation: 'zzz-float-b 2.4s 0.8s infinite' }}
            >
              z
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
};
