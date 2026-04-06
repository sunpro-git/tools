import { useState, useMemo } from 'react';
import { systems, type SystemId } from '../data/systems';
import { ImageModal } from './ImageModal';
import { calcCosts, defaultConfigs, type SimConfig, type SimEntry, type SmartConfig } from '../data/simulation';
import { SimEntryBar } from './SimEntryBar';

interface SystemInfoSlideProps {
  systemId: SystemId;
  onNext: () => void;
  onBack: () => void;
  onAddSimulation: (systemId: SystemId, config: SimConfig[SystemId]) => void;
  onRemoveSimulation: (id: string) => void;
  simEntries: SimEntry[];
}

const base = import.meta.env.BASE_URL;
const images: Record<SystemId, string> = {
  myroom: `${base}images/individual.webp`,
  smart: `${base}images/distributed.webp`,
  zenkan: `${base}images/whole-house.webp`,
};

function CostIcon({ type }: { type: 'price' | 'electricity' | 'maintenance' }) {
  const paths: Record<string, string> = {
    price: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    electricity: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
    maintenance: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[type]} />
    </svg>
  );
}

function CountSelector({ label, value, onChange, max = 2 }: { label: string; value: number; onChange: (v: number) => void; color?: string; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-[13px] font-bold px-2 py-1 rounded-lg cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid var(--color-card-border)',
          color: 'var(--color-text)',
          outline: 'none',
        }}
      >
        {Array.from({ length: max + 1 }, (_, n) => (
          <option key={n} value={n}>{n}台</option>
        ))}
      </select>
    </div>
  );
}

