import { forwardRef, useState } from 'react';
import type { LLMResponse } from '@/types';
import { LLM_CONFIGS } from '@/lib/llm-config';

interface LLMPanelProps {
  llmId: string;
  response?: LLMResponse;
  isJudge: boolean;
}

const LLMPanel = forwardRef<HTMLIFrameElement, LLMPanelProps>(
  ({ llmId, response, isJudge }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const config = LLM_CONFIGS[llmId];

    if (!config) return null;

    return (
      <div className="relative flex flex-col rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)]">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]"
          style={{ borderTopColor: config.color, borderTopWidth: 3 }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{config.name}</span>
            {isJudge && (
              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                Judge
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {response && !response.isComplete && (
              <span className="text-xs text-[var(--text-secondary)]">
                Generating...
              </span>
            )}
            {response?.isComplete && (
              <span className="text-xs text-green-500">Complete</span>
            )}
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)]" />
            </div>
          )}
          <iframe
            ref={ref}
            src={config.url}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    );
  }
);

LLMPanel.displayName = 'LLMPanel';

export default LLMPanel;
