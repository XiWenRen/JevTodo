import React from 'react';
import { Sparkles } from 'lucide-react';
import { ICompanionTheme, CompanionRenderProps } from '../types';
import { CuteAnimalSkin } from './CuteAnimalSkin';

/**
 * 跑轮萌猫伴侣组件 (Cat Companion on Wheel)
 * 纯 CSS / SVG 矢量几何动力学打造：
 * - 灵动直立三角尖耳（带粉嫩内耳廓与迎风微颤）
 * - 3.8em 弧形优雅长猫尾（波浪形动力学摆动）
 * - 踏雪白手套爪子（白袜肉垫）
 * - 专注猫瞳与精致小胡须
 * - 7 级平滑状态机：飞驰踏轮、慢走、线性减速、停步站定、慢慢揣手趴下、猫猫虫熟睡
 */
const CatCompanionWidget: React.FC<CompanionRenderProps> = ({
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
        /* 纯 CSS 矢量跑轮萌猫 (Cat on Wheel Engine) */
        /* ============================================================ */
        .cat-kinetic-energy-comet {
          position: absolute;
          inset: -2.5px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 110deg,
            rgba(249, 115, 22, 0.2) 200deg,
            rgba(249, 115, 22, 0.75) 290deg,
            #fb923c 335deg,
            #fed7aa 355deg,
            #ffffff 360deg
          );
          -webkit-mask: radial-gradient(circle, transparent 20px, black 21.5px);
          mask: radial-gradient(circle, transparent 20px, black 21.5px);
          animation: wheelSpinClockwise 0.38s linear infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 6px rgba(249, 115, 22, 0.65));
          z-index: 5;
        }

        .cat-wheel-container {
          --dur: ${animDur};
          position: relative;
          width: 12em;
          height: 12em;
          font-size: 3.65px;
          pointer-events: none;
        }

        .cat-wheel-container .cat-wheel-track,
        .cat-wheel-container .cat-wheel-spinner,
        .cat-wheel-container .cat-facing-right,
        .cat-wheel-container .cat-unit,
        .cat-wheel-container .cat-unit div {
          position: absolute;
        }

        /* 1. 平滑水晶跑轮外轨 (暖珊瑚/蜜桃琥珀质感，随完成度加深显色) */
        .cat-wheel-container .cat-wheel-track {
          border-radius: 50%;
          inset: 0;
          z-index: 1;
          opacity: ${(0.28 + progressRatio * 0.72).toFixed(2)};
          background: radial-gradient(100% 100% at center, transparent 48%, hsla(24, ${Math.round(40 + progressRatio * 50)}%, ${Math.round(88 - progressRatio * 10)}%, ${(0.15 + progressRatio * 0.65).toFixed(2)}) 48.5%);
          border: ${(0.18 + progressRatio * 0.1).toFixed(2)}em solid rgba(249, 115, 22, ${(0.18 + progressRatio * 0.68).toFixed(2)});
          box-shadow: inset 0 0 ${(0.3 + progressRatio * 0.4).toFixed(2)}em rgba(249, 115, 22, ${(0.06 + progressRatio * 0.22).toFixed(2)});
          transition: opacity 0.8s ease, border 0.8s ease, box-shadow 0.8s ease;
        }

        /* 2. 顺时针旋转跑轮本体 */
        .cat-wheel-container .cat-wheel-spinner {
          inset: 0;
          border-radius: 50%;
          z-index: 2;
          animation: wheelSpinClockwise var(--dur) linear infinite;
          transform-origin: 50% 50%;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          pointer-events: none;
        }

        /* 静止态 (停下站定 / 慢慢趴下 / 熟睡)：停止肢体关键帧摇摆，由 CSS transition 接管平滑姿态 */
        .cat-wheel-container.is-stationary .cat__head,
        .cat-wheel-container.is-stationary .cat__ear,
        .cat-wheel-container.is-stationary .cat__eye,
        .cat-wheel-container.is-stationary .cat__body,
        .cat-wheel-container.is-stationary .cat__limb--fr,
        .cat-wheel-container.is-stationary .cat__limb--fl,
        .cat-wheel-container.is-stationary .cat__limb--br,
        .cat-wheel-container.is-stationary .cat__limb--bl,
        .cat-wheel-container.is-stationary .cat__tail,
        .cat-wheel-container.is-stationary .cat__whiskers {
          animation: none !important;
        }

        /* 跑轮反光晶莹弧光 */
        .cat-wheel-container .cat-wheel-specular {
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
            rgba(249, 115, 22, ${(0.12 + progressRatio * 0.25).toFixed(2)}) 210deg,
            transparent 240deg
          );
          -webkit-mask: radial-gradient(circle, transparent 5.1em, black 5.3em);
          mask: radial-gradient(circle, transparent 5.1em, black 5.3em);
          transition: opacity 0.8s ease;
        }

        /* 4处跑轮防滑块 */
        .cat-wheel-container .cat-wheel-grip {
          position: absolute;
          border-radius: 0.12em;
          background: rgba(249, 115, 22, ${(0.22 + progressRatio * 0.72).toFixed(2)});
          box-shadow: 0 0 2px rgba(249, 115, 22, ${(0.12 + progressRatio * 0.58).toFixed(2)});
          transition: background 0.8s ease, box-shadow 0.8s ease;
        }
        .cat-wheel-container .cat-wheel-grip-t {
          top: 0.08em;
          left: 50%;
          transform: translateX(-50%);
          width: 0.9em;
          height: 0.22em;
        }
        .cat-wheel-container .cat-wheel-grip-b {
          bottom: 0.08em;
          left: 50%;
          transform: translateX(-50%);
          width: 0.9em;
          height: 0.22em;
        }
        .cat-wheel-container .cat-wheel-grip-l {
          left: 0.08em;
          top: 50%;
          transform: translateY(-50%);
          width: 0.22em;
          height: 0.9em;
        }
        .cat-wheel-container .cat-wheel-grip-r {
          right: 0.08em;
          top: 50%;
          transform: translateY(-50%);
          width: 0.22em;
          height: 0.9em;
        }

        /* 3. 小猫朝右奔跑角色容器 (水平镜像朝右，顺时针驱动跑轮) */
        .cat-wheel-container .cat-facing-right {
          inset: 0;
          transform: scaleX(-1);
          transform-origin: 50% 50%;
          z-index: 3;
        }

        /* 猫咪本体 */
        .cat-wheel-container .cat-unit {
          top: 50%;
          left: calc(50% - 3.5em);
          width: 7.2em;
          height: 4em;
          transform: rotate(3deg) translate(-0.8em, 1.82em);
          transform-origin: 50% 0;
          animation: catUnitAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 停下站定：四爪落稳，身姿挺拔优雅 */
        .cat-wheel-container.is-stopped .cat-unit {
          transform: rotate(2deg) translate(-0.8em, 1.92em);
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 慢慢趴下：身体沉向跑道，揣手手前趴 */
        .cat-wheel-container.is-settling .cat-unit {
          transform: rotate(1deg) translate(-0.8em, 2.22em);
          transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 安稳熟睡：猫猫虫蜷卧，伴随轻柔呼吸起伏 */
        .cat-wheel-container.is-sleeping .cat-unit {
          transform: rotate(0deg) translate(-0.8em, 2.26em);
          animation: catSleepBreath 2.8s ease-in-out infinite !important;
          transition: transform 0.8s ease;
        }

        @keyframes catSleepBreath {
          0%, 100% { transform: rotate(0deg) translate(-0.8em, 2.26em) scale(1, 0.96); }
          50% { transform: rotate(0deg) translate(-0.8em, 2.33em) scale(0.98, 1.02); }
        }

        /* 躯干 (柔韧流线型脊背，带温暖蜜桃橘与暖白肚皮) */
        .cat-wheel-container .cat__body {
          animation: catBodyAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(135deg, #fb923c 62%, #ffedd5 62%);
          border-radius: 52% 45% 48% 46% / 32% 58% 40% 55%;
          box-shadow: 0.12em 0.7em 0 #ea580c inset,
                      0.15em -0.45em 0 #fed7aa inset;
          top: 0.25em;
          left: 2em;
          width: 4.5em;
          height: 2.85em;
          transform-origin: 17% 50%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .cat-wheel-container.is-stopped .cat__body { transform: rotate(0deg); }
        .cat-wheel-container.is-settling .cat__body { transform: rotate(0deg); }
        .cat-wheel-container.is-sleeping .cat__body { transform: rotate(0deg); }

        /* 猫咪头部 */
        .cat-wheel-container .cat__head {
          animation: catHeadAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: #fb923c;
          border-radius: 68% 45% 32% 88% / 52% 42% 38% 58%;
          box-shadow: 0 -0.22em 0 #ea580c inset,
                      0.65em -1.35em 0 #ffedd5 inset;
          top: -0.15em;
          left: -1.95em;
          width: 2.75em;
          height: 2.5em;
          transform-origin: 100% 50%;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .cat-wheel-container.is-stopped .cat__head {
          transform: rotate(2deg) translateY(0);
          transition: transform 0.5s ease-out;
        }
        .cat-wheel-container.is-settling .cat__head {
          transform: rotate(1deg) translateY(0.12em);
          transition: transform 0.8s ease;
        }
        .cat-wheel-container.is-sleeping .cat__head {
          transform: rotate(0deg) translateY(0.18em);
          transition: transform 0.8s ease;
        }

        /* 灵动立体双三角尖耳 (外耳橙 + 内耳粉) */
        .cat-wheel-container .cat__ear--near {
          top: -1.15em;
          left: 1.15em;
          width: 1.15em;
          height: 1.35em;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
          background: #fb923c;
          box-shadow: -0.15em 0 0 #ea580c inset;
          transform-origin: 50% 90%;
          animation: catEarAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          transition: transform 0.6s ease;
        }
        .cat-wheel-container .cat__ear--near::after {
          content: '';
          position: absolute;
          inset: 0.18em;
          clip-path: polygon(50% 12%, 18% 95%, 82% 95%);
          background: #fca5a5;
        }

        .cat-wheel-container .cat__ear--far {
          top: -1.05em;
          left: 0.25em;
          width: 1.05em;
          height: 1.25em;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
          background: #ea580c;
          transform-origin: 50% 90%;
          animation: catEarAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          transition: transform 0.6s ease;
        }
        .cat-wheel-container .cat__ear--far::after {
          content: '';
          position: absolute;
          inset: 0.18em;
          clip-path: polygon(50% 12%, 18% 95%, 82% 95%);
          background: #f87171;
        }

        /* 猫咪眼睛 (炯炯有神圆瞳 -> 半眯惬意 -> 弯弯闭眼熟睡) */
        .cat-wheel-container .cat__eye {
          position: absolute;
          background-color: #0f172a;
          border-radius: 50%;
          top: 0.38em;
          left: 1.22em;
          width: 0.58em;
          height: 0.58em;
          animation: catEyeAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .cat-wheel-container .cat__eye::after {
          content: '';
          position: absolute;
          top: 0.08em;
          right: 0.1em;
          width: 0.2em;
          height: 0.2em;
          border-radius: 50%;
          background: #ffffff;
          opacity: 0.9;
        }

        /* 停下站定：双目圆睁专注 */
        .cat-wheel-container.is-stopped .cat__eye {
          height: 0.58em;
          border-radius: 50%;
          transform: none;
          background-color: #0f172a;
          transition: all 0.5s ease-out;
        }

        /* 慢慢趴下：眼睛半闭，眼神柔和放松 */
        .cat-wheel-container.is-settling .cat__eye {
          height: 0.24em;
          border-radius: 0.12em;
          background-color: #7c2d12;
          transform: translateY(0.12em);
          transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* 熟睡：幸福的弯弯笑眼闭目弧度 */
        .cat-wheel-container.is-sleeping .cat__eye {
          height: 0.12em;
          border-radius: 0.06em;
          background-color: #9a3412;
          transform: translateY(0.2em);
          transition: all 0.6s ease;
        }

        /* 精致小粉鼻 */
        .cat-wheel-container .cat__nose {
          position: absolute;
          background: #fb7185;
          border-radius: 40% 40% 60% 60%;
          top: 0.78em;
          left: 0.05em;
          width: 0.26em;
          height: 0.22em;
        }

        /* 萌系小胡须 (左右各双线纤细白胡须) */
        .cat-wheel-container .cat__whiskers {
          position: absolute;
          top: 0.86em;
          left: 0.25em;
          width: 1.1em;
          height: 0.45em;
          pointer-events: none;
        }
        .cat-wheel-container .cat__whisker--1,
        .cat-wheel-container .cat__whisker--2 {
          position: absolute;
          height: 0.08em;
          background: rgba(255, 255, 255, 0.85);
          border-radius: 0.04em;
          transform-origin: 0% 50%;
        }
        .cat-wheel-container .cat__whisker--1 {
          top: 0.04em;
          left: 0;
          width: 0.85em;
          transform: rotate(-7deg);
        }
        .cat-wheel-container .cat__whisker--2 {
          top: 0.22em;
          left: 0;
          width: 0.75em;
          transform: rotate(8deg);
        }

        /* 前爪 (踏雪白手套 FR / FL) */
        .cat-wheel-container .cat__limb--fr,
        .cat-wheel-container .cat__limb--fl {
          clip-path: polygon(0 0, 100% 0, 80% 82%, 70% 100%, 0% 100%, 25% 82%);
          top: 2em;
          left: 0.55em;
          width: 0.95em;
          height: 1.6em;
          transform-origin: 50% 0;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .cat-wheel-container .cat__limb--fr {
          animation: catFRLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(#fb923c 62%, #ffffff 62%);
          transform: rotate(15deg) translateZ(-1px);
        }

        .cat-wheel-container .cat__limb--fl {
          animation: catFLLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(#f97316 62%, #ffffff 62%);
          transform: rotate(15deg);
        }

        /* 停下站定：双前爪端正垂直落于底轨 */
        .cat-wheel-container.is-stopped .cat__limb--fr {
          transform: rotate(8deg) translateY(0.02em);
        }
        .cat-wheel-container.is-stopped .cat__limb--fl {
          transform: rotate(6deg) translateY(0.02em);
        }

        /* 趴下揣手手 (Loafing) */
        .cat-wheel-container.is-settling .cat__limb--fr,
        .cat-wheel-container.is-settling .cat__limb--fl {
          transform: rotate(4deg) translateY(0.18em) scaleY(0.78);
        }

        /* 熟睡揣爪 */
        .cat-wheel-container.is-sleeping .cat__limb--fr,
        .cat-wheel-container.is-sleeping .cat__limb--fl {
          transform: rotate(2deg) translateY(0.24em) scaleY(0.62);
        }

        /* 后肢 (稳健踏步 BR / BL) */
        .cat-wheel-container .cat__limb--br,
        .cat-wheel-container .cat__limb--bl {
          border-radius: 0.75em 0.75em 0 0;
          clip-path: polygon(0 0, 100% 0, 100% 30%, 75% 90%, 70% 100%, 25% 100%, 35% 90%, 0% 30%);
          top: 0.95em;
          left: 2.85em;
          width: 1.5em;
          height: 2.6em;
          transform-origin: 50% 30%;
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .cat-wheel-container .cat__limb--br {
          animation: catBRLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(#ea580c 65%, #ffffff 65%);
          transform: rotate(-25deg) translateZ(-1px);
        }

        .cat-wheel-container .cat__limb--bl {
          animation: catBLLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(#fb923c 65%, #ffffff 65%);
          transform: rotate(-25deg);
        }

        /* 停下站定：双后肢平稳支撑底轨 */
        .cat-wheel-container.is-stopped .cat__limb--br {
          transform: rotate(-12deg) translateY(0.02em);
        }
        .cat-wheel-container.is-stopped .cat__limb--bl {
          transform: rotate(-10deg) translateY(0.02em);
        }

        /* 趴下内收 */
        .cat-wheel-container.is-settling .cat__limb--br,
        .cat-wheel-container.is-settling .cat__limb--bl {
          transform: rotate(-10deg) translateY(0.14em) scaleY(0.82);
        }

        /* 熟睡蜷曲 */
        .cat-wheel-container.is-sleeping .cat__limb--br,
        .cat-wheel-container.is-sleeping .cat__limb--bl {
          transform: rotate(-8deg) translateY(0.2em) scaleY(0.65);
        }

        /* 优雅修长猫尾 (Signature 3.8em 波浪长尾，白尾尖) */
        .cat-wheel-container .cat__tail {
          animation: catTailAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(to right, #ea580c 75%, #ffedd5 75%);
          border-radius: 0.24em;
          box-shadow: 0 -0.15em 0 #c2410c inset;
          top: 1.15em;
          right: -2.35em;
          width: 3.8em;
          height: 0.48em;
          transform: rotate(38deg) translateZ(-1px);
          transform-origin: 0.2em 50%;
          transition: transform 0.6s ease;
        }

        .cat-wheel-container.is-stopped .cat__tail {
          transform: rotate(28deg);
        }
        .cat-wheel-container.is-settling .cat__tail {
          transform: rotate(18deg);
        }
        .cat-wheel-container.is-sleeping .cat__tail {
          transform: rotate(10deg);
        }

        /* 关键帧动画：小猫奔跑体态 */
        @keyframes catUnitAnim {
          from, to { transform: rotate(3deg) translate(-0.8em, 1.82em); }
          50% { transform: rotate(0deg) translate(-0.8em, 1.82em); }
        }

        @keyframes catHeadAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(6deg); }
        }

        @keyframes catEyeAnim {
          from, 90%, to { transform: scaleY(1); }
          95% { transform: scaleY(0.15); }
        }

        @keyframes catEarAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(8deg); }
        }

        @keyframes catBodyAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(-2deg); }
        }

        @keyframes catFRLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(45deg) translateZ(-1px); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(-28deg) translateZ(-1px); }
        }

        @keyframes catFLLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(-28deg); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(45deg); }
        }

        @keyframes catBRLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(-55deg) translateZ(-1px); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(20deg) translateZ(-1px); }
        }

        @keyframes catBLLimbAnim {
          from, 25%, 50%, 75%, to { transform: rotate(20deg); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(-55deg); }
        }

        /* 长猫尾波浪起伏平衡动效 */
        @keyframes catTailAnim {
          from, 25%, 50%, 75%, to { transform: rotate(42deg) translateZ(-1px); }
          12.5%, 62.5% { transform: rotate(62deg) translateZ(-1px); }
          37.5%, 87.5% { transform: rotate(22deg) translateZ(-1px); }
        }
      `}</style>

      {/* 奔跑冲刺时激发的动态能量流光 */}
      <div
        className="cat-kinetic-energy-comet"
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
            className="absolute -top-1.5 -right-0.5 text-[10px] text-orange-400 font-bold animate-pulse"
            style={{ animationDuration: '0.6s' }}
          >
            ✦
          </span>
          <span 
            className="absolute -bottom-1 -left-0.5 text-[8px] text-amber-300 font-bold animate-pulse"
            style={{ animationDuration: '0.9s' }}
          >
            ✦
          </span>
        </div>
      )}

      {/* 纯 CSS 矢量跑轮萌猫容器 */}
      <div className={`cat-wheel-container ${isStationary ? 'is-stationary' : ''} ${isSleeping ? 'is-sleeping' : isSettling ? 'is-settling' : isStopped ? 'is-stopped' : ''}`}>
        {/* 1. 水晶跑轮外轨 */}
        <div className="cat-wheel-track" />

        {/* 2. 顺时针旋转跑轮本体 */}
        <div className="cat-wheel-spinner">
          <div className="cat-wheel-specular" />
          <div className="cat-wheel-grip cat-wheel-grip-t" />
          <div className="cat-wheel-grip cat-wheel-grip-r" />
          <div className="cat-wheel-grip cat-wheel-grip-b" />
          <div className="cat-wheel-grip cat-wheel-grip-l" />
        </div>

        {/* 3. 小猫朝右奔跑角色容器 */}
        <div className="cat-facing-right">
          <div className="cat-unit">
            <div className="cat__body">
              <div className="cat__head">
                <div className="cat__ear cat__ear--far" />
                <div className="cat__ear cat__ear--near" />
                <div className="cat__eye" />
                <div className="cat__nose" />
                <div className="cat__whiskers">
                  <div className="cat__whisker--1" />
                  <div className="cat__whisker--2" />
                </div>
              </div>
              <div className="cat__limb cat__limb--fr" />
              <div className="cat__limb cat__limb--fl" />
              <div className="cat__limb cat__limb--br" />
              <div className="cat__limb cat__limb--bl" />
              <div className="cat__tail" />
            </div>
          </div>
        </div>
      </div>

      {/* 熟睡飘出的 Zzz 气泡 */}
      {isSleeping && (
        <div className="absolute top-1 right-2 pointer-events-none font-mono font-bold select-none z-20">
          <span 
            className="absolute text-[8px] text-orange-500/90 font-bold"
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

export const CatCompanionSkin: ICompanionTheme = {
  id: 'cat-orange',
  name: '元气小猫',
  category: 'animal',
  description: '纯代码打造的可爱跑轮小猫！直立三角耳、灵动长猫尾、轻盈踏雪白爪与揣手手母鸡蹲休息姿态。',
  icon: '🐱',
  tagline: '三角立耳与摇摆长尾，小跑揣手陪伴你的每一刻',
  author: 'CherryTodo Studio',
  badge: '全新形象',
  accentColor: '#f97316',
  CompanionWidget: CatCompanionWidget,
  getCompanionButtonStyle: (props) => ({
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, #ffedd5 ${Math.round(props.progressRatio * 6)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `${(1.2 + props.progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(props.progressRatio * 60)}%, #f97316 ${Math.round(props.progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(props.progressRatio * 4)}px ${8 + Math.round(props.progressRatio * 10)}px rgba(0,0,0,${(0.1 + props.progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(props.progressRatio * 12)}px rgba(249, 115, 22, ${(props.progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + props.progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  }),
  ActionDock: CuteAnimalSkin.ActionDock,
  focusPets: [
    {
      id: 'cat-pet',
      name: '小猫咪',
      image: '/assets/animals/hamster.webp', // 兼容后备
      cherryCenter: { left: '30%', top: '25%' },
      biteDirection: 'left',
      tagline: '优雅品尝樱桃，为你专注计时'
    },
    ...(CuteAnimalSkin.focusPets || [])
  ]
};
