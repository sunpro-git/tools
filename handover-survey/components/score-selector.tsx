"use client";

import { cn } from "@/lib/utils";

interface ScoreSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  showNA?: boolean;
}

export function ScoreSelector({
  value,
  onChange,
  leftLabel = "低い",
  rightLabel = "高い",
  showNA = false,
}: ScoreSelectorProps) {
  return (
    <div>
      <div className="flex gap-1 sm:gap-2 flex-wrap items-center">
        {showNA && (
          <button
            key="na"
            type="button"
            onClick={() => onChange(-1)}
            className={cn(
              "h-9 sm:h-10 px-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap",
              value === -1
                ? "bg-gray-600 text-white border-gray-600 shadow-md scale-110"
                : "bg-white text-gray-500 border-gray-300 hover:border-gray-500"
            )}
          >
            該当なし
          </button>
        )}
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-sm font-medium transition-all border",
              value === i
                ? "bg-primary text-white border-primary shadow-md scale-110"
                : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
            )}
          >
            {i}
          </button>
        ))}
      </div>
      {value !== -1 && (
        <div className="flex justify-between mt-1 text-xs text-gray-400 px-1">
          {showNA && <span />}
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
