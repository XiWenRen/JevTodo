import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Star, Sparkles, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { ISkinPlugin, CompanionRenderProps, ActionDockRenderProps, FocusPetConfig } from '../types';

/**
 * 经典萌宠动物园皮肤包 (Cute Animal Kingdom Skin)
 * 包含：悬浮小仓鼠伴侣、底部三小动物领地（恐龙删除、树懒延后、仓鼠完成）与专注时钟萌宠
 */

const AnimalCompanionWidget: React.FC<CompanionRenderProps> = ({ isBlinking, isAllCompleted }) => {
  return (
    <div 
      className="absolute inset-[3.5px] rounded-full flex items-center justify-center overflow-hidden border transition-all duration-200"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-drawer) 96%, transparent)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--border-medium)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.18)'
      }}
    >
      <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="none">
        {/* Robot/Cat Helmet Ears */}
        <path
          d="M6 7.5L8.5 4.5L10 6.5M18 7.5L15.5 4.5L14 6.5"
          stroke="var(--text-sub)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-70"
        />
        {/* Head Contour */}
        <rect
          x="4"
          y="6"
          width="16"
          height="13"
          rx="6"
          fill="currentColor"
          className="text-zinc-900 dark:text-zinc-950"
        />
        {/* Glossy Visor Screen */}
        <rect
          x="5.5"
          y="7.5"
          width="13"
          height="10"
          rx="4"
          fill="#09090b"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.8"
        />

        {/* Expressive LED Matrix Optics */}
        {isBlinking ? (
          <>
            <line x1="8" y1="12.5" x2="10.5" y2="12.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="13.5" y1="12.5" x2="16" y2="12.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
          </>
        ) : isAllCompleted ? (
          <>
            <path d="M8 13.5C8.5 12 10 12 10.5 13.5" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M13.5 13.5C14 12 15.5 12 16 13.5" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="9" cy="12.5" r="1.3" fill="#38bdf8" className="shadow-xs" />
            <circle cx="15" cy="12.5" r="1.3" fill="#38bdf8" className="shadow-xs" />
            <ellipse cx="7.5" cy="14" rx="0.8" ry="0.4" fill="rgba(244,114,182,0.4)" />
            <ellipse cx="16.5" cy="14" rx="0.8" ry="0.4" fill="rgba(244,114,182,0.4)" />
          </>
        )}
      </svg>
    </div>
  );
};

