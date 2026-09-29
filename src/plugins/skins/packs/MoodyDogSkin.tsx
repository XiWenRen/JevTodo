import React from 'react';
import { ICompanionTheme, CompanionRenderProps, CompanionStageProps } from '../types';
import { CuteAnimalSkin } from './CuteAnimalSkin';
import { LottieCompanionWidget } from '../../../components/companions/LottieCompanionWidget';

const MoodyDogWidget: React.FC<CompanionRenderProps> = (props) => {
  return (
    <LottieCompanionWidget
      animationPath="/assets/lottie/moody_dog.json"
      size={44}
      activityState={props.activityState}
      name="Moody Dog"
    />
  );
};

const MoodyDogStage: React.FC<CompanionStageProps> = ({
  size = 220,
  focusPhase = 'focus',
  isPaused = false
}) => {
  const isBreak = focusPhase === 'break';
  const stageState = isBreak ? 'sleeping' : isPaused ? 'stopped' : 'running';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <LottieCompanionWidget
        animationPath="/assets/lottie/moody_dog.json"
        size={size}
        activityState={stageState}
        name="Moody Dog Stage"
      />
    </div>
  );
};

export const MoodyDogSkin: ICompanionTheme = {
  id: 'moody-dog',
  name: '情绪小狗',
  category: 'animal',
  styleTag: 'lottie',
  description: '风度翩翩、步态优雅的散步小狗，自带节奏与情绪质感。',
  icon: '🐕',
  tagline: '优雅漫步，自在随心，精美高帧率小狗伴侣',
  badge: '精选 Lottie',
  author: 'Bashir Ahmad',
  accentColor: '#d97706',
  CompanionWidget: MoodyDogWidget,
  CompanionStage: MoodyDogStage,
  anatomy: {
    type: 'lottie_ground',
    bodyHeightRatio: 0.65,
    mouthAnchor: { left: '62%', top: '44%' },
    tagline: '四足步态：身体匀称，头部前倾，嘴部位于前侧中平位'
  },
  getCompanionButtonStyle: (props: CompanionRenderProps) => ({
    backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, #fef3c7 ${Math.round(props.progressRatio * 5)}%)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `${(1.2 + props.progressRatio * 0.6).toFixed(1)}px solid color-mix(in srgb, var(--border-medium) ${40 + Math.round(props.progressRatio * 60)}%, #d97706 ${Math.round(props.progressRatio * 55)}%)`,
    boxShadow: `0 ${2 + Math.round(props.progressRatio * 4)}px ${8 + Math.round(props.progressRatio * 10)}px rgba(0,0,0,${(0.1 + props.progressRatio * 0.16).toFixed(2)}), 0 0 ${Math.round(props.progressRatio * 12)}px rgba(217, 119, 6, ${(props.progressRatio * 0.28).toFixed(2)}), inset 0 1px 1px rgba(255,255,255,${(0.1 + props.progressRatio * 0.22).toFixed(2)})`,
    transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
  }),
  ActionDock: CuteAnimalSkin.ActionDock,
  focusPets: CuteAnimalSkin.focusPets
};
