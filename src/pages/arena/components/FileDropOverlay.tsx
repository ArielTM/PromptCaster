interface FileDropOverlayProps {
  isVisible: boolean;
}

export default function FileDropOverlay({ isVisible }: FileDropOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
      {/* Upload Icon */}
      <svg
        className="w-24 h-24 text-[var(--accent-color)] mb-6 animate-bounce"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      {/* Text */}
      <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
        Drop files here
      </h2>
      <p className="text-[var(--text-secondary)] text-sm">
        Files will be sent to all enabled LLMs
      </p>

      {/* Animated dashed border */}
      <div className="absolute inset-4 border-4 border-dashed border-[var(--accent-color)]/60 rounded-xl animate-pulse" />
    </div>
  );
}
