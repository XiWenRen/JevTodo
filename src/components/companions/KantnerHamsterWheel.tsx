import React from 'react';
import { CompanionActivityState } from '../../plugins/skins/types';

export interface HamsterWheelProps {
  size?: number; // 容器像素尺寸，默认 48
  activityState?: CompanionActivityState;
  animDur?: string;
  progressRatio?: number;
  isStationary?: boolean;
  isStopped?: boolean;
  isSettling?: boolean;
  isSleeping?: boolean;
  showTrack?: boolean;
  showSpecular?: boolean;
  showComet?: boolean;
  showZzz?: boolean;
  showWheel?: boolean; // 是否显示跑轮外环与旋转支架，为 false 时只呈现独立活泼小仓鼠
}

/**
 * Jon Kantner 经典纯代码水晶跑轮小仓鼠核心渲染引擎
 * 基于 em 相对度量衡，支持 48px 微型浮窗 ↔ 240px+ 专注时钟大舞台无损等比缩放
 */
export const KantnerHamsterWheel: React.FC<HamsterWheelProps> = ({
  size = 48,
  activityState = 'running',
  animDur = '0.34s',
  progressRatio = 0,
  isStationary: propStationary,
  isStopped: propStopped,
  isSettling: propSettling,
  isSleeping: propSleeping,
  showTrack = true,
  showSpecular = true,
  showComet = true,
  showZzz = true,
  showWheel = true
}) => {
  const isStopped = propStopped ?? (activityState === 'stopped');
  const isSettling = propSettling ?? (activityState === 'settling');
  const isSleeping = propSleeping ?? (activityState === 'sleeping');
  const isStationary = propStationary ?? (isStopped || isSettling || isSleeping);

  // 基准尺寸为 48px 时对应 font-size 3.65px，等比缩放
  const computedFontSize = (size / 48) * 3.65;

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none overflow-visible"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <style>{`
        .kinetic-energy-comet-${size} {
          position: absolute;
          inset: -${(size * 0.05).toFixed(1)}px;
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
          -webkit-mask: radial-gradient(circle, transparent ${(size * 0.41).toFixed(1)}px, black ${(size * 0.44).toFixed(1)}px);
          mask: radial-gradient(circle, transparent ${(size * 0.41).toFixed(1)}px, black ${(size * 0.44).toFixed(1)}px);
          animation: wheelSpinClockwise 0.4s linear infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 ${(size * 0.1).toFixed(1)}px rgba(245, 158, 11, 0.6));
          z-index: 5;
        }

        .kantner-hamster-wheel-${size} {
          --dur: ${animDur};
          --hamster-y: ${showWheel ? '1.85em' : '0.38em'};
          position: relative;
          width: 12em;
          height: 12em;
          font-size: ${computedFontSize.toFixed(2)}px;
          pointer-events: none;
        }

        .kantner-hamster-wheel-${size} .wheel-track,
        .kantner-hamster-wheel-${size} .wheel-spinner,
        .kantner-hamster-wheel-${size} .hamster-facing-right,
        .kantner-hamster-wheel-${size} .hamster-unit,
        .kantner-hamster-wheel-${size} .hamster-unit div {
          position: absolute;
        }

        .kantner-hamster-wheel-${size} .wheel-track {
          border-radius: 50%;
          inset: 0;
          z-index: 1;
          opacity: ${(0.28 + progressRatio * 0.72).toFixed(2)};
          background: radial-gradient(100% 100% at center, transparent 48%, hsla(38, ${Math.round(35 + progressRatio * 50)}%, ${Math.round(88 - progressRatio * 10)}%, ${(0.15 + progressRatio * 0.65).toFixed(2)}) 48.5%);
          border: ${(0.18 + progressRatio * 0.1).toFixed(2)}em solid rgba(245, 158, 11, ${(0.16 + progressRatio * 0.68).toFixed(2)});
          box-shadow: inset 0 0 ${(0.3 + progressRatio * 0.4).toFixed(2)}em rgba(245, 158, 11, ${(0.05 + progressRatio * 0.22).toFixed(2)});
          transition: opacity 0.8s ease, border 0.8s ease, box-shadow 0.8s ease;
        }

        .kantner-hamster-wheel-${size} .wheel-spinner {
          inset: 0;
          border-radius: 50%;
          z-index: 2;
          animation: wheelSpinClockwise var(--dur) linear infinite;
          transform-origin: 50% 50%;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          pointer-events: none;
        }

        .kantner-hamster-wheel-${size}.is-stationary .hamster__head,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__ear,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__eye,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__body,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__limb--fr,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__limb--fl,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__limb--br,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__limb--bl,
        .kantner-hamster-wheel-${size}.is-stationary .hamster__tail {
          animation: none !important;
        }

        .kantner-hamster-wheel-${size} .wheel-specular {
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

        .kantner-hamster-wheel-${size} .wheel-grip {
          position: absolute;
          border-radius: 0.12em;
          background: rgba(245, 158, 11, ${(0.22 + progressRatio * 0.72).toFixed(2)});
          box-shadow: 0 0 2px rgba(245, 158, 11, ${(0.12 + progressRatio * 0.58).toFixed(2)});
          transition: background 0.8s ease, box-shadow 0.8s ease;
        }
        .kantner-hamster-wheel-${size} .wheel-grip-t {
          top: 0.08em; left: 50%; transform: translateX(-50%); width: 0.9em; height: 0.22em;
        }
        .kantner-hamster-wheel-${size} .wheel-grip-b {
          bottom: 0.08em; left: 50%; transform: translateX(-50%); width: 0.9em; height: 0.22em;
        }
        .kantner-hamster-wheel-${size} .wheel-grip-l {
          left: 0.08em; top: 50%; transform: translateY(-50%); width: 0.22em; height: 0.9em;
        }
        .kantner-hamster-wheel-${size} .wheel-grip-r {
          right: 0.08em; top: 50%; transform: translateY(-50%); width: 0.22em; height: 0.9em;
        }

        /* 仓鼠身体容器：原生朝左奔跑 (正数 scaleX) */
        .kantner-hamster-wheel-${size} .hamster-facing-right {
          inset: 0;
          transform: scaleX(1.16) scaleY(1.16);
          transform-origin: 50% 50%;
          z-index: 3;
        }

        .kantner-hamster-wheel-${size} .hamster-unit {
          top: 50%;
          left: calc(50% - 3.5em);
          width: 7em;
          height: 3.75em;
          transform: rotate(4deg) translate(-0.4em, var(--hamster-y));
          transform-origin: 50% 0;
          animation: hamsterAnim var(--dur) ease-in-out infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel-${size}.is-stopped .hamster-unit {
          transform: rotate(3deg) translate(-0.4em, calc(var(--hamster-y) + 0.1em));
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel-${size}.is-settling .hamster-unit {
          transform: rotate(1deg) translate(-0.4em, calc(var(--hamster-y) + 0.22em));
          transition: transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .kantner-hamster-wheel-${size}.is-sleeping .hamster-unit {
          transform: rotate(0deg) translate(-0.4em, calc(var(--hamster-y) + 0.26em));
          animation: hamsterSleepBreath var(--dur) ease-in-out infinite !important;
          transition: transform 0.8s ease;
        }

        .kantner-hamster-wheel-${size} .hamster__head {
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

        .kantner-hamster-wheel-${size}.is-stopped .hamster__head {
          transform: rotate(2deg) translateY(0);
        }
        .kantner-hamster-wheel-${size}.is-settling .hamster__head {
          transform: rotate(1deg) translateY(0.12em);
        }
        .kantner-hamster-wheel-${size}.is-sleeping .hamster__head {
          transform: rotate(0deg) translateY(0.18em);
        }

        .kantner-hamster-wheel-${size} .hamster__ear {
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
        }

        .kantner-hamster-wheel-${size} .hamster__eye {
          animation: hamsterEyeAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background-color: hsl(0,0%,0%);
          border-radius: 50%;
          top: 0.375em;
          left: 1.25em;
          width: 0.5em;
          height: 0.5em;
        }

        .kantner-hamster-wheel-${size}.is-stopped .hamster__eye {
          border-radius: 50%;
          transform: scale(1);
        }
        .kantner-hamster-wheel-${size}.is-settling .hamster__eye {
          border-radius: 50% 50% 0 0;
          height: 0.25em;
          transform: translateY(0.12em);
        }
        .kantner-hamster-wheel-${size}.is-sleeping .hamster__eye {
          background-color: transparent !important;
          border-bottom: 0.12em solid hsl(30,90%,20%);
          border-radius: 0 0 50% 50%;
          height: 0.22em;
          transform: translateY(0.15em);
        }

        .kantner-hamster-wheel-${size} .hamster__nose {
          background: hsl(0,90%,75%);
          border-radius: 35% 65% 85% 15% / 70% 50% 50% 30%;
          top: 0.75em;
          left: 0;
          width: 0.2em;
          height: 0.25em;
        }

        .kantner-hamster-wheel-${size} .hamster__body {
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
        }

        .kantner-hamster-wheel-${size} .hamster__limb--fr,
        .kantner-hamster-wheel-${size} .hamster__limb--fl {
          clip-path: polygon(0 0,100% 0,70% 80%,60% 100%,0% 100%,40% 80%);
          top: 2em;
          left: 0.5em;
          width: 1em;
          height: 1.5em;
          transform-origin: 50% 0;
        }
        .kantner-hamster-wheel-${size} .hamster__limb--fr {
          animation: hamsterFRLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,80%) 80%, hsl(0,90%,75%) 80%);
          transform: rotate(15deg) translateZ(-1px);
        }
        .kantner-hamster-wheel-${size} .hamster__limb--fl {
          animation: hamsterFLLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,90%) 80%, hsl(0,90%,85%) 80%);
          transform: rotate(15deg);
        }

        .kantner-hamster-wheel-${size} .hamster__limb--br,
        .kantner-hamster-wheel-${size} .hamster__limb--bl {
          border-radius: 0.75em 0.75em 0 0;
          clip-path: polygon(0 0,100% 0,100% 30%,70% 90%,70% 100%,40% 100%,40% 90%,0% 30%);
          top: 1em;
          left: 2.8em;
          width: 1.5em;
          height: 2.5em;
          transform-origin: 50% 30%;
        }
        .kantner-hamster-wheel-${size} .hamster__limb--br {
          animation: hamsterBRLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,80%) 90%, hsl(0,90%,75%) 90%);
          transform: rotate(-25deg) translateZ(-1px);
        }
        .kantner-hamster-wheel-${size} .hamster__limb--bl {
          animation: hamsterBLLimbAnim var(--dur) linear infinite;
          animation-play-state: ${isStationary ? 'paused' : 'running'};
          background: linear-gradient(hsl(30,90%,90%) 90%, hsl(0,90%,85%) 90%);
          transform: rotate(-25deg);
        }

        .kantner-hamster-wheel-${size} .hamster__tail {
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
        }

        /* 纯仓鼠模式（无跑轮）：朝左奔跑与不超出底边的居中高度 */
        .kantner-hamster-wheel-${size}.no-wheel .hamster-facing-right {
          transform: scaleX(1.18) scaleY(1.18);
          transform-origin: 50% 50%;
        }
        .kantner-hamster-wheel-${size}.no-wheel .hamster-unit {
          transform: rotate(2deg) translate(-0.4em, var(--hamster-y));
        }

        /* ======================================================== */
        /* 仓鼠跑步、摆头、蹬腿核心 CSS 动画关键帧 (Keyframes) */
        /* ======================================================== */
        @keyframes wheelSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes hamsterAnim {
          from, to { transform: rotate(4deg) translate(-0.4em, var(--hamster-y, 1.85em)); }
          50% { transform: rotate(0deg) translate(-0.4em, var(--hamster-y, 1.85em)); }
        }

        @keyframes hamsterHeadAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0deg); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(8deg); }
        }

        @keyframes hamsterEyeAnim {
          from, 90%, to { transform: scaleY(1); }
          95% { transform: scaleY(0); }
        }

        @keyframes hamsterEarAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0deg); }
          12.5%, 37.5%, 62.5%, 87.5% { transform: rotate(12deg); }
        }

        @keyframes hamsterBodyAnim {
          from, 25%, 50%, 75%, to { transform: rotate(0deg); }
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

        @keyframes hamsterSleepBreath {
          0%, 100% { transform: rotate(0deg) translate(-0.4em, calc(var(--hamster-y, 1.85em) + 0.28em)) scale(1, 0.96); }
          50% { transform: rotate(0deg) translate(-0.4em, calc(var(--hamster-y, 1.85em) + 0.35em)) scale(0.98, 1.02); }
        }

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

      {/* 能量流光彗星 (奔跑时激发，仅在开启跑轮时展示) */}
      {showWheel && showComet && (
        <div
          className={`kinetic-energy-comet-${size}`}
          style={{
            opacity: activityState === 'running' ? 1 : activityState === 'decelerating' ? 0.35 : 0,
            transition: 'opacity 0.6s ease, transform 0.4s cubic-bezier(0.34, 1.25, 0.64, 1)',
            transform: activityState === 'running' ? 'scale(1)' : 'scale(0.95)'
          }}
        />
      )}

      {/* 纯 CSS 跑轮仓鼠容器 */}
      <div className={`kantner-hamster-wheel-${size} ${!showWheel ? 'no-wheel' : ''} ${isStationary ? 'is-stationary' : ''} ${isSleeping ? 'is-sleeping' : isSettling ? 'is-settling' : isStopped ? 'is-stopped' : ''}`}>
        {/* 跑轮外轨 (仅在 showWheel 时呈现) */}
        {showWheel && showTrack && <div className="wheel-track" />}

        {/* 跑轮旋转体 (仅在 showWheel 时呈现) */}
        {showWheel && (
          <div className="wheel-spinner">
            {showSpecular && <div className="wheel-specular" />}
            <div className="wheel-grip wheel-grip-t" />
            <div className="wheel-grip wheel-grip-r" />
            <div className="wheel-grip wheel-grip-b" />
            <div className="wheel-grip wheel-grip-l" />
          </div>
        )}

        {/* 仓鼠身体容器 (朝右跑) */}
        <div className="hamster-facing-right">
          <div className="hamster-unit">
            <div className="hamster__body">
              <div className="hamster__head">
                <div className="hamster__ear" />
                <div className="hamster__eye" />
                <div className="hamster__nose" />
              </div>
              <div className="hamster__limb hamster__limb--fr" />
              <div className="hamster__limb hamster__limb--fl" />
              <div className="hamster__limb hamster__limb--br" />
              <div className="hamster__limb hamster__limb--bl" />
              <div className="hamster__tail" />
            </div>
          </div>
        </div>
      </div>

      {/* 熟睡气泡 */}
      {showZzz && isSleeping && (
        <div 
          className="absolute pointer-events-none font-mono font-bold select-none z-20"
          style={{ top: `${size * 0.05}px`, right: `${size * 0.1}px` }}
        >
          <span 
            className="absolute text-amber-500/90 font-bold"
            style={{ 
              fontSize: `${Math.max(8, size * 0.08)}px`,
              animation: 'zzz-float-a 2.4s infinite' 
            }}
          >
            z
          </span>
          <span 
            className="absolute text-amber-400/90 font-bold left-2 -top-1"
            style={{ 
              fontSize: `${Math.max(6, size * 0.06)}px`,
              animation: 'zzz-float-b 2.4s 0.8s infinite' 
            }}
          >
            z
          </span>
        </div>
      )}
    </div>
  );
};
