import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Star, Sparkles, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { ICompanionTheme, CompanionRenderProps, CompanionStageProps, ActionDockRenderProps, FocusPetConfig } from '../types';
import { KantnerHamsterWheel } from '../../../components/companions/KantnerHamsterWheel';

/**
 * 经典萌宠动物园皮肤包 (Cute Animal Kingdom Skin)
 * 包含：纯 CSS 水晶跑轮小仓鼠核心、大舞台沉浸渲染器、底部动作领地与体态解剖元数据
 */

const AnimalCompanionWidget: React.FC<CompanionRenderProps> = (props) => {
  return (
    <KantnerHamsterWheel
      size={48}
      activityState={props.activityState}
      animDur={props.animDur}
      progressRatio={props.progressRatio}
      isStationary={props.isStationary}
      isStopped={props.isStopped}
      isSettling={props.isSettling}
      isSleeping={props.isSleeping}
      showWheel={false}
      showTrack={false}
      showSpecular={false}
      showComet={false}
    />
  );
};

/**
 * 专注时钟 / 大舞台形态
 * 无级高清等比缩放到 220px，在专注倒计时中以优雅步频踏轮，休息时安稳熟睡
 */
const AnimalCompanionStage: React.FC<CompanionStageProps> = ({
  size = 220,
  focusPhase = 'focus',
  isPaused = false,
  ...restProps
}) => {
  const isBreak = focusPhase === 'break';
  const stageState = isBreak 
    ? 'sleeping' 
    : isPaused 
    ? 'stopped' 
    : 'walking';

  const stageAnimDur = isBreak ? '2.8s' : isPaused ? '0s' : '1.1s';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <KantnerHamsterWheel
        size={size}
        activityState={stageState}
        animDur={stageAnimDur}
        progressRatio={isBreak ? 1 : 0.65}
        isStationary={isBreak || isPaused}
        isStopped={isPaused}
        isSleeping={isBreak}
        showTrack={true}
        showSpecular={true}
        showComet={!isBreak && !isPaused}
        showZzz={isBreak}
      />
    </div>
  );
};

