import React from 'react';

export type CherryMood = 'happy' | 'wink';

export interface CherryIconProps {
  size?: number;
  className?: string;
  mood?: CherryMood;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * CherryTodo Twin Cherry Mascot Component (双子樱桃主形象)
 * 保持双子樱桃作为主形象，风格与三只伴随动物 (小恐龙、小树懒、小松鼠) 的 2D 贴纸手绘卡片风格保持 100% 高度统一。
 */
export const CherryIcon: React.FC<CherryIconProps> = ({
  size = 20,
  className = '',
  style = {},
  title
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center select-none pointer-events-none overflow-visible ${className}`}
      style={{
        width: size,
        height: size,
        ...style
      }}
    >
      <img
        src="/assets/cherry.webp"
        alt="Cherry"
        title={title}
        draggable={false}
        className="w-full h-full object-contain pointer-events-none select-none filter drop-shadow-[0_2px_6px_rgba(225,29,72,0.32)]"
      />
    </span>
  );
};
