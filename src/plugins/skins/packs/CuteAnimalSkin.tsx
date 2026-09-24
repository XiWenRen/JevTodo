import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Star, Sparkles, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { ISkinPlugin, CompanionRenderProps, ActionDockRenderProps, FocusPetConfig } from '../types';

/**
 * 经典萌宠动物园皮肤包 (Cute Animal Kingdom Skin)
 * 包含：纯 CSS 水晶跑轮小仓鼠、底部三小动物领地（恐龙删除、树懒延后、仓鼠完成）与专注时钟萌宠
 */

const AnimalCompanionWidget: React.FC<CompanionRenderProps> = ({
  progressRatio,
  activityState,
  animDur,
  isStationary,
  isStopped,
  isSettling,
  isSleeping
}) => {
  return (
    <>
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
    </>
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

              {/* 2D 侧面小恐龙图片 (跳起接住抛物线樱桃！) */}
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

              {/* 2D 侧面树懒图片 (跳起接住樱桃！) */}
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

              {/* 2D 侧面小松鼠图片 (跳起接住樱桃！) */}
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

export const CuteAnimalSkin: ISkinPlugin = {
  id: 'cute-animal',
  name: '经典萌宠王国',
  description: '纯 CSS 跑轮仓鼠伴侣、恐龙树懒仓鼠三萌宠领地与樱桃时钟陪伴',
  icon: '🐹',
  author: 'CherryTodo Studio',
  CompanionWidget: AnimalCompanionWidget,
  getCompanionButtonStyle: (props) => ({
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
