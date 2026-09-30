import React from 'react';
import { ICompanionTheme, CompanionRenderProps, CompanionStageProps } from '../types';
import { CuteAnimalSkin } from './CuteAnimalSkin';
import { LottieCompanionWidget } from '../../../components/companions/LottieCompanionWidget';

const CuteDogWidget: React.FC<CompanionRenderProps> = (props) => {
  return (
    <LottieCompanionWidget
      animationPath="/assets/lottie/cute_dog.json"
      size={44}
      activityState={props.activityState}
      name="Cute Dog"
    />
  );
};

const CuteDogStage: React.FC<CompanionStageProps> = ({
  size = 220,
  focusPhase = 'focus',
  isPaused = false
}) => {
  const isBreak = focusPhase === 'break';
  const stageState = isBreak ? 'sleeping' : isPaused ? 'stopped' : 'running';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <LottieCompanionWidget
        animationPath="/assets/lottie/cute_dog.json"
        size={size}
        activityState={stageState}
        name="Cute Dog Stage"
      />
    </div>
  );
};

export const CuteDogSkin: ICompanionTheme = {
  id: 'cute-dog',
  name: '可爱小狗',
  category: 'animal',
  styleTag: 'lottie',
  description: '活泼开朗的小黄狗，满心欢喜地摇摆跑跳，充满元气。',
  icon: '🐶',
  tagline: '元气摇尾，活力四射的桌面忠诚伴侣',
  badge: '精选 Lottie',
  author: 'Vitra',
  accentColor: '#ea580c',
  CompanionWidget: CuteDogWidget,
  CompanionStage: CuteDogStage,
  anatomy: {
    type: 'lottie_ground',
    initialFacing: 'left',
    bodyHeightRatio: 0.65,
    mouthAnchor: { left: '34%', top: '42%' },
    tagline: '开朗活泼型：头部昂扬，嘴部位于前侧左上方'
  },
  getCompanionButtonStyle: (props: CompanionRenderProps) => ({
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, #ffedd5 ${Math.round(props.progressRatio * 5)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `${(1.2 + props.progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(props.progressRatio * 60)}%, #ea580c ${Math.round(props.progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(props.progressRatio * 4)}px ${8 + Math.round(props.progressRatio * 10)}px rgba(0,0,0,${(0.1 + props.progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(props.progressRatio * 12)}px rgba(234, 88, 12, ${(props.progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + props.progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  }),
  ActionDock: CuteAnimalSkin.ActionDock,
  focusPets: CuteAnimalSkin.focusPets
};
