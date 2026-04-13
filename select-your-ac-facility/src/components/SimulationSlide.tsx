import { useState, useMemo } from 'react';
import { systems, type SystemId } from '../data/systems';
import { type SimEntry } from '../data/simulation';
import { loadCostConfig, calcCumulativeFromConfig } from '../data/costConfig';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SimulationSlideProps {
  entries: SimEntry[];
  onRemove: (id: string) => void;
  onQuiz: () => void;
  onBack: () => void;
  onTop: () => void;
}

const STROKE_STYLES = ['', '5 5', '8 3', '3 3 8 3', '2 2'];
const SYSTEM_COLORS: Record<SystemId, string[]> = {
  myroom: ['#4a7de8', '#2a5db8', '#6a9dff', '#3a6dd0', '#5a8df8'],
  smart: ['#e8734a', '#c8533a', '#f8936a', '#d8634a', '#e8835a'],
  zenkan: ['#4ab87a', '#2a985a', '#6ad89a', '#3aa86a', '#5ac88a'],
};

export function SimulationSlide({ entries, onRemove, onQuiz, onBack, onTop }: SimulationSlideProps) {
  const [years, setYears] = useState(30);
  const [copied, setCopied] = useState(false);

  const handleShareUrl = () => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(entries)));
    const url = `${window.location.origin}${window.location.pathname}#sim=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const chartData = useMemo(() => {
    if (entries.length === 0) return [];

    const costConfig = loadCostConfig();

    const allSeries = entries.map(entry => {
      const systemConfig = costConfig.systems[entry.systemId];
      // Convert SimEntry config to unitCounts
      const unitCounts: Record<string, number> = {};
      const cfg = entry.config as unknown as Record<string, number>;
      if (entry.systemId === 'myroom') {
        unitCounts['floor'] = cfg.floor ?? 0;
        unitCounts['ldk'] = (cfg.ldk1f ?? 0) + (cfg.ldk2f ?? 0);
        unitCounts['room'] = (cfg.room1f ?? 0) + (cfg.room2f ?? 0);
      } else if (entry.systemId === 'smart') {
        unitCounts['ac'] = cfg.units ?? 2;
        unitCounts['duct'] = cfg.units ?? 2;
      } else {
        unitCounts['system'] = cfg.system ?? 1;
      }
      return {
        entry,
        data: calcCumulativeFromConfig(systemConfig, unitCounts, years, entry.yearlyConfigs),
      };
    });

    // Merge into single array for Recharts
    const merged: Record<string, number | string>[] = [];
    for (let y = 0; y <= years; y++) {
      const point: Record<string, number | string> = { year: y };
      allSeries.forEach(({ entry, data }) => {
        point[entry.id] = data[y].cost;
      });
      merged.push(point);
    }
    return merged;
  }, [entries, years]);

  const getColor = (entry: SimEntry) => {
    const sameSystem = entries.filter(e => e.systemId === entry.systemId);
    const subIdx = sameSystem.indexOf(entry);
    return SYSTEM_COLORS[entry.systemId][subIdx] ?? systems[entry.systemId].color;
  };

  const getStrokeDash = (entry: SimEntry) => {
    const sameSystem = entries.filter(e => e.systemId === entry.systemId);
    const subIdx = sameSystem.indexOf(entry);
    return STROKE_STYLES[subIdx] ?? '';
  };

  return (
    <div className="h-full flex flex-col px-[8vw] py-[10vh]">
      {/* Title + slider */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="text-[clamp(1.4rem,3vw,2rem)] font-black">シミュレーション比較</h2>
          <p className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>累積費用を経過年数で比較</p>
        </div>
        {entries.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] shrink-0" style={{ color: 'var(--color-text-sub)' }}>表示期間</span>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-24"
              style={{ accentColor: 'var(--color-accent-orange)' }}
            />
            <span className="text-[13px] font-black shrink-0 w-10 text-right">{years}年</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col w-full mx-auto min-h-0">
        {entries.length > 0 ? (
          <>
            {/* Chart */}
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,33,24,0.08)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 13 }}
                    tickFormatter={(v) => `${v}年`}
                    stroke="rgba(42,33,24,0.3)"
                  />
                  <YAxis
                    tick={{ fontSize: 13 }}
                    tickFormatter={(v) => `${v}万`}
                    stroke="rgba(42,33,24,0.3)"
                    width={55}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      const entry = entries.find(e => e.id === String(name));
                      return [`${value}万円`, entry?.label ?? String(name)] as [string, string];
                    }}
                    labelFormatter={(label) => `${label}年目`}
                    contentStyle={{ borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(42,33,24,0.15)' }}
                  />
                  <Legend
                    formatter={(value) => {
                      const entry = entries.find(e => e.id === value);
                      return entry?.label ?? value;
                    }}
                    wrapperStyle={{ fontSize: '13px' }}
                  />
                  {entries.map((entry) => (
                    <Line
                      key={entry.id}
                      type="monotone"
                      dataKey={entry.id}
                      stroke={getColor(entry)}
                      strokeWidth={2.5}
                      strokeDasharray={getStrokeDash(entry)}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Entry list */}
            <div className="flex flex-wrap gap-2 mt-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px]"
                  style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--color-card-border)' }}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: systems[entry.systemId].color }} />
                  <span className="font-bold">{entry.label}</span>
                  <button
                    onClick={() => onRemove(entry.id)}
                    className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-[13px] cursor-pointer hover:bg-red-100"
                    style={{ color: '#c45040' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--color-text-muted)' }}>
              <p className="text-lg font-bold mb-2">まだプランが追加されていません</p>
              <p className="text-[13px]">各方式のページで構成を選び、「シミュレーションに追加」を押してください</p>
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center w-full mx-auto pt-3">
        <button onClick={onBack} className="nav-btn-outline px-6 py-2.5 text-sm">← 戻る</button>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleShareUrl}
              className="px-4 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all"
              style={{
                background: copied ? 'var(--color-accent-green)' : 'transparent',
                color: copied ? 'white' : 'var(--color-text-sub)',
                border: copied ? 'none' : '1px solid var(--color-card-border)',
              }}
            >
              {copied ? 'コピーしました ✓' : 'URLで共有'}
            </button>
          )}
          <button onClick={onTop} className="nav-btn-outline px-6 py-2.5 text-sm">トップへ</button>
          <button onClick={onQuiz} className="nav-btn px-8 py-2.5 text-sm">次へ →</button>
        </div>
      </div>
    </div>
  );
}
