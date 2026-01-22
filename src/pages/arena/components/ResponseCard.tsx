interface ResponseCardProps {
  title: string;
  text: string;
  onClose?: () => void;
}

export default function ResponseCard({ title, text, onClose }: ResponseCardProps) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-yellow-500/10">
        <h3 className="font-medium text-yellow-600 dark:text-yellow-400">
          {title}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {text}
        </div>
      </div>
    </div>
  );
}
