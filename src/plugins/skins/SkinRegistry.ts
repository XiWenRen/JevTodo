import React, { useState, useEffect } from 'react';
import { ICompanionTheme, ISkinPlugin, CompanionRenderProps, CompanionStageProps } from './types';
import { CuteAnimalSkin } from './packs/CuteAnimalSkin';
import { MoodyDogSkin } from './packs/MoodyDogSkin';
import { CuteDogSkin } from './packs/CuteDogSkin';
import { DragonGreenSkin } from './packs/DragonGreenSkin';
import { BlackCatSkin } from './packs/BlackCatSkin';
import { LottieCompanionWidget } from '../../components/companions/LottieCompanionWidget';

const STORAGE_KEY_ACTIVE_SKIN = 'jev_cherry_active_skin_id_v1';
const STORAGE_KEY_COMPANION_THEME = 'jev_floating_companion_theme_id_v2';
const STORAGE_KEY_CUSTOM_THEMES = 'jev_custom_companion_themes_v1';

export interface CustomLottieConfig {
  id: string;
  name: string;
  url?: string;
  data?: any;
  icon?: string;
  accentColor?: string;
  author?: string;
  mouthAnchor?: { left: string; top: string };
}

class CompanionRegistryService {
  private themes = new Map<string, ICompanionTheme>();
  private activeThemeId: string = 'moody-dog'; // 默认精选高帧率小狗
  private listeners = new Set<() => void>();

