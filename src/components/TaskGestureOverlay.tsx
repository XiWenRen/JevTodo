import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskItem as ITaskItem } from '../types';
import { CardRect } from './TaskItem';
import { CherryIcon } from './CherryIcon';
import { useActiveSkin } from '../plugins/skins/SkinRegistry';
import { playCherryChompSound, playCherryThrowSound } from '../utils/cherryAudio';

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
// 悬浮球核心投喂手势调度组件
// ==========================================
export const TaskGestureOverlay: React.FC<TaskGestureOverlayProps> = ({
  gestureData,
  onClose,
  onAction,
  onTargetChange,
  onChompChange
}) => {
  const { activeSkin } = useActiveSkin();

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
  const [activeTargetState, setActiveTargetState] = useState<GestureActionType>('none');

  const currentPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeTargetRef = useRef<GestureActionType>('none');
  const isThrowingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  const onActionRef = useRef(onAction);
  const onCloseRef = useRef(onClose);
  const onTargetChangeRef = useRef(onTargetChange);
  const onChompChangeRef = useRef(onChompChange);

  useEffect(() => {
    onActionRef.current = onAction;
    onCloseRef.current = onClose;
    onTargetChangeRef.current = onTargetChange;
    onChompChangeRef.current = onChompChange;
  });

  // 初始化长按手势与变樱桃过渡动效
  useEffect(() => {
    if (gestureData) {
      const initialPos = gestureData.point;
      currentPosRef.current = initialPos;
      setCherryPos(initialPos);
      setThrowPos({ x: initialPos.x, y: initialPos.y, rotate: 0, scale: 1 });
      activeTargetRef.current = 'none';
      setActiveTargetState('none');
      isThrowingRef.current = false;
      setIsThrowing(false);
      setIsMorphedToCherry(false);
      setShowRipple(false);
      setTiltAngle(0);

      onTargetChangeRef.current?.('none');
      onChompChangeRef.current?.(null);

      // 阶段 1：卡片平滑收缩
      const morphTimer = setTimeout(() => {
        setIsMorphedToCherry(true);
      }, 25);

      // 阶段 2：破茧成樱桃微光
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

  // 绑定全局鼠标与触摸移动跟踪
  useEffect(() => {
    if (!gestureData) return;

    const processMove = (clientX: number, clientY: number) => {
      if (isThrowingRef.current) return;
      const prevX = currentPosRef.current.x;
      const deltaX = clientX - prevX;
      const tilt = Math.max(-16, Math.min(16, deltaX * 1.6));
      setTiltAngle(tilt);

      currentPosRef.current = { x: clientX, y: clientY };
      setCherryPos({ x: clientX, y: clientY });

      // 核心目标：检测与常驻悬浮球的距离 (Magnetic Area to Floating Ball)
      let detected: GestureActionType = 'none';
      const ballEl = document.getElementById('floating-companion-ball');
      if (ballEl) {
        const ballRect = ballEl.getBoundingClientRect();
        const ballCenterX = ballRect.left + ballRect.width / 2;
        const ballCenterY = ballRect.top + ballRect.height / 2;
        const distToBall = Math.hypot(clientX - ballCenterX, clientY - ballCenterY);

        // 悬浮球磁吸范围：140px 判定为吸附并喂食
        if (distToBall < 140) {
          detected = 'complete';
        }
      }

      if (detected !== activeTargetRef.current) {
        activeTargetRef.current = detected;
        setActiveTargetState(detected);
        onTargetChangeRef.current?.(detected);
        if (detected !== 'none' && typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(12);
          } catch {}
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // 若鼠标已松开（buttons === 0），安全触发释放
      if (e.buttons === 0 && !isThrowingRef.current) {
        handleRelease();
        return;
      }
      processMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches && e.touches.length > 0) {
        processMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    // 核心物理抛物线弹道：直冲悬浮球嘴部锚点
    const executeParabolicThrow = (target: GestureActionType, startX: number, startY: number) => {
      isThrowingRef.current = true;
      setThrowPos({ x: startX, y: startY, rotate: 0, scale: 1 });
      setIsThrowing(true);

      // 瞄准悬浮球实时位置与伴侣嘴位锚点
      const ballEl = document.getElementById('floating-companion-ball');
      const ballRect = ballEl?.getBoundingClientRect();

      let meetX = window.innerWidth - 30;
      let meetY = window.innerHeight / 2;

      if (ballRect) {
        const anchorXStr = activeSkin.anatomy?.mouthAnchor?.left || '50%';
        const anchorYStr = activeSkin.anatomy?.mouthAnchor?.top || '50%';
        const anchorX = parseFloat(anchorXStr) / 100;
        const anchorY = parseFloat(anchorYStr) / 100;
        meetX = ballRect.left + ballRect.width * anchorX;
        meetY = ballRect.top + ballRect.height * anchorY;
      }

      const duration = 420; // 420ms 流畅物理飞行
      const startTime = performance.now();
      const peakHeight = Math.max(65, Math.abs(startY - meetY) * 0.35 + 40);

      playCherryThrowSound();

      const animateThrow = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const t = progress;

        // 抛物线轨迹
        const curX = startX + (meetX - startX) * t;
        const linearY = startY + (meetY - startY) * t;
        const arcY = -4 * peakHeight * t * (1 - t);
        const curY = linearY + arcY;

        // 旋转与进入嘴部时的缩小吸入感
        const rotate = t * 720;
        const scale = t > 0.65 ? 1 - ((t - 0.65) / 0.35) * 0.75 : 1;

        setThrowPos({
          x: curX,
          y: curY,
          rotate,
          scale
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateThrow);
        } else {
          // 命中悬浮球嘴部！
          onChompChangeRef.current?.('complete');
          playCherryChompSound();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([18, 28, 18]);
            } catch {}
          }

          setTimeout(() => {
            onActionRef.current?.('complete', gestureData.task);
            onChompChangeRef.current?.(null);
            onTargetChangeRef.current?.('none');
            onCloseRef.current?.();
          }, 500);
        }
      };

      animFrameRef.current = requestAnimationFrame(animateThrow);
    };

    const handleRelease = () => {
      if (isThrowingRef.current) return;
      let target = activeTargetRef.current;
      const releasePos = currentPosRef.current;

      // 如果未完全进入吸附区，但离悬浮球较近 (< 160px)，宽容自动吸附完成投喂
      if (target === 'none') {
        const ballEl = document.getElementById('floating-companion-ball');
        if (ballEl) {
          const ballRect = ballEl.getBoundingClientRect();
          const ballCenterX = ballRect.left + ballRect.width / 2;
          const ballCenterY = ballRect.top + ballRect.height / 2;
          const dist = Math.hypot(releasePos.x - ballCenterX, releasePos.y - ballCenterY);
          if (dist < 160) {
            target = 'complete';
          }
        }
      }

      if (target === 'complete') {
        executeParabolicThrow('complete', releasePos.x, releasePos.y);
      } else {
        // 未投中悬浮球，优雅取消回弹并彻底复位
        onTargetChangeRef.current?.('none');
        onChompChangeRef.current?.(null);
        onCloseRef.current?.();
      }
    };

    const handleCancel = () => {
      if (isThrowingRef.current) return;
      onTargetChangeRef.current?.('none');
      onChompChangeRef.current?.(null);
      onCloseRef.current?.();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('mouseup', handleRelease);

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleCancel);

    // 8 秒超时无操作保底安全退出
    const safetyTimer = setTimeout(() => {
      if (!isThrowingRef.current) {
        handleCancel();
      }
    }, 8000);

    return () => {
      clearTimeout(safetyTimer);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleCancel);
    };
  }, [gestureData?.task?.id, activeSkin]);

  if (!gestureData) return null;
  const { task, cardRect } = gestureData;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] select-none touch-none overflow-hidden pointer-events-none">
        
        {/* ========================================================= */}
        {/* 动态抛物线飞向悬浮球伴侣嘴巴的卡通樱桃 */}
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
