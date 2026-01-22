import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings, saveSettings } from '@/lib/storage';
import { LLM_CONFIGS, getAllLLMConfigs } from '@/lib/llm-config';

export default function Options() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleToggleLLM = useCallback((llmId: string) => {
    setSettings((prev) => {
      const enabled = prev.enabledLLMs.includes(llmId)
        ? prev.enabledLLMs.filter((id) => id !== llmId)
        : [...prev.enabledLLMs, llmId];

      // Also update order
      let order = prev.llmOrder.filter((id) => enabled.includes(id));
      if (!order.includes(llmId) && enabled.includes(llmId)) {
        order = [...order, llmId];
      }

      return { ...prev, enabledLLMs: enabled, llmOrder: order };
    });
    setSaved(false);
  }, []);

  const handleSetJudge = useCallback((llmId: string | null) => {
    setSettings((prev) => ({ ...prev, judgeId: llmId }));
    setSaved(false);
  }, []);

  const handleMoveUp = useCallback((llmId: string) => {
    setSettings((prev) => {
      const order = [...prev.llmOrder];
      const index = order.indexOf(llmId);
      if (index > 0) {
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
      }
      return { ...prev, llmOrder: order };
    });
    setSaved(false);
  }, []);

  const handleMoveDown = useCallback((llmId: string) => {
    setSettings((prev) => {
      const order = [...prev.llmOrder];
      const index = order.indexOf(llmId);
      if (index < order.length - 1) {
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
      }
      return { ...prev, llmOrder: order };
    });
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const allLLMs = getAllLLMConfigs();
  const orderedLLMs = [
    ...settings.llmOrder.map((id) => LLM_CONFIGS[id]).filter(Boolean),
    ...allLLMs.filter((c) => !settings.llmOrder.includes(c.id)),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">PromptCaster Settings</h1>

        {/* LLM Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Enabled LLMs</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Select which LLM sites to show in the Arena. You can reorder them using the arrows.
          </p>

          <div className="space-y-2">
            {orderedLLMs.map((config, index) => (
              <div
                key={config.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]"
              >
                <input
                  type="checkbox"
                  id={`llm-${config.id}`}
                  checked={settings.enabledLLMs.includes(config.id)}
                  onChange={() => handleToggleLLM(config.id)}
                  className="w-4 h-4 rounded border-gray-300 text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <label
                  htmlFor={`llm-${config.id}`}
                  className="flex-1 font-medium cursor-pointer"
                >
                  {config.name}
                </label>
                {settings.enabledLLMs.includes(config.id) && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMoveUp(config.id)}
                      disabled={index === 0}
                      className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(config.id)}
                      disabled={index === orderedLLMs.length - 1}
                      className="p-1 hover:bg-[var(--bg-primary)] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Judge Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Judge LLM</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Select which LLM should evaluate and compare responses from the others.
          </p>

          <select
            value={settings.judgeId || ''}
            onChange={(e) => handleSetJudge(e.target.value || null)}
            className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          >
            <option value="">No judge selected</option>
            {settings.enabledLLMs.map((id) => {
              const config = LLM_CONFIGS[id];
              return (
                <option key={id} value={id}>
                  {config?.name}
                </option>
              );
            })}
          </select>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-lg bg-[var(--accent-color)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-green-500 text-sm flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Saved!
            </span>
          )}
        </div>

        {/* Open Arena Button */}
        <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              chrome.tabs.create({
                url: chrome.runtime.getURL('src/pages/arena/index.html'),
              });
            }}
            className="w-full py-4 rounded-lg border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-secondary)] transition-colors text-center"
          >
            <span className="font-medium">Open PromptCaster Arena</span>
            <span className="block text-sm text-[var(--text-secondary)] mt-1">
              Compare LLM responses side-by-side
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
