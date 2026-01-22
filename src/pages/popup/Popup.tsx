import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings, saveSettings } from '@/lib/storage';
import { LLM_CONFIGS, getAllLLMConfigs } from '@/lib/llm-config';

export default function Popup() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleToggleLLM = useCallback(async (llmId: string) => {
    const enabled = settings.enabledLLMs.includes(llmId)
      ? settings.enabledLLMs.filter((id) => id !== llmId)
      : [...settings.enabledLLMs, llmId];

    let order = settings.llmOrder.filter((id) => enabled.includes(id));
    if (!order.includes(llmId) && enabled.includes(llmId)) {
      order = [...order, llmId];
    }

    const newSettings = { ...settings, enabledLLMs: enabled, llmOrder: order };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  const handleOpenArena = useCallback(() => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/pages/arena/index.html'),
    });
    window.close();
  }, []);

  const handleOpenOptions = useCallback(() => {
    chrome.runtime.openOptionsPage();
    window.close();
  }, []);

  const allLLMs = getAllLLMConfigs();

  return (
    <div className="w-72 p-4 bg-[var(--bg-primary)]">
      <h1 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-2xl">🎭</span>
        PromptCaster
      </h1>

      {/* Open Arena Button */}
      <button
        onClick={handleOpenArena}
        className="w-full py-3 px-4 mb-4 rounded-lg bg-[var(--accent-color)] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        Open Arena
      </button>

      {/* Quick Toggle */}
      <div className="mb-4">
        <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
          Quick Toggle
        </h2>
        <div className="space-y-1">
          {allLLMs.map((config) => (
            <label
              key={config.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={settings.enabledLLMs.includes(config.id)}
                onChange={() => handleToggleLLM(config.id)}
                className="w-4 h-4 rounded border-gray-300 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
              />
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm">{config.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Judge Indicator */}
      {settings.judgeId && (
        <div className="mb-4 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Judge: {LLM_CONFIGS[settings.judgeId]?.name}
          </span>
        </div>
      )}

      {/* Settings Link */}
      <button
        onClick={handleOpenOptions}
        className="w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Settings
      </button>
    </div>
  );
}
