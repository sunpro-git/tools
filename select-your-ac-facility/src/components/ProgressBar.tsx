interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`progress-dot ${i === current - 1 ? 'progress-dot-active' : ''} ${i < current - 1 ? 'progress-dot-done' : ''}`}
        />
      ))}
      <span className="ml-2 text-xl font-black" style={{ color: 'var(--color-text-sub)' }}>
        {current}/{total}
      </span>
    </div>
  );
}
