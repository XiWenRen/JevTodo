import { useState, useEffect } from 'react';
import { ISkinPlugin } from './types';
import { CuteAnimalSkin } from './packs/CuteAnimalSkin';
import { CyberMechaSkin } from './packs/CyberMechaSkin';

const STORAGE_KEY_ACTIVE_SKIN = 'jev_cherry_active_skin_id_v1';

class SkinRegistryService {
  private skins = new Map<string, ISkinPlugin>();
  private activeSkinId: string = 'cute-animal';
  private listeners = new Set<() => void>();

  constructor() {
    // 注册内置默认皮肤包
    this.register(CuteAnimalSkin);
    this.register(CyberMechaSkin);

    // 从 LocalStorage 读取用户保存的皮肤偏好
    try {
      let saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SKIN);
      if (saved === 'cute-animals') saved = 'cute-animal';
      if (saved && this.skins.has(saved)) {
        this.activeSkinId = saved;
      }
    } catch {}
  }

  register(skin: ISkinPlugin): void {
    this.skins.set(skin.id, skin);
    this.notify();
  }

  getAllSkins(): ISkinPlugin[] {
    return Array.from(this.skins.values());
  }

  getActiveSkin(): ISkinPlugin {
    return this.skins.get(this.activeSkinId) || CuteAnimalSkin;
  }

  getActiveSkinId(): string {
    return this.activeSkinId;
  }

  setActiveSkin(skinId: string): boolean {
    if (!this.skins.has(skinId)) return false;
    this.activeSkinId = skinId;
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SKIN, skinId);
    } catch {}
    this.notify();
    return true;
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

export const skinRegistry = new SkinRegistryService();

/**
 * React Hook: 监听当前皮肤变化，支持在任意组件中热切换
 */
export function useActiveSkin(): {
  activeSkin: ISkinPlugin;
  allSkins: ISkinPlugin[];
  activeSkinId: string;
  setSkin: (skinId: string) => boolean;
} {
  const [activeSkin, setActiveSkinState] = useState<ISkinPlugin>(() => skinRegistry.getActiveSkin());
  const [activeSkinId, setActiveSkinIdState] = useState<string>(() => skinRegistry.getActiveSkinId());

  useEffect(() => {
    const unsubscribe = skinRegistry.subscribe(() => {
      setActiveSkinState(skinRegistry.getActiveSkin());
      setActiveSkinIdState(skinRegistry.getActiveSkinId());
    });
    return unsubscribe;
  }, []);

  return {
    activeSkin,
    allSkins: skinRegistry.getAllSkins(),
    activeSkinId,
    setSkin: (id: string) => skinRegistry.setActiveSkin(id)
  };
}
