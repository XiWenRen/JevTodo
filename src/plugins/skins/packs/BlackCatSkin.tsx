import React from 'react';
import { ICompanionTheme, CompanionRenderProps, CompanionStageProps } from '../types';
import { CuteAnimalSkin } from './CuteAnimalSkin';
import { LottieCompanionWidget } from '../../../components/companions/LottieCompanionWidget';

const BlackCatWidget: React.FC<CompanionRenderProps> = (props) => {
  return (
    <LottieCompanionWidget
      animationPath="/assets/lottie/black_cat.json"
      size={44}
      activityState={props.activityState}
      name="Black Cat"
    />
  );
};

const BlackCatStage: React.FC<CompanionStageProps> = ({
  size = 220,
  focusPhase = 'focus',
  isPaused = false
}) => {
  const isBreak = focusPhase === 'break';
  const stageState = isBreak ? 'sleeping' : isPaused ? 'stopped' : 'running';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <LottieCompanionWidget
        animationPath="/assets/lottie/black_cat.json"
        size={size}
        activityState={stageState}
        name="Black Cat Stage"
      />
    </div>
  );
};

export const BlackCatSkin: ICompanionTheme = {
  id: 'black-cat',
  name: '优雅黑猫',
  category: 'animal',
  styleTag: 'lottie',
  description: '由插画师 PoPoF 创作的高级感纯黑猫咪，神态自若，修长优雅。',
  icon: '🐈‍⬛',
  tagline: '静谧神秘，高级质感的艺术家黑猫伴侣',
  badge: '精选 Lottie',
  author: 'PoPoF',
  accentColor: '#6366f1',
  CompanionWidget: BlackCatWidget,
  CompanionStage: BlackCatStage,
  anatomy: {
    type: 'lottie_ground',
    bodyHeightRatio: 0.62,
    mouthAnchor: { left: '52%', top: '45%' },
    tagline: '修长优雅型：纯黑剪影，猫眼灵动，嘴部位于前侧中部'
  },
  getCompanionButtonStyle: (props: CompanionRenderProps) => ({
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, #e0e7ff ${Math.round(props.progressRatio * 5)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `${(1.2 + props.progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(props.progressRatio * 60)}%, #6366f1 ${Math.round(props.progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(props.progressRatio * 4)}px ${8 + Math.round(props.progressRatio * 10)}px rgba(0,0,0,${(0.1 + props.progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(props.progressRatio * 12)}px rgba(99, 102, 241, ${(props.progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + props.progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  }),
  ActionDock: CuteAnimalSkin.ActionDock,
  focusPets: CuteAnimalSkin.focusPets
};
