import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem as ITaskItem } from '../types';
import { CardRect } from './TaskItem';
import { CherryIcon } from './CherryIcon';

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
  onTargetChange?: (target: GestureActionType) => void;
  onChompChange?: (chomp: GestureActionType | null) => void;
  onJumpChange?: (jump: GestureActionType | null) => void;
}

// ==========================================
// 统一高品质卡通樱桃展示组件
// ==========================================
interface UnifiedCherryProps {
  size?: number;
}

export const UnifiedCherry: React.FC<UnifiedCherryProps> = ({ size = 34 }) => {
  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none overflow-visible filter drop-shadow-[0_6px_14px_rgba(244,63,94,0.55)]"
      style={{ width: size, height: size }}
    >
      <CherryIcon size={size} />
    </div>
  );
};

// ==========================================
// 樱桃投喂手势调度组件 (无新蒙层，直接在原层呈现)
// ==========================================
export const TaskGestureOverlay: React.FC<TaskGestureOverlayProps> = ({
  gestureData,
  onClose,
  onAction,
  onTargetChange,
  onChompChange,
  onJumpChange
}) => {
  const [cherryPos, setCherryPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMorphedToCherry, setIsMorphedToCherry] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isThrowing, setIsThrowing] = useState(false);
  const [throwPos, setThrowPos] = useState<{ x: number; y: number; rotate: number; scale: number }>({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1
  });

  // 使用 ref 避免频繁 re-render 闭包陈旧问题和反复绑定解绑监听器导致的抖动
  const currentPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeTargetRef = useRef<GestureActionType>('none');
  const isThrowingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  // 稳定保存外部回调，防止父组件更新 state 时重新挂载动效或意外 cancelAnimationFrame
  const onActionRef = useRef(onAction);
  const onCloseRef = useRef(onClose);
  const onTargetChangeRef = useRef(onTargetChange);
  const onChompChangeRef = useRef(onChompChange);
  const onJumpChangeRef = useRef(onJumpChange);

  useEffect(() => {
    onActionRef.current = onAction;
    onCloseRef.current = onClose;
    onTargetChangeRef.current = onTargetChange;
    onChompChangeRef.current = onChompChange;
    onJumpChangeRef.current = onJumpChange;
  });

  // 初始化长按手势与变樱桃过渡动效
  useEffect(() => {
    if (gestureData) {
      const initialPos = gestureData.point;
      currentPosRef.current = initialPos;
      setCherryPos(initialPos);
      setThrowPos({ x: initialPos.x, y: initialPos.y, rotate: 0, scale: 1 });
      activeTargetRef.current = 'none';
      isThrowingRef.current = false;
      setIsThrowing(false);
      setIsMorphedToCherry(false);
      setShowRipple(false);
      setTiltAngle(0);

      onTargetChangeRef.current?.('none');
      onChompChangeRef.current?.(null);
      onJumpChangeRef.current?.(null);

      // 第 1 阶段：稍微留出 25ms 启动平滑卡片缩拢凝结为樱桃光晕的过渡动画
      const morphTimer = setTimeout(() => {
        setIsMorphedToCherry(true);
      }, 25);

      // 第 2 阶段：卡片凝聚达到临界点，萌趣卡通樱桃破茧弹出并绽放微光涟漪
      const rippleTimer = setTimeout(() => {
        setShowRipple(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(14);
          } catch {}
        }
      }, 210);

      const rippleCleanup = setTimeout(() => {
        setShowRipple(false);
      }, 700);

      return () => {
        clearTimeout(morphTimer);
        clearTimeout(rippleTimer);
        clearTimeout(rippleCleanup);
      };
    }
  }, [gestureData?.task?.id]);

  // 绑定全局鼠标与触摸移动（在手势存续期内仅绑定一次，杜绝频繁拆解监听引起的鼠标抖动）
  useEffect(() => {
    if (!gestureData) return;

    const processMove = (clientX: number, clientY: number) => {
      if (isThrowingRef.current) return;
      const prevX = currentPosRef.current.x;
      const deltaX = clientX - prevX;
      // 微妙物理惯性倾角（-16deg 到 +16deg）
      const tilt = Math.max(-16, Math.min(16, deltaX * 1.6));
      setTiltAngle(tilt);

      currentPosRef.current = { x: clientX, y: clientY };
      setCherryPos({ x: clientX, y: clientY });

      // 计算是否拖入主体界面底部的 3 动物领地
      const dockEl = document.getElementById('bottom-animal-dock');
      const rect = dockEl?.getBoundingClientRect();
      const H = typeof window !== 'undefined' ? window.innerHeight : 800;

      let detected: GestureActionType = 'none';

      // 靠近底部领地（向上浮动 80px 范围即判定为已进入瞄准）
      const triggerTop = rect ? rect.top - 70 : H - 180;

      if (clientY > triggerTop) {
        const left = rect ? rect.left : 0;
        const width = rect ? rect.width : window.innerWidth;
        const relativeX = clientX - left;

        if (relativeX < width / 3) {
          detected = 'delete';   // 左 1/3：小恐龙 (删除)
        } else if (relativeX < (width * 2) / 3) {
          detected = 'defer';    // 中 1/3：小树懒 (延后)
        } else {
          detected = 'complete'; // 右 1/3：小仓鼠 (完成)
        }
      }

      if (detected !== activeTargetRef.current) {
        activeTargetRef.current = detected;
        onTargetChangeRef.current?.(detected);
        if (detected !== 'none' && typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(12);
          } catch {}
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      processMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        processMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // 核心物理抛物线弹道引擎与空中交汇捕捉算法
    const executeParabolicThrow = (target: GestureActionType, startX: number, startY: number) => {
      isThrowingRef.current = true;
      // 立即将起点设为当前松开位置，绝对不抖动或跳回 (0, 0)
      setThrowPos({ x: startX, y: startY, rotate: 0, scale: 1 });
      setIsThrowing(true);

      const dockEl = document.getElementById('bottom-animal-dock');
      const rect = dockEl?.getBoundingClientRect();
      const H = typeof window !== 'undefined' ? window.innerHeight : 800;

      const dockLeft = rect ? rect.left : 0;
      const dockWidth = rect ? rect.width : window.innerWidth;
      const dockTop = rect ? rect.top : H - 120;
      const cellWidth = dockWidth / 3;

      // 目标交汇点：动物跃至半空最高点时的嘴巴空间坐标
      let meetX = dockLeft + dockWidth / 2;
      let meetY = dockTop + 14;

      if (target === 'delete') {
        // 小恐龙向右看，半空大嘴迎接樱桃
        meetX = dockLeft + cellWidth * 0.60;
        meetY = dockTop + 14;
      } else if (target === 'defer') {
        // 小树懒仰头向天空伸展
        meetX = dockLeft + cellWidth + cellWidth * 0.50;
        meetY = dockTop + 12;
      } else if (target === 'complete') {
        // 小松鼠向左侧跃起
        meetX = dockLeft + cellWidth * 2 + cellWidth * 0.40;
        meetY = dockTop + 10;
      }

      const duration = 500; // 飞行总耗时 500ms
      const startTime = performance.now();
      // 优美高拱抛物线弧度
      const peakHeight = Math.max(90, Math.abs(startY - meetY) * 0.45 + 55);

      let animalHasJumped = false;

      const animateThrow = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const t = progress;

        // 运动轨迹交汇物理逻辑：
        // 1. 樱桃先高高抛起上升，动物在地面注视；
        // 2. 当樱桃接近顶点并开始俯冲（t >= 0.35，约 175ms）时，动物蹬地一跃而起！
        // 3. 动物跳跃上升耗时约 220ms，恰好在 t = 1.0 (500ms) 时与下落的樱桃在空中交汇点 (meetX, meetY) 完美相撞吞入！
        if (t >= 0.35 && !animalHasJumped) {
          animalHasJumped = true;
          onJumpChangeRef.current?.(target);
        }

        // 抛物线方程
        const curX = startX + (meetX - startX) * t;
        const linearY = startY + (meetY - startY) * t;
        const arcY = -4 * peakHeight * t * (1 - t);
        const curY = linearY + arcY;

        // 旋转与接近嘴巴时的微小缩放吸入感（从 1.0 平滑吸小至 ~0.35，让樱桃顺畅进入嘴中）
        const rotate = t * 540;
        const scale = t > 0.65 ? 1 - ((t - 0.65) / 0.35) * 0.65 : 1;

        setThrowPos({
          x: curX,
          y: curY,
          rotate,
          scale
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateThrow);
        } else {
          // 精确在空中交汇飞入嘴中！动物落回地面、闭嘴咀嚼与庆祝粒子爆发
          onJumpChangeRef.current?.(null);
          onChompChangeRef.current?.(target);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([18, 26, 20]);
            } catch {}
          }

          // 保持咀嚼与台词气泡展示一段时间后，结算业务逻辑
          setTimeout(() => {
            onActionRef.current?.(target, gestureData.task);
            onChompChangeRef.current?.(null);
            onTargetChangeRef.current?.('none');
            onJumpChangeRef.current?.(null);
            onCloseRef.current?.();
          }, 750);
        }
      };

      animFrameRef.current = requestAnimationFrame(animateThrow);
    };

    const handleRelease = () => {
      if (isThrowingRef.current) return;
      const target = activeTargetRef.current;
      const releasePos = currentPosRef.current;

      if (target !== 'none') {
        executeParabolicThrow(target, releasePos.x, releasePos.y);
      } else {
        // 未拖入底部领地，安全取消
        onTargetChangeRef.current?.('none');
        onCloseRef.current?.();
      }
    };

    const handleCancel = () => {
      if (isThrowingRef.current) return;
      onTargetChangeRef.current?.('none');
      onCloseRef.current?.();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleCancel);

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleCancel);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleCancel);
    };
  }, [gestureData?.task?.id]);

  if (!gestureData) return null;
  const { task, cardRect } = gestureData;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] select-none touch-none overflow-hidden pointer-events-none">
        
        {/* ========================================================= */}
        {/* 动态抛物线飞向动物嘴巴的卡通樱桃 (绝对从松开处起飞，吸入嘴中) */}
        {/* ========================================================= */}
        {isThrowing && (
          <div
            className="fixed pointer-events-none z-[160]"
            style={{
              left: `${throwPos.x}px`,
              top: `${throwPos.y}px`,
              transform: `translate(-50%, -50%) rotate(${throwPos.rotate}deg) scale(${throwPos.scale})`
            }}
          >
            <UnifiedCherry size={34} />
          </div>
        )}

        {/* ========================================================= */}
        {/* 待办卡片向光标处平滑凝聚变为樱桃的多阶段有机过渡动画 */}
        {/* ========================================================= */}
        {!isThrowing && (
          <motion.div
            initial={{
              left: cardRect.left,
              top: cardRect.top,
              width: cardRect.width,
              height: cardRect.height,
              borderRadius: 12
            }}
            animate={
              isMorphedToCherry
                ? {
                    left: cherryPos.x - 17,
                    top: cherryPos.y - 17,
                    width: 34,
                    height: 34,
                    borderRadius: 999
                  }
                : {
                    left: cardRect.left,
                    top: cardRect.top,
                    width: cardRect.width,
                    height: cardRect.height,
                    borderRadius: 12
                  }
            }
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 24
            }}
            className="fixed pointer-events-none z-[155] flex items-center justify-center overflow-visible"
          >
            {/* 阶段 1：原卡片内容与外框平滑收缩凝聚并淡出 */}
            <motion.div
              className="absolute inset-0 rounded-xl overflow-hidden flex items-center px-3 border border-white/60 dark:border-white/20 bg-white/95 dark:bg-stone-900/95 shadow-md pointer-events-none"
              animate={{
                opacity: isMorphedToCherry ? 0 : 1,
                scale: isMorphedToCherry ? 0.6 : 1,
                filter: isMorphedToCherry ? 'blur(4px)' : 'blur(0px)'
              }}
              transition={{ duration: 0.18, ease: 'easeIn' }}
            >
              <span className="text-xs font-semibold truncate text-[var(--text-main)]">
                {task.title}
              </span>
            </motion.div>

            {/* 阶段 2：卡片收缩为果实核心时的粉晶樱桃光晕水滴 */}
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={
                isMorphedToCherry
                  ? {
                      opacity: [0, 0.9, 0],
                      scale: [0.4, 1.35, 0.9]
                    }
                  : { opacity: 0, scale: 0.4 }
              }
              transition={{
                duration: 0.36,
                times: [0, 0.5, 1],
                ease: 'easeOut'
              }}
              style={{
                background:
                  'radial-gradient(circle, rgba(255, 117, 151, 0.9) 0%, rgba(225, 29, 72, 0.45) 60%, transparent 100%)'
              }}
            />

            {/* 阶段 3：萌趣樱桃破茧而出，伴随弹性震颤与涟漪环 */}
            {showRipple && (
              <>
                <motion.div
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 0.42, ease: 'easeOut' }}
                  className="absolute rounded-full border-2 border-rose-400 pointer-events-none"
                  style={{ width: 34, height: 34 }}
                />
                <motion.div
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: -14, y: -14, scale: 1.1, opacity: 0 }}
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                  className="absolute text-[11px] pointer-events-none"
                >
                  ✨
                </motion.div>
                <motion.div
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: 15, y: -12, scale: 1.1, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute text-[11px] pointer-events-none"
                >
                  🌸
                </motion.div>
              </>
            )}

            {/* 阶段 4：精致卡通樱桃果实（富有弹性的弹出动画 + 随手指摆动的动态摇晃倾角） */}
            <motion.div
              className="relative flex items-center justify-center overflow-visible pointer-events-none"
              initial={{ opacity: 0, scale: 0.1, rotate: -20 }}
              animate={
                isMorphedToCherry
                  ? {
                      opacity: 1,
                      scale: [0.1, 1.25, 0.92, 1],
                      rotate: [-20, 10, -4, tiltAngle]
                    }
                  : { opacity: 0, scale: 0.1, rotate: -20 }
              }
              transition={{
                delay: 0.08,
                duration: 0.4,
                times: [0, 0.55, 0.8, 1],
                ease: 'easeOut'
              }}
            >
              <UnifiedCherry size={34} />
            </motion.div>
          </motion.div>
        )}

      </div>
    </AnimatePresence>
  );
};
