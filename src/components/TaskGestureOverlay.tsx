import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  onTargetChange?: (target: GestureActionType) => void;
  onChompChange?: (chomp: GestureActionType | null) => void;
}

// ==========================================
// 统一高品质 3D 樱桃展示组件
// ==========================================
interface UnifiedCherryProps {
  size?: number;
}

export const UnifiedCherry: React.FC<UnifiedCherryProps> = ({ size = 56 }) => {
  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none overflow-visible filter drop-shadow-[0_8px_16px_rgba(225,29,72,0.45)]"
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/cherry.png"
        alt="Cherry"
        className="w-full h-full object-contain pointer-events-none overflow-visible"
        draggable={false}
      />
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
  onChompChange
}) => {
  const [cherryPos, setCherryPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMorphedToCherry, setIsMorphedToCherry] = useState(false);
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

      onTargetChange?.('none');
      onChompChange?.(null);

      // 稍微留出 35ms 确保浏览器完成首帧布局后启动平滑卡片缩拢变樱桃的过渡动画
      const morphTimer = setTimeout(() => {
        setIsMorphedToCherry(true);
      }, 35);

      return () => {
        clearTimeout(morphTimer);
      };
    }
  }, [gestureData?.task?.id]);

  // 绑定全局鼠标与触摸移动（在手势存续期内仅绑定一次，杜绝频繁拆解监听引起的鼠标抖动）
  useEffect(() => {
    if (!gestureData) return;

    const processMove = (clientX: number, clientY: number) => {
      if (isThrowingRef.current) return;
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
        onTargetChange?.(detected);
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

    // 核心物理抛物线弹道引擎
    const executeParabolicThrow = (target: GestureActionType, startX: number, startY: number) => {
      isThrowingRef.current = true;
      // 立即将起点设为当前松开位置，绝不会跳到 (0, 0)
      setThrowPos({ x: startX, y: startY, rotate: 0, scale: 1 });
      setIsThrowing(true);

      const dockEl = document.getElementById('bottom-animal-dock');
      const rect = dockEl?.getBoundingClientRect();
      const H = typeof window !== 'undefined' ? window.innerHeight : 800;

      const dockLeft = rect ? rect.left : 0;
      const dockWidth = rect ? rect.width : window.innerWidth;
      const dockTop = rect ? rect.top : H - 120;
      const cellWidth = dockWidth / 3;

      let targetX = dockLeft + dockWidth / 2;
      let targetY = dockTop + 45;

      if (target === 'delete') {
        // 小恐龙侧面朝右，大嘴位于左格子的偏右上方
        targetX = dockLeft + cellWidth * 0.62;
        targetY = dockTop + 42;
      } else if (target === 'defer') {
        // 小树懒侧面仰头，大嘴位于中格子的偏右上方
        targetX = dockLeft + cellWidth + cellWidth * 0.54;
        targetY = dockTop + 40;
      } else if (target === 'complete') {
        // 小仓鼠侧面朝左，大嘴位于右格子的偏左上方
        targetX = dockLeft + cellWidth * 2 + cellWidth * 0.38;
        targetY = dockTop + 38;
      }

      const duration = 380; // 飞行总耗时
      const startTime = performance.now();
      // 优美高拱抛物线弧度
      const peakHeight = Math.max(70, Math.abs(startY - targetY) * 0.35 + 45);

      const animateThrow = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const t = progress;

        // 抛物线方程
        const curX = startX + (targetX - startX) * t;
        const linearY = startY + (targetY - startY) * t;
        const arcY = -4 * peakHeight * t * (1 - t);
        const curY = linearY + arcY;

        // 旋转与接近嘴巴时的微小缩放吸入感
        const rotate = t * 360;
        const scale = t > 0.82 ? 1 - ((t - 0.82) / 0.18) * 0.8 : 1;

        setThrowPos({
          x: curX,
          y: curY,
          rotate,
          scale
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateThrow);
        } else {
          // 精确飞入嘴中！触发动物闭嘴咀嚼与庆祝粒子
          onChompChange?.(target);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([18, 26, 20]);
            } catch {}
          }

          // 保持咀嚼与台词气泡展示一段时间后，结算业务逻辑
          setTimeout(() => {
            onAction(target, gestureData.task);
            onChompChange?.(null);
            onTargetChange?.('none');
            onClose();
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
        onTargetChange?.('none');
        onClose();
      }
    };

    const handleCancel = () => {
      if (isThrowingRef.current) return;
      onTargetChange?.('none');
      onClose();
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
  }, [gestureData?.task?.id, onAction, onClose, onTargetChange, onChompChange]);

  if (!gestureData) return null;
  const { task, cardRect } = gestureData;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] select-none touch-none overflow-hidden pointer-events-none">
        
        {/* ========================================================= */}
        {/* 动态抛物线飞向动物嘴巴的 3D 樱桃 (绝对从松开处起飞) */}
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
            <UnifiedCherry size={50} />
          </div>
        )}

        {/* ========================================================= */}
        {/* 待办卡片向光标处平滑凝聚变为樱桃的过渡动画 */}
        {/* ========================================================= */}
        {!isThrowing && (
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
              isMorphedToCherry
                ? {
                    left: cherryPos.x - 26,
                    top: cherryPos.y - 26,
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    opacity: 1
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
              stiffness: 360,
              damping: 25
            }}
            className={`fixed pointer-events-none z-[155] flex items-center justify-center bg-transparent ${
              isMorphedToCherry ? 'overflow-visible' : 'overflow-hidden shadow-xl'
            }`}
          >
            {isMorphedToCherry ? (
              // 变形完毕：展现晶莹饱满可爱的 3D 樱桃（完全无任何圆形边框裁切）
              <motion.div
                initial={{ scale: 0.2, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                className="overflow-visible flex items-center justify-center"
              >
                <UnifiedCherry size={58} />
              </motion.div>
            ) : (
              // 变形前：原卡片内容平滑收拢淡出
              <motion.div
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full border border-white/40 dark:border-white/20 bg-white/95 dark:bg-neutral-900/95 rounded-xl px-3 py-2 flex items-center text-[var(--text-main)] shadow-xl"
              >
                <span className="text-sm font-semibold truncate">{task.title}</span>
              </motion.div>
            )}
          </motion.div>
        )}

      </div>
    </AnimatePresence>
  );
};
