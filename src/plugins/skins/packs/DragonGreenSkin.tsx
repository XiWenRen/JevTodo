import React from 'react';
import { ICompanionTheme, CompanionRenderProps, CompanionStageProps } from '../types';
import { CuteAnimalSkin } from './CuteAnimalSkin';
import { LottieCompanionWidget } from '../../../components/companions/LottieCompanionWidget';

const DragonGreenWidget: React.FC<CompanionRenderProps> = (props) => {
  return (
    <LottieCompanionWidget
      animationPath="/assets/lottie/dragon_green.json"
      size={44}
      activityState={props.activityState}
      name="Green Dragon"
    />
  );
};

const DragonGreenStage: React.FC<CompanionStageProps> = ({
  size = 220,
  focusPhase = 'focus',
  isPaused = false
}) => {
  const isBreak = focusPhase === 'break';
  const stageState = isBreak ? 'sleeping' : isPaused ? 'stopped' : 'running';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <LottieCompanionWidget
        animationPath="/assets/lottie/dragon_green.json"
        size={size}
        activityState={stageState}
        name="Green Dragon Stage"
      />
    </div>
  );
};

export const DragonGreenSkin: ICompanionTheme = {
  id: 'dragon-green',
  name: '萌趣小龙',
  category: 'fantasy',
  styleTag: 'lottie',
  description: '憨态可掬的碧绿小神龙，扇动双翼、凌空腾跃，祥瑞又治愈。',
  icon: '🐲',
  tagline: '凌空扑翼，萌动祥瑞的奇幻小神龙',
  badge: '精选 Lottie',
  author: 'LottieFiles Community',
  accentColor: '#10b981',
  CompanionWidget: DragonGreenWidget,
  CompanionStage: DragonGreenStage,
  anatomy: {
    type: 'lottie_hover',
    bodyHeightRatio: 0.7,
    mouthAnchor: { left: '54%', top: '48%' },
    tagline: '悬浮飞翔型：身形丰满，双翼振动，嘴部位于正面中央略偏左'
  },
  getCompanionButtonStyle: (props: CompanionRenderProps) => ({
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, #d1fae5 ${Math.round(props.progressRatio * 5)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `${(1.2 + props.progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(props.progressRatio * 60)}%, #10b981 ${Math.round(props.progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(props.progressRatio * 4)}px ${8 + Math.round(props.progressRatio * 10)}px rgba(0,0,0,${(0.1 + props.progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(props.progressRatio * 12)}px rgba(16, 185, 129, ${(props.progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + props.progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  }),
  ActionDock: CuteAnimalSkin.ActionDock,
  focusPets: CuteAnimalSkin.focusPets
};