  constructor() {
    // 1. 用户精选预置 Lottie 动画系列
    this.register(MoodyDogSkin);
    this.register(CuteDogSkin);
    this.register(DragonGreenSkin);
    this.register(BlackCatSkin);

    // 2. 原版经典纯矢量动力学系列
    this.register(CuteAnimalSkin);

    // 4. 从 LocalStorage 恢复用户自定义导入的伴侣主题
    try {
      const customStr = localStorage.getItem(STORAGE_KEY_CUSTOM_THEMES);
      if (customStr) {
        const list: CustomLottieConfig[] = JSON.parse(customStr);
        if (Array.isArray(list)) {
          list.forEach(cfg => this.createAndRegisterCustomLottie(cfg, false));
        }
      }
    } catch {}

    // 从 LocalStorage 读取用户保存的偏好（优先读取新版独立的浮窗主题 key）
    try {
      let saved = localStorage.getItem(STORAGE_KEY_COMPANION_THEME);
      if (!saved) {
        saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SKIN);
      }
      if (saved === 'cute-animals') saved = 'cute-animal';
      if (saved && this.themes.has(saved)) {
        this.activeThemeId = saved;
      }
    } catch {}
  }

  createAndRegisterCustomLottie(cfg: CustomLottieConfig, saveToStorage: boolean = true): ICompanionTheme {
    const accentColor = cfg.accentColor || '#38bdf8';
    const mouth = cfg.mouthAnchor || { left: '50%', top: '50%' };

    const CustomWidget: React.FC<CompanionRenderProps> = (props) =>
      React.createElement(LottieCompanionWidget, {
        animationPath: cfg.url,
        animationData: cfg.data,
        size: 44,
        activityState: props.activityState,
        name: cfg.name
      });

    const CustomStage: React.FC<CompanionStageProps> = ({ size = 220, focusPhase = 'focus', isPaused = false }) => {
      const isBreak = focusPhase === 'break';
      const stageState = isBreak ? 'sleeping' : isPaused ? 'stopped' : 'running';
      return React.createElement(
        'div',
        { className: 'relative flex flex-col items-center justify-center' },
        React.createElement(LottieCompanionWidget, {
          animationPath: cfg.url,
          animationData: cfg.data,
          size: size,
          activityState: stageState,
          name: `${cfg.name} Stage`
        })
      );
    };

    const theme: ICompanionTheme = {
      id: cfg.id,
      name: cfg.name,
      category: 'animal',
      styleTag: 'lottie',
      description: `用户自定义导入的 Lottie 动效主题：${cfg.name}`,
      icon: cfg.icon || '✨',
      tagline: '个性化自定义专属伴侣',
      badge: '自定义导入',
      author: cfg.author || 'Custom Import',
      accentColor,
      CompanionWidget: CustomWidget,
      CompanionStage: CustomStage,
      anatomy: {
        type: 'lottie_idle',
        bodyHeightRatio: 0.65,
        mouthAnchor: mouth,
        tagline: '自定义导入形象'
      },
      getCompanionButtonStyle: (props) => ({
        backgroundColor: `color-mix(in srgb, var(--bg-drawer) ${75 + Math.round(props.progressRatio * 20)}%, ${accentColor}18)`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1.4px solid ${accentColor}80`,
        boxShadow: `0 2px 10px rgba(0,0,0,0.15), 0 0 12px ${accentColor}30`,
        transition: 'border 0.8s ease, box-shadow 0.8s ease, background-color 0.8s ease'
      }),
      ActionDock: CuteAnimalSkin.ActionDock,
      focusPets: CuteAnimalSkin.focusPets
    };

    this.register(theme);

    if (saveToStorage) {
      try {
        const customStr = localStorage.getItem(STORAGE_KEY_CUSTOM_THEMES);
        let list: CustomLottieConfig[] = customStr ? JSON.parse(customStr) : [];
        list = list.filter(item => item.id !== cfg.id);
        list.push(cfg);
        localStorage.setItem(STORAGE_KEY_CUSTOM_THEMES, JSON.stringify(list));
      } catch {}
    }

    return theme;
  }

  removeCustomTheme(id: string): void {
    if (this.themes.has(id)) {
      this.themes.delete(id);
      try {
        const customStr = localStorage.getItem(STORAGE_KEY_CUSTOM_THEMES);
        if (customStr) {
          let list: CustomLottieConfig[] = JSON.parse(customStr);
          list = list.filter(item => item.id !== id);
          localStorage.setItem(STORAGE_KEY_CUSTOM_THEMES, JSON.stringify(list));
        }
      } catch {}
      if (this.activeThemeId === id) {
        this.setTheme('cute-animal');
      } else {
        this.notify();
      }
    }
  }

  register(theme: ICompanionTheme): void {
    this.themes.set(theme.id, theme);
    this.notify();
  }

  getAllThemes(): ICompanionTheme[] {
    return Array.from(this.themes.values());
  }

  // 保持旧接口兼容
  getAllSkins(): ISkinPlugin[] {
    return this.getAllThemes();
  }

  getActiveTheme(): ICompanionTheme {
    return this.themes.get(this.activeThemeId) || MoodyDogSkin;
  }

  // 保持旧接口兼容
  getActiveSkin(): ISkinPlugin {
    return this.getActiveTheme();
  }

  getActiveThemeId(): string {
    return this.activeThemeId;
  }

  // 保持旧接口兼容
  getActiveSkinId(): string {
    return this.activeThemeId;
  }

  setTheme(themeId: string): boolean {
    if (!this.themes.has(themeId)) return false;
    this.activeThemeId = themeId;
    try {
      localStorage.setItem(STORAGE_KEY_COMPANION_THEME, themeId);
      localStorage.setItem(STORAGE_KEY_ACTIVE_SKIN, themeId);
    } catch {}
    this.notify();
    return true;
  }

  // 保持旧接口兼容
  setActiveSkin(skinId: string): boolean {
    return this.setTheme(skinId);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Skin listener error:', e);
      }
    }
  }
}

export const companionRegistry = new CompanionRegistryService();
export const skinRegistry = companionRegistry;

/**
 * React Hook: 监听当前浮窗伴侣主题变化，支持在任意组件中热切换
 */
export function useActiveCompanionTheme(): {
  activeTheme: ICompanionTheme;
  allThemes: ICompanionTheme[];
  activeThemeId: string;
  setTheme: (themeId: string) => boolean;
  // 保持旧接口兼容
  activeSkin: ICompanionTheme;
  allSkins: ICompanionTheme[];
  activeSkinId: string;
  setSkin: (skinId: string) => boolean;
} {
  const [activeTheme, setActiveThemeState] = useState<ICompanionTheme>(() => companionRegistry.getActiveTheme());
  const [activeThemeId, setActiveThemeIdState] = useState<string>(() => companionRegistry.getActiveThemeId());

  useEffect(() => {
    const unsubscribe = companionRegistry.subscribe(() => {
      setActiveThemeState(companionRegistry.getActiveTheme());
      setActiveThemeIdState(companionRegistry.getActiveThemeId());
    });
    return unsubscribe;
  }, []);

  return {
    activeTheme,
    allThemes: companionRegistry.getAllThemes(),
    activeThemeId,
    setTheme: (id: string) => companionRegistry.setTheme(id),
    // 兼容属性
    activeSkin: activeTheme,
    allSkins: companionRegistry.getAllThemes(),
    activeSkinId: activeThemeId,
    setSkin: (id: string) => companionRegistry.setTheme(id)
  };
}

export const useActiveSkin = useActiveCompanionTheme;
