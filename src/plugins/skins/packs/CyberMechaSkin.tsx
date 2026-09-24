import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldAlert, Cpu, Orbit, Sparkles, Terminal, Activity } from 'lucide-react';
import { ISkinPlugin, CompanionRenderProps, ActionDockRenderProps, FocusPetConfig } from '../types';

/**
 * 赛博机甲风皮肤包 (Cyber Mecha Theme Skin)
 * 包含：量子核心悬浮球、赛博引力领地（黑洞粉碎、曲率跃迁、量子收容）与机械智械陪伴
 */

const CyberCompanionWidget: React.FC<CompanionRenderProps> = ({ isBlinking, isAllCompleted }) => {
  return (
    <div 
      className="absolute inset-[3px] rounded-full flex items-center justify-center overflow-hidden border transition-all duration-300"
      style={{
        background: 'radial-gradient(circle at 35% 35%, #0f172a 0%, #020617 100%)',
        borderColor: isAllCompleted ? '#34d399' : '#06b6d4',
        boxShadow: isAllCompleted 
          ? '0 0 16px rgba(52, 211, 153, 0.6), inset 0 0 6px rgba(52, 211, 153, 0.4)'
          : '0 0 16px rgba(6, 182, 212, 0.6), inset 0 0 6px rgba(6, 182, 212, 0.4)'
      }}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Rotating Energy Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 pointer-events-none"
        />
        {/* Cyber Core Aperture */}
        {isBlinking ? (
          <div className="w-3 h-0.5 bg-cyan-300 shadow-[0_0_8px_#22d3ee] rounded-full" />
        ) : isAllCompleted ? (
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] flex items-center justify-center">
            <Zap className="w-2 h-2 text-slate-950" />
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-pulse" />
        )}
      </div>
    </div>
  );
};

const CyberActionDock: React.FC<ActionDockRenderProps> = ({
  isVisible,
  activeTarget,
  chompingAction
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="bottom-cyber-dock"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute bottom-0 inset-x-0 z-30 pointer-events-none select-none overflow-visible"
          style={{
            background: 'linear-gradient(to top, rgba(2, 6, 23, 0.92) 0%, rgba(15, 23, 42, 0.6) 60%, transparent 100%)'
          }}
        >
          <div className="w-full h-36 grid grid-cols-3 relative px-2 sm:px-4 overflow-visible">
            {/* 领地 1：黑洞湮灭仓 (删除) */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'delete' ? 'filter drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]' : ''
              }`}
            >
              <AnimatePresence>
                {chompingAction === 'delete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-rose-300 font-mono text-[10.5px] bg-slate-950/90 px-3 py-1 rounded-full border border-rose-500/60 shadow-2xl backdrop-blur-md"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span>目标已进入黑洞视界 · 湮灭完成</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative mb-1 flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/80 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <Orbit className={`w-8 h-8 text-rose-400 transition-transform duration-300 ${activeTarget === 'delete' ? 'scale-125 animate-spin' : ''}`} />
              </div>

              <div className="relative z-10 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono flex items-center gap-1 transition-all ${
                  activeTarget === 'delete'
                    ? 'bg-rose-600 text-white font-bold shadow-[0_0_16px_rgba(244,63,94,0.9)]'
                    : 'text-rose-300 bg-slate-900/60 border border-rose-500/30'
                }`}>
                  <ShieldAlert className="w-3 h-3" />
                  <span>黑洞湮灭 · 删除</span>
                </span>
              </div>
            </div>

            {/* 领地 2：时空曲率舱 (延后) */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'defer' ? 'filter drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]' : ''
              }`}
            >
              <AnimatePresence>
                {chompingAction === 'defer' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-amber-300 font-mono text-[10.5px] bg-slate-950/90 px-3 py-1 rounded-full border border-amber-500/60 shadow-2xl backdrop-blur-md"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>时间曲率展开 · 任务已跃迁至未来</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative mb-1 flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/80 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <Cpu className={`w-8 h-8 text-amber-400 transition-transform duration-300 ${activeTarget === 'defer' ? 'scale-125 animate-pulse' : ''}`} />
              </div>

              <div className="relative z-10 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono flex items-center gap-1 transition-all ${
                  activeTarget === 'defer'
                    ? 'bg-amber-600 text-white font-bold shadow-[0_0_16px_rgba(245,158,11,0.9)]'
                    : 'text-amber-300 bg-slate-900/60 border border-amber-500/30'
                }`}>
                  <Activity className="w-3 h-3" />
                  <span>时空跃迁 · 延后</span>
                </span>
              </div>
            </div>

            {/* 领地 3：量子收容舱 (完成) */}
            <div
              className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-200 overflow-visible ${
                activeTarget === 'complete' ? 'filter drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]' : ''
              }`}
            >
              <AnimatePresence>
                {chompingAction === 'complete' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 8 }}
                    animate={{ scale: 1.05, opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-1 z-30 flex items-center gap-1.5 text-emerald-300 font-mono text-[10.5px] bg-slate-950/90 px-3 py-1 rounded-full border border-emerald-500/60 shadow-2xl backdrop-blur-md"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                    <span>能量收容完毕 · 效率 +100%</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative mb-1 flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/80 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Zap className={`w-8 h-8 text-emerald-400 transition-transform duration-300 ${activeTarget === 'complete' ? 'scale-125' : ''}`} />
              </div>

              <div className="relative z-10 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono flex items-center gap-1 transition-all ${
                  activeTarget === 'complete'
                    ? 'bg-emerald-600 text-white font-bold shadow-[0_0_16px_rgba(16,185,129,0.9)]'
                    : 'text-emerald-300 bg-slate-900/60 border border-emerald-500/30'
                }`}>
                  <Zap className="w-3 h-3" />
                  <span>量子收容 · 完成</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const cyberFocusPets: FocusPetConfig[] = [
  {
    id: 'cyber-core',
    name: '量子核心',
    image: '/assets/animals/hamster.webp',
    cherryCenter: { left: '20%', top: '16%' },
    biteDirection: 'left',
    tagline: '高能粒子凝聚核心，专注超频运转'
  },
  {
    id: 'dino-mecha',
    name: '机械暴龙',
    image: '/assets/animals/dino.webp',
    cherryCenter: { left: '60%', top: '20%' },
    biteDirection: 'left',
    tagline: '钢铁合金霸王龙，粉碎拖延'
  }
];

export const CyberMechaSkin: ISkinPlugin = {
  id: 'cyber-mecha',
  name: '赛博机甲风',
  description: '量子力学与霓虹冷光，黑洞视界湮灭与时空跃迁',
  icon: '⚡',
  author: 'CherryTodo Studio',
  CompanionWidget: CyberCompanionWidget,
  ActionDock: CyberActionDock,
  focusPets: cyberFocusPets
};
