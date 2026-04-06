import { systems } from '../data/systems';
import type { SimEntry } from '../data/simulation';

interface SimEntryBarProps {
  entries: SimEntry[];
  onRemove: (id: string) => void;
}

export function SimEntryBar({ entries, onRemove }: SimEntryBarProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[13px] font-bold shrink-0" style={{ color: 'var(--color-text-sub)' }}>
        シミュレーション:
      </span>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px]"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--color-card-border)' }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: systems[entry.systemId].color }}
          />
          <span className="font-bold">{entry.label}</span>
          <button
            onClick={() => onRemove(entry.id)}
            className="w-4 h-4 rounded-full flex items-center justify-center text-[13px] cursor-pointer hover:opacity-70"
            style={{ color: '#c45040' }}
          >
            ×
          </button>
        </div>
      ))}
      <span className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
        ({entries.length}/5)
      </span>
    </div>
  );
}
