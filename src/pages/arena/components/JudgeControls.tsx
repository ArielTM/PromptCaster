import { LLM_CONFIGS } from '@/lib/llm-config';

interface JudgeControlsProps {
  judgeId: string | null;
  enabledLLMs: string[];
  onSendToJudge: () => void;
  hasResponses: boolean;
  isJudging: boolean;
}

export default function JudgeControls({
  judgeId,
  enabledLLMs,
  onSendToJudge,
  hasResponses,
  isJudging,
}: JudgeControlsProps) {
  const judgeConfig = judgeId ? LLM_CONFIGS[judgeId] : null;
  const canJudge = judgeId && hasResponses && enabledLLMs.length >= 2;

  if (!judgeId) {
    return (
      <span className="text-xs text-[var(--text-secondary)]">
        No judge selected
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-secondary)]">
        Judge: {judgeConfig?.name}
      </span>
      <button
        onClick={onSendToJudge}
        disabled={!canJudge || isJudging}
        className="px-4 py-3 text-sm rounded-lg bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isJudging ? (
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Judging...
          </span>
        ) : (
          'Send to Judge'
        )}
      </button>
    </div>
  );
}
