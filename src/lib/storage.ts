import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const STORAGE_KEY = 'promptcaster_settings';

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY] as Partial<AppSettings> | undefined;
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<void> => {
  const current = await getSettings();
  await chrome.storage.sync.set({
    [STORAGE_KEY]: { ...current, ...settings },
  });
};

export const onSettingsChange = (
  callback: (settings: AppSettings) => void
): (() => void) => {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'sync' && changes[STORAGE_KEY]) {
      const newValue = changes[STORAGE_KEY].newValue as Partial<AppSettings> | undefined;
      callback({ ...DEFAULT_SETTINGS, ...(newValue || {}) });
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
};
