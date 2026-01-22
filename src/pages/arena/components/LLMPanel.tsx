import { forwardRef, useState } from 'react';
import type { LLMResponse } from '@/types';
import { LLM_CONFIGS } from '@/lib/llm-config';

interface LLMPanelProps {
  llmId: string;
  response?: LLMResponse;
  isJudge: boolean;
  isMaximized: boolean;
  isHidden: boolean;
  onToggleMaximize: () => void;
}

const LLMPanel = forwardRef<HTMLIFrameElement, LLMPanelProps>(
  ({ llmId, response, isJudge, isMaximized, isHidden, onToggleMaximize }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const config = LLM_CONFIGS[llmId];

    if (!config) return null;

    return (
      <div className={`relative flex flex-col rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)] ${isHidden ? 'hidden' : ''}`}>
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
            <button
              onClick={onToggleMaximize}
              className="p-1.5 hover:bg-[var(--bg-primary)] rounded transition-colors"
              title={isMaximized ? 'Minimize (Esc)' : 'Maximize'}
            >
              {isMaximized ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
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