export function SystemInfoSlide({ systemId, onNext, onBack, onAddSimulation, onRemoveSimulation, simEntries }: SystemInfoSlideProps) {
  const thisSystemEntries = simEntries.filter(e => e.systemId === systemId);
  const canAdd = simEntries.length < 5;
  const s = systems[systemId];
  const [modalImg, setModalImg] = useState<string | null>(null);
  const [myroomCfg, setMyroomCfg] = useState(defaultConfigs.myroom);
  const [smartCfg, setSmartCfg] = useState(defaultConfigs.smart);
  const [zenkanCfg] = useState(defaultConfigs.zenkan);

  const [hasFloorAc, setHasFloorAc] = useState(true);
  const currentConfig = systemId === 'myroom' ? myroomCfg : systemId === 'smart' ? smartCfg : zenkanCfg;
  const costs = useMemo(() => calcCosts(systemId, currentConfig), [systemId, currentConfig]);

  // Dynamic pros/cons for myroom based on floor AC toggle
  const displayBestFor = useMemo(() => {
    if (systemId !== 'myroom') return s.bestFor;
    if (hasFloorAc) return s.bestFor;
    return s.bestFor.filter(b => !b.includes('床下エアコン'));
  }, [systemId, hasFloorAc, s.bestFor]);

  const displayCons = useMemo(() => {
    if (systemId !== 'myroom') return s.cons;
    if (hasFloorAc) return [
      '床下エアコンは<mark class="hl-red">暖房専用</mark>となり、冷房としては利用できない',
      '床下エアコンのフィルターは<mark class="hl-red">2〜3ケ月おき</mark>の清掃が必要になる',
      '室内にペットがいる場合、床下エアコンのフィルターは、約<mark class="hl-red">1ケ月おき</mark>の頻繁な清掃が必要になる',
      ...s.cons,
    ];
    return ['<mark class="hl-red">吹き抜け</mark>がある空間は暖房が利きにくい', ...s.cons];
  }, [systemId, hasFloorAc, s.cons]);

  const handleAdd = () => {
    onAddSimulation(systemId, currentConfig);
  };

  return (
    <div className="h-full flex flex-col px-[5vw] py-[10vh]">
      {/* Content */}
      <div className="flex-1 flex gap-5 md:gap-8 w-full mx-auto min-h-0">
        {/* Left - title + image (40%) */}
        <div className="shrink-0 w-[40%] flex flex-col justify-center self-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-black mb-1 flex items-baseline gap-3" style={{ color: s.color }}>
            {s.name}
            {systemId === 'smart' && (
              <span style={{ fontFamily: "'Chillax', sans-serif", fontWeight: 600, fontSize: 'clamp(0.9rem, 2vw, 1.3rem)' }}>AirFlowBeyond</span>
            )}
            {systemId === 'zenkan' && (
              <img src={`${base}images/withair-logo.png`} alt="withair" className="h-[clamp(16px,2vw,22px)]" style={{ filter: 'brightness(0) saturate(100%) invert(56%) sepia(52%) saturate(522%) hue-rotate(101deg) brightness(97%) contrast(92%)' }} />
            )}
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-sub)' }}>{s.description}</p>
          <div
            className="cursor-pointer relative group rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.6)' }}
            onClick={() => setModalImg(images[systemId])}
          >
            <img src={images[systemId]} alt={s.name} className="w-full object-contain p-3" />
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(42, 33, 24, 0.6)', color: 'white' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right - info */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-2.5 flex flex-col justify-center">

          {/* Config + Cost block with background */}
          <div className="rounded-xl p-3 space-y-2.5" style={{ background: s.color + '08', border: `2px solid ${s.color}35` }}>

          {/* Config heading + Add button row */}
          <div className="flex items-start gap-3">
            {/* Left: heading + selectors */}
            <div className="flex-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2" style={{ background: s.color + '12' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: s.color }}>
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                <h4 className="text-sm font-black">構成台数を選択</h4>
              </div>
              <div className="flex items-center gap-3 flex-wrap pl-3">
                {systemId === 'myroom' && (
                  <>
                    <CountSelector label="床下AC" value={myroomCfg.floor} onChange={v => setMyroomCfg(c => ({ ...c, floor: v }))} />
                    <CountSelector label="1F LDK" value={myroomCfg.ldk1f} onChange={v => setMyroomCfg(c => ({ ...c, ldk1f: v }))} />
                    <CountSelector label="1F 居室" value={myroomCfg.room1f} onChange={v => setMyroomCfg(c => ({ ...c, room1f: v }))} max={3} />
                    <CountSelector label="2F LDK" value={myroomCfg.ldk2f} onChange={v => setMyroomCfg(c => ({ ...c, ldk2f: v }))} />
                    <CountSelector label="2F 居室" value={myroomCfg.room2f} onChange={v => setMyroomCfg(c => ({ ...c, room2f: v }))} max={3} />
                  </>
                )}
                {systemId === 'smart' && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>1Fエアコン</span>
                      <select
                        value={smartCfg.floor1}
                        onChange={(e) => setSmartCfg(c => ({ ...c, floor1: e.target.value as SmartConfig['floor1'] }))}
                        className="text-[13px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--color-card-border)', color: 'var(--color-text)', outline: 'none' }}
                      >
                        <option value="none">分配しない</option>
                        <option value="floor">床下に分配</option>
                        <option value="floor+2">床下 + 2箇所に分配</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>2Fエアコン</span>
                      <select
                        value={smartCfg.floor2}
                        onChange={(e) => setSmartCfg(c => ({ ...c, floor2: e.target.value as SmartConfig['floor2'] }))}
                        className="text-[13px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--color-card-border)', color: 'var(--color-text)', outline: 'none' }}
                      >
                        <option value="none">分配しない</option>
                        <option value="2rooms">2箇所に分配</option>
                      </select>
                    </div>
                  </>
                )}
                {systemId === 'zenkan' && (
                  <span className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>専用システム 1式（固定）</span>
                )}
              </div>
            </div>

            {/* Right: Add button */}
            <div className="shrink-0 self-center flex flex-col items-center gap-1">
              <button
                onClick={handleAdd}
                disabled={!canAdd}
                className="px-4 py-2.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all text-center leading-tight"
                style={{
                  background: canAdd ? s.color : 'rgba(42,33,24,0.15)',
                  color: 'white',
                  boxShadow: canAdd ? `0 4px 12px ${s.color}40` : 'none',
                  opacity: canAdd ? 1 : 0.5,
                }}
              >
                <span className="flex items-center justify-center gap-1">
                  <span className="text-lg leading-none">+</span>
                  <span>シミュレーション<br />に追加</span>
                </span>
              </button>
              {thisSystemEntries.length > 0 && (
                <span className="text-[13px] font-bold" style={{ color: 'var(--color-accent-green)' }}>
                  {thisSystemEntries.length}プラン追加済み
                </span>
              )}
            </div>
          </div>

          {/* Cost items - 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1" style={{ background: s.color + '12' }}>
                <span className="shrink-0" style={{ color: s.color }}><CostIcon type="price" /></span>
                <h4 className="text-sm font-black">初期費用</h4>
              </div>
              <p className="text-[13px] pl-3" style={{ color: 'var(--color-text-sub)' }}>{costs.price}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1" style={{ background: s.color + '12' }}>
                <span className="shrink-0" style={{ color: s.color }}><CostIcon type="electricity" /></span>
                <h4 className="text-sm font-black">電気代</h4>
              </div>
              <p className="text-[13px] pl-3" style={{ color: 'var(--color-text-sub)' }}>{costs.electricity}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1" style={{ background: s.color + '12' }}>
                <span className="shrink-0" style={{ color: s.color }}><CostIcon type="maintenance" /></span>
                <h4 className="text-sm font-black">維持管理費用</h4>
              </div>
              <p className="text-[13px] pl-3" style={{ color: 'var(--color-text-sub)' }}>{costs.maintenance}</p>
            </div>
          </div>

          </div>
          {/* end Config + Cost block */}

          {/* Pros (including bestFor) / Cons (including worstFor) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3">
              <h4 className="text-sm font-black pb-2 mb-3" style={{ color: 'var(--color-accent-green)', borderBottom: '2px solid var(--color-accent-green)' }}>{s.name}のメリット</h4>
              <ul className="space-y-2.5">
                {displayBestFor.map((b, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-1.5 leading-snug" style={{ color: 'var(--color-text-sub)' }}>
                    <span style={{ color: 'var(--color-accent-green)' }}>★</span><span dangerouslySetInnerHTML={{ __html: b }} />
                  </li>
                ))}
                {s.pros.map((p, i) => (
                  <li key={`p${i}`} className="text-[13px] flex items-start gap-1.5 leading-snug" style={{ color: 'var(--color-text-sub)' }}>
                    <span style={{ color: 'var(--color-accent-green)' }}>★</span><span dangerouslySetInnerHTML={{ __html: p }} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-3">
              <h4 className="text-sm font-black pb-2 mb-3" style={{ color: '#c45040', borderBottom: '2px solid #c45040' }}>{s.name}のデメリット・注意点</h4>
              <ul className="space-y-2.5">
                {s.worstFor.map((w, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-1.5 leading-snug" style={{ color: 'var(--color-text-sub)' }}>
                    <span className="font-black" style={{ color: '#c45040' }}>✖</span><span dangerouslySetInnerHTML={{ __html: w }} />
                  </li>
                ))}
                {displayCons.map((c, i) => (
                  <li key={`c${i}`} className="text-[13px] flex items-start gap-1.5 leading-snug" style={{ color: 'var(--color-text-sub)' }}>
                    <span className="font-black" style={{ color: '#c45040' }}>✖</span><span dangerouslySetInnerHTML={{ __html: c }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Floor AC toggle (myroom only) */}
          {systemId === 'myroom' && (
            <div className="flex gap-2 pl-3">
              <button
                onClick={() => setHasFloorAc(true)}
                className="px-4 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all"
                style={{
                  background: hasFloorAc ? s.color : 'rgba(42,33,24,0.06)',
                  color: hasFloorAc ? 'white' : 'var(--color-text-sub)',
                  border: hasFloorAc ? 'none' : '1px solid var(--color-card-border)',
                }}
              >
                床下エアコン採用あり
              </button>
              <button
                onClick={() => setHasFloorAc(false)}
                className="px-4 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all"
                style={{
                  background: !hasFloorAc ? s.color : 'rgba(42,33,24,0.06)',
                  color: !hasFloorAc ? 'white' : 'var(--color-text-sub)',
                  border: !hasFloorAc ? 'none' : '1px solid var(--color-card-border)',
                }}
              >
                床下エアコン採用なし
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Simulation entries bar */}
      {simEntries.length > 0 && (
        <div className="w-full mx-auto pt-2">
          <SimEntryBar entries={simEntries} onRemove={onRemoveSimulation} />
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-between items-center w-full mx-auto pt-2">
        <button onClick={onBack} className="nav-btn-outline px-6 py-2.5 text-sm">← 戻る</button>
        <button onClick={onNext} className="nav-btn px-8 py-2.5 text-sm">次へ →</button>
      </div>

      {modalImg && <ImageModal src={modalImg} alt={s.name} onClose={() => setModalImg(null)} />}
    </div>
  );
}
