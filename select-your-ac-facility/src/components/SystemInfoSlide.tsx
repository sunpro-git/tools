import { useState, useMemo } from 'react';
import { systems, type SystemId } from '../data/systems';
import { ImageModal } from './ImageModal';
import { calcCosts, defaultConfigs, type SimConfig, type SimEntry } from '../data/simulation';
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

function CountSelector({ label, value, onChange, color, max = 2 }: { label: string; value: number; onChange: (v: number) => void; color: string; max?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: max + 1 }, (_, n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="w-6 h-6 rounded text-[13px] font-bold cursor-pointer transition-all"
            style={{
              background: value === n ? color : 'rgba(42,33,24,0.06)',
              color: value === n ? 'white' : 'var(--color-text-sub)',
              border: value === n ? 'none' : '1px solid rgba(42,33,24,0.1)',
            }}
          >
            {n}
          </button>
        ))}
      </div>
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

  const currentConfig = systemId === 'myroom' ? myroomCfg : systemId === 'smart' ? smartCfg : zenkanCfg;
  const costs = useMemo(() => calcCosts(systemId, currentConfig), [systemId, currentConfig]);

  const handleAdd = () => {
    onAddSimulation(systemId, currentConfig);
  };

  return (
    <div className="h-full flex flex-col px-[8vw] py-[10vh]">
      {/* Title + description */}
      <div className="text-center mb-3">
        <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-black" style={{ color: s.color }}>{s.name}</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-sub)' }}>{s.description}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-5 md:gap-8 w-full mx-auto min-h-0">
        {/* Left - image */}
        <div
          className="shrink-0 w-[40%] cursor-pointer relative group rounded-2xl overflow-hidden self-center"
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

        {/* Right - info */}
        <div className="flex-1 min-w-0 overflow-y-auto space-y-2.5 flex flex-col justify-center">

          {/* Config selector + Add button */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2" style={{ background: s.color + '12' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: s.color }}>
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                <h4 className="text-sm font-black">構成台数を選択</h4>
              </div>

              {systemId === 'myroom' && (
                <div className="grid grid-cols-3">
                  <div className="space-y-1.5 px-3 py-2" style={{ borderRight: '1px solid var(--color-card-border)' }}>
                    <CountSelector label="床下エアコン" value={myroomCfg.floor} onChange={v => setMyroomCfg(c => ({ ...c, floor: v }))} color={s.color} />
                  </div>
                  <div className="space-y-1.5 px-3 py-2" style={{ borderRight: '1px solid var(--color-card-border)' }}>
                    <CountSelector label="1F LDK用" value={myroomCfg.ldk1f} onChange={v => setMyroomCfg(c => ({ ...c, ldk1f: v }))} color={s.color} />
                    <CountSelector label="1F 居室用" value={myroomCfg.room1f} onChange={v => setMyroomCfg(c => ({ ...c, room1f: v }))} color={s.color} max={3} />
                  </div>
                  <div className="space-y-1.5 px-3 py-2">
                    <CountSelector label="2F LDK用" value={myroomCfg.ldk2f} onChange={v => setMyroomCfg(c => ({ ...c, ldk2f: v }))} color={s.color} />
                    <CountSelector label="2F 居室用" value={myroomCfg.room2f} onChange={v => setMyroomCfg(c => ({ ...c, room2f: v }))} color={s.color} max={3} />
                  </div>
                </div>
              )}

              {systemId === 'smart' && (
                <div className="px-3 py-2">
                  <CountSelector label="エアコン台数" value={smartCfg.units} onChange={v => setSmartCfg({ units: v })} color={s.color} max={3} />
                </div>
              )}

              {systemId === 'zenkan' && (
                <div className="px-3 py-2">
                  <p className="text-[13px]" style={{ color: 'var(--color-text-sub)' }}>専用システム 1式（固定）</p>
                </div>
              )}
            </div>

            {/* Add to simulation button */}
            <div className="shrink-0 self-center flex flex-col items-center gap-1.5">
              <button
                onClick={handleAdd}
                disabled={!canAdd}
                className="px-4 py-3 rounded-xl text-[13px] font-bold cursor-pointer transition-all"
                style={{
                  background: canAdd ? s.color : 'rgba(42,33,24,0.15)',
                  color: 'white',
                  boxShadow: canAdd ? `0 4px 12px ${s.color}40` : 'none',
                  opacity: canAdd ? 1 : 0.5,
                }}
              >
                シミュレーションに追加
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

          {/* Best/Worst */}
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3">
              <h4 className="text-sm font-black mb-1.5" style={{ color: 'var(--color-accent-green)' }}>こんなご家族にオススメ</h4>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{s.bestFor}</p>
            </div>
            <div className="card p-3">
              <h4 className="text-sm font-black mb-1.5" style={{ color: '#c45040' }}>オススメできません</h4>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>{s.worstFor}</p>
            </div>
          </div>

          {/* Pros/Cons */}
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3">
              <h4 className="text-sm font-black mb-1.5" style={{ color: 'var(--color-accent-green)' }}>強み</h4>
              <ul className="space-y-1">
                {s.pros.map((p, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-1.5 leading-snug" style={{ color: 'var(--color-text-sub)' }}>
                    <span style={{ color: 'var(--color-accent-green)' }}>+</span><span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-3">
              <h4 className="text-sm font-black mb-1.5" style={{ color: '#c45040' }}>弱み</h4>
              <ul className="space-y-1">
                {s.cons.map((c, i) => (
                  <li key={i} className="text-[13px] flex items-start gap-1.5 leading-snug" style={{ color: 'var(--color-text-sub)' }}>
                    <span style={{ color: '#c45040' }}>−</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
