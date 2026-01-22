import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings, LLMResponse, ResponsePayload } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings } from '@/lib/storage';
import { LLM_CONFIGS } from '@/lib/llm-config';
import LLMPanel from './components/LLMPanel';
import PromptBar from './components/PromptBar';
import JudgeControls from './components/JudgeControls';
import ResponseCard from './components/ResponseCard';

export default function Arena() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [responses, setResponses] = useState<Record<string, LLMResponse>>({});
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [judgeVerdict, setJudgeVerdict] = useState<string | null>(null);
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
      setJudgeVerdict(null);

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

    return `You are a judge evaluating responses from different AI assistants. Compare the following responses and determine which one is best. Consider accuracy, helpfulness, clarity, and completeness.

${responsesText}

---

Please provide:
1. A brief analysis of each response's strengths and weaknesses
2. Your verdict on which response is best and why`;
  };

  // Watch for judge response
  useEffect(() => {
    if (isJudgeMode && settings.judgeId && responses[settings.judgeId]?.isComplete) {
      setJudgeVerdict(responses[settings.judgeId].text);
      setIsJudgeMode(false);
    }
  }, [isJudgeMode, settings.judgeId, responses]);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
        <h1 className="text-lg font-semibold">PromptCaster Arena</h1>
        <div className="flex items-center gap-2">
          <JudgeControls
            judgeId={settings.judgeId}
            enabledLLMs={enabledLLMs}
            onSendToJudge={handleSendToJudge}
            hasResponses={Object.values(responses).some((r) => r.isComplete)}
            isJudging={isJudgeMode}
          />
          <a
            href={chrome.runtime.getURL('src/pages/options/index.html')}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
          </a>
        </div>
      </header>

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

      {/* Judge Verdict */}
      {judgeVerdict && (
        <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-secondary)]">
          <ResponseCard
            title="Judge's Verdict"
            text={judgeVerdict}
            onClose={() => setJudgeVerdict(null)}
          />
        </div>
      )}

      {/* Prompt Bar */}
      <PromptBar onSend={handleSendPrompt} />
    </div>
  );
}
