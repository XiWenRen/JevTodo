import { useState, useEffect } from 'react';
import { ICompanionTheme, ISkinPlugin } from './types';
import { CatCompanionSkin } from './packs/CatCompanionSkin';
import { CuteAnimalSkin } from './packs/CuteAnimalSkin';
import { CyberMechaSkin } from './packs/CyberMechaSkin';

const STORAGE_KEY_ACTIVE_SKIN = 'jev_cherry_active_skin_id_v1';
const STORAGE_KEY_COMPANION_THEME = 'jev_floating_companion_theme_id_v2';

class CompanionRegistryService {
  private themes = new Map<string, ICompanionTheme>();
  private activeThemeId: string = 'cat-orange'; // 默认提供全新元气小猫形象
  private listeners = new Set<() => void>();

  constructor() {
    // 注册内置三大核心伴侣主题
    this.register(CatCompanionSkin);
    this.register(CuteAnimalSkin);
    this.register(CyberMechaSkin);

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
    return this.themes.get(this.activeThemeId) || CatCompanionSkin;
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
