import React from 'react';
import { GestureActionType } from '../../components/TaskGestureOverlay';

export type CompanionActivityState = 
  | 'running' 
  | 'decelerating' 
  | 'walking' 
  | 'slowing' 
  | 'stopped' 
  | 'settling' 
  | 'sleeping';

export interface CompanionRenderProps {
  progressPercent: number;
  progressRatio: number;
  isAllCompleted: boolean;
  activityState: CompanionActivityState;
  animDur: string;
  isStationary: boolean;
  isStopped: boolean;
  isSettling: boolean;
  isSleeping: boolean;
  isHovered: boolean;
}

export interface ActionDockRenderProps {
  isVisible: boolean;
  activeTarget: GestureActionType;
  chompingAction: GestureActionType | null;
  jumpingAnimal?: GestureActionType | null;
}

export interface FocusPetConfig {
  id: string;
  name: string;
  image: string;
  cherryCenter: {
    left: string;
    top: string;
  };
  biteDirection: 'left' | 'right' | 'top';
  tagline?: string;
}

export interface ISkinPlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  author?: string;
  
  // 1. 悬浮微型伴侣小组件渲染器（原小仓鼠挂件表现）
  CompanionWidget: React.FC<CompanionRenderProps>;

  // 1.1 可选：伴侣主按钮容器的动态视觉样式（由皮肤定义外观微光/边框/阴影）
  getCompanionButtonStyle?: (props: CompanionRenderProps) => React.CSSProperties;

  // 2. 底部手势动作领地渲染器（原三小动物进食领地表现）
  ActionDock: React.FC<ActionDockRenderProps>;

  // 3. 专注时钟陪伴宠物列表与交互配置（原樱桃时钟宠物）
  focusPets: FocusPetConfig[];
}