const AnimalActionDock: React.FC<ActionDockRenderProps> = ({
  isVisible,
  activeTarget,
  chompingAction,
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
          style={{ background: 'var(--dock-ambient-gradient)' }}
        >
          <div className="w-full h-32 grid grid-cols-3 relative px-2 sm:px-4 overflow-visible">
            {/* 领地 1 (左 1/3)：🦖 恐龙 */}
            <div className={`relative flex flex-col items-center justify-end pb-1.5 transition-all duration-200 overflow-visible ${
              activeTarget === 'delete' || jumpingAnimal === 'delete' ? 'filter drop-shadow-[0_0_16px_rgba(244,63,94,0.7)]' : ''
            }`}>
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'var(--dock-pedestal-delete)',
                  opacity: jumpingAnimal === 'delete' ? 1 : activeTarget === 'delete' ? 0.8 : 0.28
                }}
              />
              <AnimatePresence>
                {chompingAction === 'delete' && (
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
              <div 
                className="relative overflow-visible"
                style={{
                  transition: jumpingAnimal === 'delete'
                    ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    : chompingAction === 'delete'
                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'transform 0.2s ease-out',
                  transform: jumpingAnimal === 'delete'
                    ? 'scale(1.32) translateY(-36px)'
                    : chompingAction === 'delete'
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

            {/* 领地 2 (中 1/3)：🦥 树懒 */}
            <div className={`relative flex flex-col items-center justify-end pb-1.5 transition-all duration-200 overflow-visible ${
              activeTarget === 'defer' || jumpingAnimal === 'defer' ? 'filter drop-shadow-[0_0_16px_rgba(245,158,11,0.7)]' : ''
            }`}>
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'var(--dock-pedestal-defer)',
                  opacity: jumpingAnimal === 'defer' ? 1 : activeTarget === 'defer' ? 0.8 : 0.28
                }}
              />
              <AnimatePresence>
                {chompingAction === 'defer' && (
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
              <div 
                className="relative overflow-visible"
                style={{
                  transition: jumpingAnimal === 'defer'
                    ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    : chompingAction === 'defer'
                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'transform 0.2s ease-out',
                  transform: jumpingAnimal === 'defer'
                    ? 'scale(1.3) translateY(-34px)'
                    : chompingAction === 'defer'
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

            {/* 领地 3 (右 1/3)：🐿️ 松鼠 */}
            <div className={`relative flex flex-col items-center justify-end pb-1.5 transition-all duration-200 overflow-visible ${
              activeTarget === 'complete' || jumpingAnimal === 'complete' ? 'filter drop-shadow-[0_0_16px_rgba(16,185,129,0.7)]' : ''
            }`}>
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-300"
                style={{
                  background: 'var(--dock-pedestal-complete)',
                  opacity: jumpingAnimal === 'complete' ? 1 : activeTarget === 'complete' ? 0.8 : 0.28
                }}
              />
              <AnimatePresence>
                {chompingAction === 'complete' && (
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
              <div 
                className="relative overflow-visible"
                style={{
                  transition: jumpingAnimal === 'complete'
                    ? 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                    : chompingAction === 'complete'
                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    : 'transform 0.2s ease-out',
                  transform: jumpingAnimal === 'complete'
                    ? 'scale(1.34) translateY(-36px)'
                    : chompingAction === 'complete'
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

const animalFocusPets: FocusPetConfig[] = [
  {
    id: 'hamster',
    name: '小仓鼠',
    image: '/assets/animals/hamster.webp',
    cherryCenter: { left: '26%', top: '22%' },
    biteDirection: 'left',
    tagline: '认真啃食樱桃，为你记录每一个专注时刻'
  },
  {
    id: 'dino',
    name: '小恐龙',
    image: '/assets/animals/dino.webp',
    cherryCenter: { left: '62%', top: '22%' },
    biteDirection: 'left',
    tagline: '大口咀嚼樱桃，吞灭所有干扰与拖延'
  },
  {
    id: 'sloth',
    name: '小树懒',
    image: '/assets/animals/sloth.webp',
    cherryCenter: { left: '38%', top: '35%' },
    biteDirection: 'top',
    tagline: '慢条斯理品尝美味，专注从不慌张'
  }
];

export const CuteAnimalSkin: ICompanionTheme = {
  id: 'cute-animal',
  name: '跑轮小仓鼠',
  category: 'animal',
  styleTag: 'vector',
  description: 'Jon Kantner 经典纯代码跑轮小仓鼠，支持 7 级平滑状态机与大舞台无级等比缩放。',
  icon: '🐹',
  tagline: '沉稳蹬轮与线性减速，安稳趴下熟睡',
  badge: '经典原版',
  author: 'Jon Kantner / CherryTodo',
  accentColor: '#f59e0b',
  CompanionWidget: AnimalCompanionWidget,
  CompanionStage: AnimalCompanionStage,
  anatomy: {
    type: 'css_wheel',
    initialFacing: 'right',
    bodyHeightRatio: 0.65,
    mouthAnchor: { left: '55%', top: '58%' },
    tagline: '圆轮居中型：小仓鼠朝右奔跑，嘴部位于右中下方'
  },
  getCompanionButtonStyle: (props: CompanionRenderProps) => ({
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, #fef3c7 ${Math.round(props.progressRatio * 5)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `${(1.2 + props.progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(props.progressRatio * 60)}%, #f59e0b ${Math.round(props.progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(props.progressRatio * 4)}px ${8 + Math.round(props.progressRatio * 10)}px rgba(0,0,0,${(0.1 + props.progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(props.progressRatio * 12)}px rgba(245, 158, 11, ${(props.progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + props.progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  }),
  ActionDock: AnimalActionDock,
  focusPets: animalFocusPets
};
