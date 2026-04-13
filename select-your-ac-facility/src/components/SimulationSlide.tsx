import { useState, useMemo } from 'react';
import { systems, type SystemId } from '../data/systems';
import { type SimEntry } from '../data/simulation';
import { loadCostConfig, calcCumulativeFromConfig, type SystemCostConfig } from '../data/costConfig';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';

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

interface CostEvent {
  year: number;
  label: string;
  amount: number;
}

function calcCostEvents(
  systemConfig: SystemCostConfig,
  unitCounts: Record<string, number>,
  maxYears: number,
): CostEvent[] {
  const events: CostEvent[] = [];
  for (const uc of systemConfig.unitCosts) {
    const count = unitCounts[uc.key] ?? 0;
    if (count === 0) continue;

    // Initial costs at year 0
    const initialTotal = uc.initialCosts.reduce((sum, ic) => sum + ic.cost * count, 0);
    if (initialTotal > 0) {
      events.push({ year: 0, label: `${uc.label} 初期`, amount: initialTotal });
    }

    // Periodic maintenance costs (intervalYears > 1)
    for (const mc of uc.maintenanceCosts) {
      if (mc.intervalYears > 1) {
        for (let y = mc.intervalYears; y <= maxYears; y += mc.intervalYears) {
          events.push({ year: y, label: `${mc.label}`, amount: mc.cost * count });
        }
      }
    }
  }
  return events;
}

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

  const allSeries = useMemo(() => {
    if (entries.length === 0) return [];
    const costConfig = loadCostConfig();
    return entries.map(entry => {
      const systemConfig = costConfig.systems[entry.systemId];
      const unitCounts: Record<string, number> = {};
      const cfg = entry.config as unknown as Record<string, number>;
      if (entry.systemId === 'myroom') {
        unitCounts['floor'] = cfg.floor ?? 0;
        unitCounts['ldk'] = cfg.ldk ?? 0;
        unitCounts['room'] = cfg.room ?? 0;
      } else if (entry.systemId === 'smart') {
        const floor1 = (cfg as unknown as { floor1: string }).floor1;
        const floor2 = (cfg as unknown as { floor2: string }).floor2;
        if (floor1 === 'floor') unitCounts['1f_floor'] = 1;
        else if (floor1 === 'floor+2') unitCounts['1f_floor2'] = 1;
        if (floor2 === '2rooms') unitCounts['2f_2rooms'] = 1;
      } else {
        unitCounts['system'] = cfg.system ?? 1;
      }
      const data = calcCumulativeFromConfig(systemConfig, unitCounts, years, entry.yearlyConfigs);
      const events = calcCostEvents(systemConfig, unitCounts, years);
      return { entry, data, events };
    });
  }, [entries, years]);

  const chartData = useMemo(() => {
    if (allSeries.length === 0) return [];
    const merged: Record<string, number | string>[] = [];
    for (let y = 0; y <= years; y++) {
      const point: Record<string, number | string> = { year: y };
      allSeries.forEach(({ entry, data }) => {
        point[entry.id] = data[y].cost;
      });
      merged.push(point);
    }
    return merged;
  }, [allSeries, years]);

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
                <LineChart data={chartData} margin={{ top: 200, right: 20, left: 20, bottom: 5 }}>
                  <defs>
                    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                    </filter>
                  </defs>
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
                      return [`${Number(value).toFixed(1)}万円`, entry?.label ?? String(name)] as [string, string];
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
                  {/* Cost event bubble dots - pre-calculated positions */}
                  {(() => {
                    // Flatten all bubbles
                    type BubbleData = {
                      key: string; year: number; costAtYear: number; color: string;
                      header: string; lines: string[];
                      boxW: number; boxH: number;
                    };
                    const lineH = 16, headerH = 20, padX = 10, padY = 8, gap = 30;
                    const bubbles: BubbleData[] = [];
                    for (const { entry, data, events } of allSeries) {
                      const byYear = new Map<number, { label: string; amount: number }[]>();
                      for (const ev of events) {
                        if (ev.year > years) continue;
                        if (!byYear.has(ev.year)) byYear.set(ev.year, []);
                        byYear.get(ev.year)!.push({ label: ev.label, amount: ev.amount });
                      }
                      const shortLabel = systems[entry.systemId].name;
                      for (const [year, items] of byYear) {
                        const header = year === 0 ? `${shortLabel} 初期費用` : `${shortLabel} ${year}年目`;
                        const lines = items.map(it => `${it.label}: ${it.amount.toFixed(1)}万`);
                        const allTexts = [header, ...lines];
                        const boxW = Math.min(Math.max(...allTexts.map(l => l.length)) * 8 + padX * 2, 220);
                        const boxH = headerH + lines.length * lineH + padY * 2;
                        bubbles.push({
                          key: `${entry.id}-y${year}`, year, costAtYear: data[year]?.cost ?? 0,
                          color: getColor(entry), header, lines, boxW, boxH,
                        });
                      }
                    }

                    // We can't pre-compute pixel positions without knowing the scale,
                    // but we CAN compute relative offsets per year group.
                    // Group bubbles by year to determine stacking offset.
                    const yearGroups = new Map<number, number>();
                    const bubbleOffsets = bubbles.map(b => {
                      const countAtYear = yearGroups.get(b.year) ?? 0;
                      yearGroups.set(b.year, countAtYear + 1);
                      return countAtYear; // 0 = first at this year, 1 = second, etc.
                    });

                    // Helper to calc bubble position
                    const calcBubblePos = (cx: number, cy: number, b: typeof bubbles[0], stackIdx: number) => {
                      let bx = Math.max(5, cx - b.boxW / 2);
                      const by = Math.max(5, cy - b.boxH - gap - stackIdx * (b.boxH + 6));
                      if (b.year > years * 0.8) bx = Math.max(5, cx - b.boxW - 10);
                      return { bx, by };
                    };

                    return [
                      // Pass 1: Dots + Connectors (rendered first = behind)
                      ...bubbles.map((b, bi) => {
                        const stackIdx = bubbleOffsets[bi];
                        return (
                          <ReferenceDot
                            key={`conn-${b.key}`}
                            x={b.year}
                            y={b.costAtYear}
                            r={5}
                            fill={b.color}
                            stroke="white"
                            strokeWidth={2}
                            shape={({ cx, cy }: { cx: number; cy: number }) => {
                              const { bx, by } = calcBubblePos(cx, cy, b, stackIdx);
                              return (
                                <g>
                                  <circle cx={cx} cy={cy} r={5} fill={b.color} stroke="white" strokeWidth={2} />
                                  <line x1={cx} y1={cy} x2={bx + b.boxW / 2} y2={by + b.boxH}
                                    stroke={b.color} strokeWidth={2} opacity={0.8} strokeDasharray="4 3" />
                                </g>
                              );
                            }}
                          />
                        );
                      }),
                      // Pass 2: Bubble boxes + Text (rendered after = on top)
                      ...bubbles.map((b, bi) => {
                        const stackIdx = bubbleOffsets[bi];
                        return (
                          <ReferenceDot
                            key={`bubble-${b.key}`}
                            x={b.year}
                            y={b.costAtYear}
                            r={0}
                            fill="transparent"
                            stroke="transparent"
                            shape={({ cx, cy }: { cx: number; cy: number }) => {
                              const { bx, by } = calcBubblePos(cx, cy, b, stackIdx);
                              return (
                                <g>
                                  <rect x={bx} y={by} width={b.boxW} height={b.boxH} rx={6} ry={6}
                                    fill="white" stroke={b.color} strokeWidth={1.5} filter="url(#shadow)" />
                                  <text x={bx + padX} y={by + padY + headerH - 4}
                                    fontSize={12} fill={b.color} fontWeight="bold">{b.header}</text>
                                  <line x1={bx + padX} y1={by + padY + headerH} x2={bx + b.boxW - padX} y2={by + padY + headerH}
                                    stroke={b.color} strokeWidth={0.5} opacity={0.3} />
                                  {b.lines.map((line, li) => (
                                    <text key={li} x={bx + padX} y={by + padY + headerH + (li + 1) * lineH - 2}
                                      fontSize={11} fill="#6b5d4d">{line}</text>
                                  ))}
                                </g>
                              );
                            }}
                          />
                        );
                      }),
                    ];
                  })()}
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
