import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Star, Sparkles, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { GestureActionType } from './TaskGestureOverlay';

interface BottomAnimalDockProps {
  isVisible: boolean;
  activeTarget: GestureActionType;
  chompingAnimal: GestureActionType | null;
  jumpingAnimal?: GestureActionType | null;
}

export const BottomAnimalDock: React.FC<BottomAnimalDockProps> = ({
  isVisible,
  activeTarget,
  chompingAnimal,
  jumpingAnimal
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="bottom-animal-dock"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="absolute bottom-0 inset-x-0 z-30 pointer-events-none select-none overflow-visible"
          style={{
            // 纯视觉次元过渡：底部浓郁、向上无缝渐隐的深空环境（下半部加深，全主题自适应）
            background: 'var(--dock-ambient-gradient)'
          }}
        >
          {/* 3 等分领地网格 */}
          <div className="w-full h-32 grid grid-cols-3 relative px-2 sm:px-4 overflow-visible">
            
            {/* ======================================================= */}
            {/* 领地 1 (左 1/3)：🦖 贪吃小恐龙 (删除) - 2D 侧面视角向右看 */}
            {/* ======================================================= */}
            <div
              className={`relative flex flex-col items-center justify-end pb-1.5 transition-all duration-200 overflow-visible ${
                activeTarget === 'delete' || jumpingAnimal === 'delete' ? 'filter drop-shadow-[0_0_16px_rgba(244,63,94,0.7)]' : ''
              }`}
            >
              {/* 纯视觉专属次元微光 */}
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'var(--dock-pedestal-delete)',
                  opacity: jumpingAnimal === 'delete' ? 1 : activeTarget === 'delete' ? 0.8 : 0.28
                }}
              />

              {/* 进食消灭时的庆祝碎屑 */}
              <AnimatePresence>
                {chompingAnimal === 'delete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-0 z-30 flex items-center gap-1.5 text-amber-500 dark:text-yellow-300 font-bold text-[11px] sm:text-xs whitespace-nowrap bg-[var(--dock-bubble-bg)] px-3 py-1 rounded-full border border-amber-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                    <span>毁灭的事情就交给我吧！</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2D 侧面小恐龙图片 (跳起接住抛物线樱桃！) */}
              <div 
                className="relative overflow-visible"
                style={{
                  transition: jumpingAnimal === 'delete'
                    ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    : chompingAnimal === 'delete'
                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'transform 0.2s ease-out',
                  transform: jumpingAnimal === 'delete'
                    ? 'scale(1.32) translateY(-36px)'
                    : chompingAnimal === 'delete'
                    ? 'scale(1.18) translateY(-6px)'
                    : activeTarget === 'delete'
                    ? 'scale(1.12) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/dino.webp"
                  alt="小恐龙"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />

                {/* 右下角极简操作小图标 (无繁杂文字) */}
                <div
                  className={`absolute right-1 bottom-1 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-none ${
                    activeTarget === 'delete' || jumpingAnimal === 'delete'
                      ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.9)] scale-115'
                      : 'text-rose-500/80 dark:text-rose-300/80 bg-[var(--dock-badge-bg)] border border-rose-500/25 shadow-xs backdrop-blur-md opacity-85'
                  }`}
                  title="删除"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            {/* ======================================================= */}
            {/* 领地 2 (中 1/3)：🦥 慢吞吞树懒 (延后) - 2D 侧面挂树视角向上看 */}
            {/* ======================================================= */}
            <div
              className={`relative flex flex-col items-center justify-end pb-1.5 transition-all duration-200 overflow-visible ${
                activeTarget === 'defer' || jumpingAnimal === 'defer' ? 'filter drop-shadow-[0_0_16px_rgba(245,158,11,0.7)]' : ''
              }`}
            >
              {/* 纯视觉专属次元微光 */}
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'var(--dock-pedestal-defer)',
                  opacity: jumpingAnimal === 'defer' ? 1 : activeTarget === 'defer' ? 0.8 : 0.28
                }}
              />

              {/* 进食延后时的舒服气泡 */}
              <AnimatePresence>
                {chompingAnimal === 'defer' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-0 z-30 flex items-center gap-1.5 text-amber-600 dark:text-amber-200 font-bold text-[11px] sm:text-xs whitespace-nowrap bg-[var(--dock-bubble-bg)] px-3 py-1 rounded-full border border-amber-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <span className="animate-bounce font-mono">Zzz... 明天再说</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2D 侧面树懒图片 (跳起接住樱桃！) */}
              <div 
                className="relative overflow-visible"
                style={{
                  transition: jumpingAnimal === 'defer'
                    ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    : chompingAnimal === 'defer'
                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'transform 0.2s ease-out',
                  transform: jumpingAnimal === 'defer'
                    ? 'scale(1.3) translateY(-34px)'
                    : chompingAnimal === 'defer'
                    ? 'scale(1.18) translateY(-6px)'
                    : activeTarget === 'defer'
                    ? 'scale(1.12) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/sloth.webp"
                  alt="小树懒"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />

                {/* 右下角极简操作小图标 (无繁杂文字) */}
                <div
                  className={`absolute right-1 bottom-1 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-none ${
                    activeTarget === 'defer' || jumpingAnimal === 'defer'
                      ? 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.9)] scale-115'
                      : 'text-amber-500/80 dark:text-amber-300/80 bg-[var(--dock-badge-bg)] border border-amber-500/25 shadow-xs backdrop-blur-md opacity-85'
                  }`}
                  title="延后"
                >
                  <Clock className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            {/* ======================================================= */}
            {/* 领地 3 (右 1/3)：🐿️ 元气小松鼠 (完成) - 2D 侧面站立视角向左看 */}
            {/* ======================================================= */}
            <div
              className={`relative flex flex-col items-center justify-end pb-1.5 transition-all duration-200 overflow-visible ${
                activeTarget === 'complete' || jumpingAnimal === 'complete' ? 'filter drop-shadow-[0_0_16px_rgba(16,185,129,0.7)]' : ''
              }`}
            >
              {/* 纯视觉专属次元微光 */}
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'var(--dock-pedestal-complete)',
                  opacity: jumpingAnimal === 'complete' ? 1 : activeTarget === 'complete' ? 0.8 : 0.28
                }}
              />

              {/* 进食完成时的爱心星光大爆发 */}
              <AnimatePresence>
                {chompingAnimal === 'complete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-0 z-30 flex items-center gap-1.5 text-pink-600 dark:text-pink-200 font-bold text-[11px] sm:text-xs whitespace-nowrap bg-[var(--dock-bubble-bg)] px-3 py-1 rounded-full border border-pink-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 animate-bounce shrink-0" />
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-spin shrink-0" />
                    <span>我也会像你一样努力吃的！</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2D 侧面小松鼠图片 (跳起接住樱桃！) */}
              <div 
                className="relative overflow-visible"
                style={{
                  transition: jumpingAnimal === 'complete'
                    ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    : chompingAnimal === 'complete'
                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'transform 0.2s ease-out',
                  transform: jumpingAnimal === 'complete'
                    ? 'scale(1.34) translateY(-36px)'
                    : chompingAnimal === 'complete'
                    ? 'scale(1.2) translateY(-6px)'
                    : activeTarget === 'complete'
                    ? 'scale(1.14) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/hamster.webp"
                  alt="小松鼠"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />

                {/* 右下角极简操作小图标 (无繁杂文字) */}
                <div
                  className={`absolute right-1 bottom-1 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-none ${
                    activeTarget === 'complete' || jumpingAnimal === 'complete'
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.9)] scale-115'
                      : 'text-emerald-500/80 dark:text-emerald-300/80 bg-[var(--dock-badge-bg)] border border-emerald-500/25 shadow-xs backdrop-blur-md opacity-85'
                  }`}
                  title="完成"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
