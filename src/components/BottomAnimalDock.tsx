import React from 'react';
import { GestureActionType } from './TaskGestureOverlay';
import { useActiveSkin } from '../plugins/skins/SkinRegistry';

interface BottomAnimalDockProps {
  isVisible: boolean;
  activeTarget: GestureActionType;
  chompingAnimal: GestureActionType | null;
  jumpingAnimal?: GestureActionType | null;
}

export const BottomAnimalDock: React.FC<BottomAnimalDockProps> = ({
  isVisible,
  activeTarget,
  chompingAnimal,
  jumpingAnimal
}) => {
  const { activeSkin } = useActiveSkin();
  const ActionDockComponent = activeSkin.ActionDock;

  return (
    <ActionDockComponent
      isVisible={isVisible}
      activeTarget={activeTarget}
      chompingAction={chompingAnimal}
      jumpingAnimal={jumpingAnimal}
    />
  );
};
