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

export interface CompanionStageProps extends CompanionRenderProps {
  size?: number; // 舞台尺寸，默认 200~240px
  focusPhase?: 'focus' | 'break';
  isPaused?: boolean;
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

export interface CompanionAnatomy {
  type: 'css_wheel' | 'lottie_ground' | 'lottie_idle' | 'pixel';
  bodyHeightRatio: number; // 角色高宽在容器里的占比，如 0.6 代表 60%
  mouthAnchor: { left: string; top: string }; // 嘴巴或进食点相对位置
  tagline: string;
}

/**
 * 浮窗伴侣主题协议 (ICompanionTheme)
 * 归一化定义全局唯一的动态伴侣主角，统一输出浮窗、投喂接纳与时钟特写
 */
export interface ICompanionTheme {
  id: string;
  name: string;
  category: 'animal' | 'mecha' | 'minimal';
  description: string;
  icon: string;
  tagline?: string;
  author?: string;
  badge?: string;
  accentColor?: string;
  styleTag?: 'vector' | 'lottie' | 'mecha'; // 风格标签：极简矢量 / 开源手绘 / 赛博未来
  
  // 1. 悬浮微型伴侣小组件渲染器（纯代码构建的跑轮萌宠或矢量动画）
  CompanionWidget: React.FC<CompanionRenderProps>;

  // 1.1 可选：伴侣主按钮容器的动态视觉样式（由伴侣主题定义外观微光/边框/阴影）
  getCompanionButtonStyle?: (props: CompanionRenderProps) => React.CSSProperties;

  // 1.2 可选：大舞台渲染器（用于番茄时钟/沉浸式专注模式，100% 同源缩放）
  CompanionStage?: React.FC<CompanionStageProps>;

  // 1.3 伴侣形态与锚点元数据（供观察对比不同动物的高矮、嘴巴坐标）
  anatomy?: CompanionAnatomy;

  // 2. 兼容性支持：底部手势动作领地渲染器（向后兼容）
  ActionDock?: React.FC<ActionDockRenderProps>;

  // 3. 兼容性支持：专注时钟陪伴宠物配置（向后兼容）
  focusPets?: FocusPetConfig[];
}

// 保持历史命名别名兼容
export type ISkinPlugin = ICompanionTheme;
