import React, { useEffect, useRef, useState } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import { CompanionActivityState } from '../../plugins/skins/types';

export interface LottieCompanionProps {
  animationPath?: string; // 静态资源路径或 URL
  animationData?: any; // 直接内联 JSON 数据
  size?: number; // 像素尺寸，默认 48
  activityState?: CompanionActivityState;
  mouthAnchor?: { left: string; top: string }; // 嘴巴或进食点相对位置
  showMouthMarker?: boolean; // 是否在调试/观察模式下高亮嘴巴锚点
  name?: string;
}

/**
 * 官方标准 lottie-web 引擎渲染组件
 * 直接加载标准开源 Bodymovin / Lottie JSON 动画，支持 48px 浮窗 ↔ 240px 大舞台全矢量高清渲染
 */
export const LottieCompanionWidget: React.FC<LottieCompanionProps> = ({
  animationPath,
  animationData,
  size = 48,
  activityState = 'walking',
  mouthAnchor,
  showMouthMarker = false,
  name = 'Lottie Pet'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 初始化加载 Lottie 动画
  useEffect(() => {
    if (!containerRef.current) return;
    if (!animationPath && !animationData) return;

    // 清理旧实例
    if (animRef.current) {
      animRef.current.destroy();
      animRef.current = null;
    }

    setLoadError(null);

    try {
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: activityState !== 'stopped',
        autoplay: activityState !== 'stopped',
        ...(animationData ? { animationData } : { path: animationPath }),
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: true,
          hideOnTransparent: true
        }
      });

      anim.addEventListener('data_failed', () => {
        setLoadError(`Failed to load ${animationPath || name}`);
      });

      anim.addEventListener('error', (e: any) => {
        console.warn(`[Lottie] ${name} error:`, e);
      });

      animRef.current = anim;
    } catch (err: any) {
      console.error(`[Lottie] Exception initializing ${name}:`, err);
      setLoadError(err?.message || 'Init error');
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [animationPath, name]);

  // 根据当前动作状态动态调节播放与播放速率
  useEffect(() => {
    if (!animRef.current) return;

    if (activityState === 'stopped') {
      animRef.current.pause();
    } else {
      animRef.current.play();

      let speed = 1.0;
      if (activityState === 'running') speed = 1.6;
      else if (activityState === 'decelerating') speed = 1.2;
      else if (activityState === 'walking') speed = 0.95;
      else if (activityState === 'slowing') speed = 0.6;
      else if (activityState === 'settling') speed = 0.45;
      else if (activityState === 'sleeping') speed = 0.35;

      animRef.current.setSpeed(speed);
    }
  }, [activityState]);

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none overflow-visible"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {loadError ? (
        <div className="w-full h-full rounded-full bg-rose-500/10 flex items-center justify-center text-[10px] text-rose-500">
          !
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:overflow-visible"
        />
      )}

      {/* 嘴部/投喂点调试标记（用于观察不同宠物体态差异） */}
      {showMouthMarker && mouthAnchor && (
        <div
          className="absolute z-30 pointer-events-none flex items-center justify-center"
          style={{
            left: mouthAnchor.left,
            top: mouthAnchor.top,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <span className="w-4 h-4 rounded-full border-2 border-dashed border-rose-500 animate-spin absolute" />
          <span className="w-2 h-2 rounded-full bg-rose-500 border border-white shadow-md relative" />
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-rose-500 bg-white/95 dark:bg-black/90 px-1 rounded shadow-xs whitespace-nowrap">
            嘴位
          </span>
        </div>
      )}
    </div>
  );
};
