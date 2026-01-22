import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings, LLMResponse, ResponsePayload } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings } from '@/lib/storage';
import { LLM_CONFIGS } from '@/lib/llm-config';
import LLMPanel from './components/LLMPanel';
import PromptBar from './components/PromptBar';

export default function Arena() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [responses, setResponses] = useState<Record<string, LLMResponse>>({});
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  useEffect(() => {
    getSettings().then(setSettings);

    const handleMessage = (message: { type: string; payload?: ResponsePayload }) => {
      if (message.type === 'RESPONSE_UPDATE' || message.type === 'RESPONSE_COMPLETE') {
        const payload = message.payload;
        if (payload) {
          setResponses((prev) => ({
            ...prev,
            [payload.llmId]: {
              llmId: payload.llmId,
              text: payload.text,
              timestamp: Date.now(),
              isComplete: payload.isComplete,
            },
          }));
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const enabledLLMs = settings.enabledLLMs.filter((id) => LLM_CONFIGS[id]);

  const handleSendPrompt = useCallback(
    async (prompt: string) => {
      setResponses({});

      // Send prompt to all iframe content scripts
      for (const llmId of enabledLLMs) {
        const iframe = iframeRefs.current[llmId];
        if (!iframe?.contentWindow) continue;

        try {
          // Get the tab ID of the current extension page
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) continue;

          // Find frames matching the LLM URLs
          const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
          const config = LLM_CONFIGS[llmId];

          const matchingFrame = frames?.find((f) =>
            f.url.includes(new URL(config.url).hostname)
          );

          if (matchingFrame) {
            await chrome.tabs.sendMessage(
              tab.id,
              { type: 'INJECT_PROMPT', payload: { prompt } },
              { frameId: matchingFrame.frameId }
            );
          }
        } catch (err) {
          console.error(`Failed to inject prompt to ${llmId}:`, err);
        }
      }
    },
    [enabledLLMs]
  );

  const handleSendToJudge = useCallback(async () => {
    if (!settings.judgeId) return;

    setIsJudgeMode(true);

    const nonJudgeResponses = Object.values(responses).filter(
      (r) => r.llmId !== settings.judgeId && r.isComplete
    );

    if (nonJudgeResponses.length < 2) {
      alert('Need at least 2 complete responses to judge');
      setIsJudgeMode(false);
      return;
    }

    const judgePrompt = formatJudgePrompt(nonJudgeResponses);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      const config = LLM_CONFIGS[settings.judgeId];

      const matchingFrame = frames?.find((f) =>
        f.url.includes(new URL(config.url).hostname)
      );

      if (matchingFrame) {
        await chrome.tabs.sendMessage(
          tab.id,
          { type: 'INJECT_PROMPT', payload: { prompt: judgePrompt } },
          { frameId: matchingFrame.frameId }
        );
      }
    } catch (err) {
      console.error('Failed to send to judge:', err);
      setIsJudgeMode(false);
    }
  }, [responses, settings.judgeId]);

  const formatJudgePrompt = (llmResponses: LLMResponse[]): string => {
    const responsesText = llmResponses
      .map((r) => {
        const config = LLM_CONFIGS[r.llmId];
        return `## ${config?.name || r.llmId}\n${r.text}`;
      })
      .join('\n\n---\n\n');

    return `You are a judge evaluating responses from different AI assistants. Your task is to synthesize the best answer from the responses below.

${responsesText}

---

Analyze each response for accuracy, completeness, clarity, and helpfulness. You may include your reasoning and critical thinking. Then provide a final consolidated answer that combines the best elements from all responses. Always end with a clear "## Final Answer" section containing the synthesized response.`;
  };

  // Watch for judge response to reset judging state
  useEffect(() => {
    if (isJudgeMode && settings.judgeId && responses[settings.judgeId]?.isComplete) {
      setIsJudgeMode(false);
    }
  }, [isJudgeMode, settings.judgeId, responses]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      {/* LLM Panels */}
      <main
        className="flex-1 grid gap-1 p-1 overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${enabledLLMs.length}, 1fr)`,
          gridTemplateRows: '1fr',
        }}
      >
        {enabledLLMs.map((llmId) => (
          <LLMPanel
            key={llmId}
            llmId={llmId}
            response={responses[llmId]}
            isJudge={settings.judgeId === llmId}
            ref={(el) => {
              iframeRefs.current[llmId] = el;
            }}
          />
        ))}
      </main>

      {/* Prompt Bar */}
      <PromptBar
        onSend={handleSendPrompt}
        judgeId={settings.judgeId}
        enabledLLMs={enabledLLMs}
        onSendToJudge={handleSendToJudge}
        hasResponses={Object.values(responses).some((r) => r.isComplete)}
        isJudging={isJudgeMode}
        settingsUrl={chrome.runtime.getURL('src/pages/options/index.html')}
      />
    </div>
  );
}
