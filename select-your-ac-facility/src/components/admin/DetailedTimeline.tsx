import type { SystemCostConfig, YearlyUnitConfig } from '../../data/costConfig';

interface DetailedTimelineProps {
  config: SystemCostConfig;
  onChange: (config: SystemCostConfig) => void;
}

export function DetailedTimeline({ config, onChange }: DetailedTimelineProps) {
  const addPeriod = () => {
    const last = config.yearlyConfigs[config.yearlyConfigs.length - 1];
    const fromYear = last ? last.toYear + 1 : 0;
    onChange({
      ...config,
      yearlyConfigs: [
        ...config.yearlyConfigs,
        { unitKey: config.unitCosts[0]?.key ?? '', fromYear, toYear: fromYear + 5, units: 1 },
      ],
    });
  };

  const updatePeriod = (idx: number, updates: Partial<YearlyUnitConfig>) => {
    const configs = [...config.yearlyConfigs];
    configs[idx] = { ...configs[idx], ...updates };
    onChange({ ...config, yearlyConfigs: configs });
  };

  const removePeriod = (idx: number) => {
    onChange({
      ...config,
      yearlyConfigs: config.yearlyConfigs.filter((_, i) => i !== idx),
    });
  };

  // Max year for timeline visualization
  const maxYear = Math.max(40, ...config.yearlyConfigs.map(yc => yc.toYear));

  return (
    <div>
      <p className="text-[13px] mb-3" style={{ color: 'var(--color-text-sub)' }}>
        年ごとの台数変動を設定できます。設定がない期間は、各方式ページで選択した台数が適用されます。
      </p>

      {/* Timeline visualization */}
      {config.yearlyConfigs.length > 0 && (
        <div className="card p-3 mb-4">
          <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: 'rgba(42,33,24,0.06)' }}>
            {config.yearlyConfigs.map((yc, i) => {
              const unit = config.unitCosts.find(u => u.key === yc.unitKey);
              const left = (yc.fromYear / maxYear) * 100;
              const width = ((yc.toYear - yc.fromYear + 1) / maxYear) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center justify-center text-[13px] font-bold text-white rounded"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: 'var(--color-accent-orange)',
                    opacity: 0.7 + (Number(yc.units) / 5) * 0.3,
                  }}
                >
                  {unit?.label} ×{yc.units}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>0年</span>
            <span>{maxYear}年</span>
          </div>
        </div>
      )}

      {/* Period list */}
      <div className="space-y-2 mb-3">
        {config.yearlyConfigs.map((yc, i) => (
          <div key={i} className="card p-3 flex items-center gap-3 flex-wrap">
            <select
              value={yc.unitKey}
              onChange={e => updatePeriod(i, { unitKey: e.target.value })}
              className="text-[13px] font-bold px-2 py-1.5 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
            >
              {config.unitCosts.map(uc => (
                <option key={uc.key} value={uc.key}>{uc.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={yc.fromYear}
                onChange={e => updatePeriod(i, { fromYear: Number(e.target.value) })}
                className="w-16 px-2 py-1.5 rounded-lg text-[13px]"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                min="0"
              />
              <span className="text-[13px]">〜</span>
              <input
                type="number"
                value={yc.toYear}
                onChange={e => updatePeriod(i, { toYear: Number(e.target.value) })}
                className="w-16 px-2 py-1.5 rounded-lg text-[13px]"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                min="0"
              />
              <span className="text-[13px]">年</span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={yc.units}
                onChange={e => updatePeriod(i, { units: Number(e.target.value) })}
                className="w-16 px-2 py-1.5 rounded-lg text-[13px]"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                min="0"
              />
              <span className="text-[13px]">台</span>
            </div>

            <button
              onClick={() => removePeriod(i)}
              className="text-[13px] font-bold cursor-pointer ml-auto"
              style={{ color: '#c45040' }}
            >
              削除
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addPeriod}
        className="text-[13px] font-bold cursor-pointer px-4 py-2 rounded-lg"
        style={{ color: 'var(--color-accent-orange)', border: '1px solid var(--color-accent-orange)', background: 'transparent' }}
      >
        + 期間を追加
      </button>
    </div>
  );
}