const AnimalActionDock: React.FC<ActionDockRenderProps> = ({
  isVisible,
  activeTarget,
  chompingAction
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
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.35) 55%, transparent 100%)'
          }}
        >
          <div className="w-full h-36 grid grid-cols-3 relative px-1 sm:px-3 overflow-visible">
            {/* 领地 1：小恐龙 (删除) */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'delete' ? 'filter drop-shadow-[0_0_16px_rgba(244,63,94,0.65)]' : ''
              }`}
            >
              <AnimatePresence>
                {chompingAction === 'delete' && (
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

              <div 
                className="relative -mb-3 transition-transform duration-200 overflow-visible"
                style={{
                  transform: chompingAction === 'delete'
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

            {/* 领地 2：慢树懒 (延后) */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'defer' ? 'filter drop-shadow-[0_0_16px_rgba(245,158,11,0.65)]' : ''
              }`}
            >
              <AnimatePresence>
                {chompingAction === 'defer' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-amber-300 font-bold text-[10.5px] sm:text-[11.5px] whitespace-nowrap bg-black/90 px-3 py-1 rounded-full border border-amber-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <Clock className="w-3.5 h-3.5 animate-bounce text-amber-300 shrink-0" />
                    <span>慢慢来，不着急～</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                className="relative -mb-3 transition-transform duration-200 overflow-visible"
                style={{
                  transform: chompingAction === 'defer'
                    ? 'scale(1.18) translateY(-6px)'
                    : activeTarget === 'defer'
                    ? 'scale(1.12) translateY(-8px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/sloth.webp"
                  alt="树懒"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />
              </div>

              <div className="relative z-10 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium flex items-center gap-1 transition-all duration-150 ${
                    activeTarget === 'defer'
                      ? 'bg-amber-500 text-white font-bold shadow-[0_0_14px_rgba(245,158,11,0.9)] scale-105'
                      : 'text-amber-300/90 bg-black/40 border border-amber-500/30 backdrop-blur-sm'
                  }`}
                >
                  <Clock className="w-2.8 h-2.8" />
                  <span>{activeTarget === 'defer' ? '慢吞吞延后 🦥' : '树懒 · 延后'}</span>
                </span>
              </div>
            </div>

            {/* 领地 3：贪吃仓鼠 (完成) */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'complete' ? 'filter drop-shadow-[0_0_18px_rgba(16,185,129,0.75)]' : ''
              }`}
            >
              <AnimatePresence>
                {chompingAction === 'complete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-emerald-300 font-bold text-[10.5px] sm:text-[11.5px] whitespace-nowrap bg-black/90 px-3 py-1 rounded-full border border-emerald-400/50 shadow-2xl backdrop-blur-md pointer-events-none"
                  >
                    <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0 animate-spin" />
                    <span>真棒！我又吃饱啦！</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                className="relative -mb-3 transition-transform duration-200 overflow-visible"
                style={{
                  transform: chompingAction === 'complete'
                    ? 'scale(1.22) translateY(-7px)'
                    : activeTarget === 'complete'
                    ? 'scale(1.15) translateY(-9px)'
                    : 'scale(1)'
                }}
              >
                <img
                  src="/assets/animals/hamster.webp"
                  alt="小仓鼠"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                  style={{
                    maskImage: 'linear-gradient(to top, transparent 4%, black 28%)',
                    WebkitMaskImage: 'linear-gradient(to top, transparent 4%, black 28%)'
                  }}
                />
              </div>

              <div className="relative z-10 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium flex items-center gap-1 transition-all duration-150 ${
                    activeTarget === 'complete'
                      ? 'bg-emerald-500 text-white font-bold shadow-[0_0_16px_rgba(16,185,129,0.9)] scale-105'
                      : 'text-emerald-300/90 bg-black/40 border border-emerald-500/30 backdrop-blur-sm'
                  }`}
                >
                  <CheckCircle2 className="w-2.8 h-2.8" />
                  <span>{activeTarget === 'complete' ? '投喂吃下 🐹' : '小仓鼠 · 完成'}</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const animalFocusPets: FocusPetConfig[] = [
  {
    id: 'hamster',
    name: '小仓鼠',
    image: '/assets/animals/hamster.webp',
    cherryCenter: { left: '20%', top: '16%' },
    biteDirection: 'left',
    tagline: '贪吃活泼的小仓鼠，大口吃樱桃'
  },
  {
    id: 'dino',
    name: '小恐龙',
    image: '/assets/animals/dino.webp',
    cherryCenter: { left: '60%', top: '20%' },
    biteDirection: 'left',
    tagline: '霸气小恐龙，一口吞下大樱桃'
  },
  {
    id: 'sloth',
    name: '树懒',
    image: '/assets/animals/sloth.webp',
    cherryCenter: { left: '35%', top: '18%' },
    biteDirection: 'left',
    tagline: '慢条斯理的树懒，细细品味樱桃'
  }
];

export const CuteAnimalSkin: ISkinPlugin = {
  id: 'cute-animals',
  name: '经典萌宠动物园',
  description: '治愈手绘风小恐龙、树懒与贪吃仓鼠，灵动可爱',
  icon: '🐹',
  author: 'CherryTodo Team',
  CompanionWidget: AnimalCompanionWidget,
  ActionDock: AnimalActionDock,
  focusPets: animalFocusPets
};
