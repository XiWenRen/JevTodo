import React from 'react';
import { GestureActionType } from './TaskGestureOverlay';
import { useActiveSkin } from '../plugins/skins/SkinRegistry';

interface BottomAnimalDockProps {
  isVisible: boolean;
  activeTarget: GestureActionType;
  chompingAnimal: GestureActionType | null;
}

/**
 * 底部手势操作领地容器 (BottomActionDockContainer)
 * 核心业务层：监听手势拖拽目标 (activeTarget) 与进食触发 (chompingAnimal)
 * 表现层：完全委托给当前激活的皮肤插件 (activeSkin.ActionDock) 渲染
 */
export const BottomAnimalDock: React.FC<BottomAnimalDockProps> = ({
  isVisible,
  activeTarget,
  chompingAnimal
}) => {
  const { activeSkin } = useActiveSkin();
  const ActionDockComponent = activeSkin.ActionDock;

  return (
    <ActionDockComponent
      isVisible={isVisible}
      activeTarget={activeTarget}
      chompingAction={chompingAnimal}
    />
  );
};
