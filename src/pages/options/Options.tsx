import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, LLMConfig } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings, saveSettings } from '@/lib/storage';
import { LLM_CONFIGS, getAllLLMConfigs } from '@/lib/llm-config';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableLLMRowProps {
  config: LLMConfig;
  isEnabled: boolean;
  onToggle: () => void;
}

function SortableLLMRow({ config, isEnabled, onToggle }: SortableLLMRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] ${
        isDragging ? 'shadow-lg ring-2 ring-[var(--accent-color)]' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 hover:bg-[var(--bg-primary)] rounded cursor-grab active:cursor-grabbing text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        title="Drag to reorder"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="4" cy="13" r="1.5" />
          <circle cx="10" cy="3" r="1.5" />
          <circle cx="10" cy="8" r="1.5" />
          <circle cx="10" cy="13" r="1.5" />
        </svg>
      </button>
      <input
        type="checkbox"
        id={`llm-${config.id}`}
        checked={isEnabled}
        onChange={onToggle}
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
    </div>
  );
}

export default function Options() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const allLLMs = getAllLLMConfigs();
  const orderedLLMs = [
    ...settings.llmOrder.map((id) => LLM_CONFIGS[id]).filter(Boolean),
    ...allLLMs.filter((c) => !settings.llmOrder.includes(c.id)),
  ];
  const orderedLLMIds = orderedLLMs.map((c) => c.id);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = orderedLLMIds.indexOf(active.id as string);
        const newIndex = orderedLLMIds.indexOf(over.id as string);
        const newOrder = arrayMove(orderedLLMIds, oldIndex, newIndex);
        setSettings((prev) => ({ ...prev, llmOrder: newOrder }));
        setSaved(false);
      }
    },
    [orderedLLMIds]
  );

  const handleSave = useCallback(async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">PromptCaster Settings</h1>

        {/* LLM Selection */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Enabled LLMs</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Select which LLM sites to show in the Arena. Drag to reorder.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedLLMIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedLLMs.map((config) => (
                  <SortableLLMRow
                    key={config.id}
                    config={config}
                    isEnabled={settings.enabledLLMs.includes(config.id)}
                    onToggle={() => handleToggleLLM(config.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
