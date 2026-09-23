import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Star, Sparkles, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { GestureActionType } from './TaskGestureOverlay';

interface BottomAnimalDockProps {
  isVisible: boolean;
  activeTarget: GestureActionType;
  chompingAnimal: GestureActionType | null;
}

export const BottomAnimalDock: React.FC<BottomAnimalDockProps> = ({
  isVisible,
  activeTarget,
  chompingAnimal
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
            // 极简透明背景：从下往上逐渐变弱的渐变环境阴影
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 100%)'
          }}
        >
          {/* 3 等分领地网格 (留出足够高度 h-36，overflow-visible 绝不裁切进食庆祝提示) */}
          <div className="w-full h-36 grid grid-cols-3 relative px-1 sm:px-3 overflow-visible">
            
            {/* ======================================================= */}
            {/* 领地 1 (左 1/3)：🦖 贪吃小恐龙 (删除) - 2D 侧面视角向右看 */}
            {/* ======================================================= */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'delete' ? 'filter drop-shadow-[0_0_16px_rgba(244,63,94,0.65)]' : ''
              }`}
            >
              {/* 进食消灭时的庆祝碎屑 (top-1 且 y: 0 保证在视口内清晰展现，绝不被裁切) */}
              <AnimatePresence>
                {chompingAnimal === 'delete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-yellow-300 font-bold text-[10.5px] sm:text-[11.5px] whitespace-nowrap bg-black/90 px-3 py-1 rounded-full border border-yellow-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
                    <span>毁灭的事情就交给我吧！</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2D 侧面小恐龙图片 (身体下半部自然浸入底部阴影) */}
              <div 
                className="relative -mb-3 transition-transform duration-200 overflow-visible"
                style={{
                  transform: chompingAnimal === 'delete'
                    ? 'scale(1.18) translateY(-6px)'
                    : activeTarget === 'delete'
                    ? 'scale(1.12) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/dino.webp"
                  alt="小恐龙"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />
              </div>

              {/* 领地操作徽章 */}
              <div className="relative z-10 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium flex items-center gap-1 transition-all duration-150 ${
                    activeTarget === 'delete'
                      ? 'bg-rose-500 text-white font-bold shadow-[0_0_14px_rgba(244,63,94,0.9)] scale-105'
                      : 'text-rose-300/90 bg-black/40 border border-rose-500/30 backdrop-blur-sm'
                  }`}
                >
                  <Trash2 className="w-2.8 h-2.8" />
                  <span>{activeTarget === 'delete' ? '投喂删除 🦖' : '小恐龙 · 删除'}</span>
                </span>
              </div>
            </div>

            {/* ======================================================= */}
            {/* 领地 2 (中 1/3)：🦥 慢吞吞树懒 (延后) - 2D 侧面挂树视角向上看 */}
            {/* ======================================================= */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'defer' ? 'filter drop-shadow-[0_0_16px_rgba(245,158,11,0.65)]' : ''
              }`}
            >
              {/* 进食延后时的舒服气泡 */}
              <AnimatePresence>
                {chompingAnimal === 'defer' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-amber-200 font-bold text-[10.5px] sm:text-[11.5px] whitespace-nowrap bg-black/90 px-3 py-1 rounded-full border border-amber-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <span className="animate-bounce font-mono">Zzz... 明天再说</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2D 侧面树懒图片 */}
              <div 
                className="relative -mb-3 transition-transform duration-200 overflow-visible"
                style={{
                  transform: chompingAnimal === 'defer'
                    ? 'scale(1.18) translateY(-6px)'
                    : activeTarget === 'defer'
                    ? 'scale(1.12) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/sloth.webp"
                  alt="小树懒"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />
              </div>

              {/* 领地操作徽章 */}
              <div className="relative z-10 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium flex items-center gap-1 transition-all duration-150 ${
                    activeTarget === 'defer'
                      ? 'bg-amber-500 text-white font-bold shadow-[0_0_14px_rgba(245,158,11,0.9)] scale-105'
                      : 'text-amber-300/90 bg-black/40 border border-amber-500/30 backdrop-blur-sm'
                  }`}
                >
                  <Clock className="w-2.8 h-2.8" />
                  <span>{activeTarget === 'defer' ? '投喂顺延 🦥' : '小树懒 · 延后'}</span>
                </span>
              </div>
            </div>

            {/* ======================================================= */}
            {/* 领地 3 (右 1/3)：🐿️ 元气小松鼠 (完成) - 2D 侧面站立视角向左看 */}
            {/* ======================================================= */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'complete' ? 'filter drop-shadow-[0_0_16px_rgba(16,185,129,0.7)]' : ''
              }`}
            >
              {/* 进食完成时的爱心星光大爆发 */}
              <AnimatePresence>
                {chompingAnimal === 'complete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-pink-200 font-bold text-[10.5px] sm:text-[11.5px] whitespace-nowrap bg-black/90 px-3 py-1 rounded-full border border-pink-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 animate-bounce shrink-0" />
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-spin shrink-0" />
                    <span>我也会像你一样努力吃的！</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2D 侧面小松鼠图片 */}
              <div 
                className="relative -mb-3 transition-transform duration-200 overflow-visible"
                style={{
                  transform: chompingAnimal === 'complete'
                    ? 'scale(1.2) translateY(-6px)'
                    : activeTarget === 'complete'
                    ? 'scale(1.14) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/hamster.webp"
                  alt="小松鼠"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />
              </div>

              {/* 领地操作徽章 */}
              <div className="relative z-10 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium flex items-center gap-1 transition-all duration-150 ${
                    activeTarget === 'complete'
                      ? 'bg-emerald-500 text-white font-bold shadow-[0_0_14px_rgba(16,185,129,0.9)] scale-105'
                      : 'text-emerald-300/90 bg-black/40 border border-emerald-500/30 backdrop-blur-sm'
                  }`}
                >
                  <CheckCircle2 className="w-2.8 h-2.8" />
                  <span>{activeTarget === 'complete' ? '投喂奖励 🐿️' : '小松鼠 · 完成'}</span>
                </span>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
