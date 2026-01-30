import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings, LLMResponse, ResponsePayload, ConversationMessage, ConversationPayload } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings } from '@/lib/storage';
import { LLM_CONFIGS } from '@/lib/llm-config';
import { serializeFiles } from '@/lib/file-utils';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useFilePaste } from '@/hooks/useFilePaste';
import LLMPanel from './components/LLMPanel';
import PromptBar from './components/PromptBar';
import FileDropOverlay from './components/FileDropOverlay';

export default function Arena() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [responses, setResponses] = useState<Record<string, LLMResponse>>({});
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [maximizedLlmId, setMaximizedLlmId] = useState<string | null>(null);
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

  const enabledLLMs = settings.llmOrder.filter(
    (id) => settings.enabledLLMs.includes(id) && LLM_CONFIGS[id]
  );

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

  const handleNewChat = useCallback(() => {
    setResponses({});
    for (const llmId of enabledLLMs) {
      const iframe = iframeRefs.current[llmId];
      if (iframe) {
        iframe.src = iframe.src;
      }
    }
  }, [enabledLLMs]);

  const handleToggleMaximize = useCallback((llmId: string) => {
    setMaximizedLlmId((prev) => (prev === llmId ? null : llmId));
  }, []);

  const handleSendToJudge = useCallback(async () => {
    if (!settings.judgeId) return;

    setIsJudgeMode(true);

    if (settings.autoMaximizeJudge) {
      setMaximizedLlmId(settings.judgeId);
    }

    const nonJudgeResponses = Object.values(responses).filter(
      (r) => r.llmId !== settings.judgeId && r.isComplete
    );

    if (nonJudgeResponses.length < 2) {
      alert('Need at least 2 complete responses to judge');
      setIsJudgeMode(false);
      return;
    }

    let conversations: Record<string, ConversationMessage[]> | undefined;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });

      // Fetch full conversations if enabled
      if (settings.judgeFullConversation) {
        conversations = {};
        for (const response of nonJudgeResponses) {
          const config = LLM_CONFIGS[response.llmId];
          const matchingFrame = frames?.find((f) =>
            f.url.includes(new URL(config.url).hostname)
          );

          if (matchingFrame) {
            const result = await chrome.tabs.sendMessage(
              tab.id,
              { type: 'GET_CONVERSATION' },
              { frameId: matchingFrame.frameId }
            ) as ConversationPayload;

            if (result?.messages) {
              conversations[response.llmId] = result.messages;
            }
          }
        }
      }

      const judgePrompt = formatJudgePrompt(nonJudgeResponses, conversations);

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
  }, [responses, settings.judgeId, settings.autoMaximizeJudge, settings.judgeFullConversation]);

  const formatJudgePrompt = (
    llmResponses: LLMResponse[],
    conversations?: Record<string, ConversationMessage[]>
  ): string => {
    let responsesText: string;

    if (conversations) {
      // Full conversation mode
      responsesText = llmResponses
        .map((r) => {
          const config = LLM_CONFIGS[r.llmId];
          const messages = conversations[r.llmId] || [];
          const conversationText = messages
            .map((msg) => `**${msg.role === 'user' ? 'User' : 'Assistant'}:** ${msg.content}`)
            .join('\n\n');
          return `## ${config?.name || r.llmId}\n\n${conversationText}`;
        })
        .join('\n\n---\n\n');
    } else {
      // Last response only mode
      responsesText = llmResponses
        .map((r) => {
          const config = LLM_CONFIGS[r.llmId];
          return `## ${config?.name || r.llmId}\n${r.text}`;
        })
        .join('\n\n---\n\n');
    }

    return `Below are responses from different AI assistants to the same question.

${responsesText}

---

Synthesize the best answer by combining the most accurate, complete, and helpful elements from all responses above. You may include brief reasoning. If any response references data, facts, or claims that you are not aware of, do not dismiss them — search the internet to verify before judging their accuracy. End with a clear "## Final Answer" section.`;
  };

  // Watch for judge response to reset judging state
  useEffect(() => {
    if (isJudgeMode && settings.judgeId && responses[settings.judgeId]?.isComplete) {
      setIsJudgeMode(false);
    }
  }, [isJudgeMode, settings.judgeId, responses]);

  // Handle Escape key to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maximizedLlmId) {
        setMaximizedLlmId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedLlmId]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const serializedFiles = await serializeFiles(files);

      for (const llmId of enabledLLMs) {
        const iframe = iframeRefs.current[llmId];
        if (!iframe?.contentWindow) continue;

        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) continue;

          const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
          const config = LLM_CONFIGS[llmId];

          const matchingFrame = frames?.find((f) =>
            f.url.includes(new URL(config.url).hostname)
          );

          if (matchingFrame) {
            await chrome.tabs.sendMessage(
              tab.id,
              { type: 'INJECT_FILES', payload: { files: serializedFiles } },
              { frameId: matchingFrame.frameId }
            );
          }
        } catch (err) {
          console.error(`Failed to inject files to ${llmId}:`, err);
        }
      }
    },
    [enabledLLMs]
  );

  const { isDragging } = useFileDrop({ onFilesDropped: handleFilesSelected });
  useFilePaste({ onFilesPasted: handleFilesSelected });

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
      <FileDropOverlay isVisible={isDragging} />

      {/* LLM Panels */}
      <main
        className="flex-1 grid gap-1 p-1 overflow-hidden transition-all duration-300"
        style={{
          gridTemplateColumns: maximizedLlmId
            ? '1fr'
            : `repeat(${enabledLLMs.length}, 1fr)`,
          gridTemplateRows: '1fr',
        }}
      >
        {enabledLLMs.map((llmId) => (
          <LLMPanel
            key={llmId}
            llmId={llmId}
            isJudge={settings.judgeId === llmId}
            isMaximized={maximizedLlmId === llmId}
            isHidden={maximizedLlmId !== null && maximizedLlmId !== llmId}
            onToggleMaximize={() => handleToggleMaximize(llmId)}
            ref={(el) => {
              iframeRefs.current[llmId] = el;
            }}
          />
        ))}
      </main>

      {/* Prompt Bar */}
      <PromptBar
        onSend={handleSendPrompt}
        onNewChat={handleNewChat}
        judgeId={settings.judgeId}
        enabledLLMCount={enabledLLMs.length}
        onSendToJudge={handleSendToJudge}
        hasResponses={Object.values(responses).some((r) => r.isComplete)}
        isJudging={isJudgeMode}
        settingsUrl={chrome.runtime.getURL('src/pages/options/index.html')}
        onFilesSelected={handleFilesSelected}
      />
    </div>
  );
}
