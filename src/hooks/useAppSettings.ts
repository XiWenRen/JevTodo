import { useState, useEffect, useCallback } from 'react';
import { AppSettings, AppTheme } from '../types';

export const STORAGE_KEY_SETTINGS = 'jev_minimal_todo_settings_v1';

export const THEMES: { id: AppTheme; label: string; icon: string }[] = [
  { id: 'obsidian', label: '墨黑', icon: '🌙' },
  { id: 'paper', label: '素白', icon: '☀️' },
  { id: 'sand', label: '暖杏', icon: '🌾' },
  { id: 'mist', label: '月灰', icon: '🌫️' }
];

export function useAppSettings() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const endpoint = (!parsed.jevEndpoint || parsed.jevEndpoint.includes('ai-gateway.vercel.sh'))
          ? 'https://api.typesafe.ai/v1/systemone'
          : parsed.jevEndpoint;
        return {
          theme: 'obsidian',
          ...parsed,
          jevEndpoint: endpoint,
          jevApiKey: parsed.jevApiKey || (import.meta.env.VITE_JEV_API_KEY as string) || '',
          allowFallback: parsed.allowFallback ?? false
        };
      }
    } catch (e) {
      console.warn('Error reading settings from storage:', e);
    }
    return {
      jevApiKey: (import.meta.env.VITE_JEV_API_KEY as string) || '',
      jevEndpoint: 'https://api.typesafe.ai/v1/systemone',
      autoCleanupEnabled: true,
      autoCleanupDays: 5,
      widgetWidth: 'compact',
      showCompleted: true,
      theme: 'obsidian',
      allowFallback: false
    };
  });

  // Sync theme with document & body for consistent full-screen background
  useEffect(() => {
    const currentTheme = settings.theme || 'obsidian';
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.body.setAttribute('data-theme', currentTheme);
  }, [settings.theme]);

  // Save settings to localStorage
  const handleSaveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Error saving settings:', e);
    }
  }, []);

  // Quick theme cycle
  const handleNextTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex(t => t.id === settings.theme);
    const nextTheme = THEMES[(currentIndex + 1) % THEMES.length].id;
    handleSaveSettings({
      ...settings,
      theme: nextTheme
    });
  }, [settings, handleSaveSettings]);

  return {
    settings,
    setSettings,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    handleSaveSettings,
    handleNextTheme,
    themes: THEMES
  };
}
