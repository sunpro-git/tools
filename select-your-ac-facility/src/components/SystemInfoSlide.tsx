import { useState, useMemo } from 'react';
import { systems, type SystemId } from '../data/systems';
import { ImageModal } from './ImageModal';
import { calcCosts, defaultConfigs } from '../data/simulation';
import type { SimConfig, SimEntry, SmartConfig } from '../data/simulation';
import type { YearlyUnitConfig } from '../data/costConfig';
import { loadCostConfig, calcDisplayCosts, type DisplayCosts } from '../data/costConfig';
import { SimEntryBar } from './SimEntryBar';

interface SystemInfoSlideProps {
  systemId: SystemId;
  onNext: () => void;
  onBack: () => void;
  onAddSimulation: (systemId: SystemId, config: SimConfig[SystemId], yearlyConfigs?: YearlyUnitConfig[]) => void;
  onRemoveSimulation: (id: string) => void;
  simEntries: SimEntry[];
}

const base = import.meta.env.BASE_URL;
const images: Record<SystemId, string> = {
  myroom: `${base}images/individual.webp`,
  smart: `${base}images/distributed.webp`,
  zenkan: `${base}images/whole-house.webp`,
};
const myroomNoFloorImg = `${base}images/individual-nofloor.webp`;

function CostIcon({ type }: { type: 'price' | 'electricity' | 'maintenance' }) {
  if (type === 'price') {
    return (
      <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor">
        <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z" />
      </svg>
    );
  }
  if (type === 'electricity') {
    return (
      <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor">
        <path d="M224 32C241.7 32 256 46.3 256 64L256 160L384 160L384 64C384 46.3 398.3 32 416 32C433.7 32 448 46.3 448 64L448 160L512 160C529.7 160 544 174.3 544 192C544 209.7 529.7 224 512 224L512 288C512 383.1 442.8 462.1 352 477.3L352 544C352 561.7 337.7 576 320 576C302.3 576 288 561.7 288 544L288 477.3C197.2 462.1 128 383.1 128 288L128 224C110.3 224 96 209.7 96 192C96 174.3 110.3 160 128 160L192 160L192 64C192 46.3 206.3 32 224 32z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor">
      <path d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z" />
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

function InfoIcon({ onClick, color }: { onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black cursor-pointer shrink-0 transition-all hover:scale-110"
      style={{ background: color + '20', color, border: `1px solid ${color}40` }}
    >
      !
    </button>
  );
}

function CostBreakdown({ costs, systemId, color }: { costs: DisplayCosts; systemId: SystemId; color: string }) {
  const [openDetail, setOpenDetail] = useState<'price' | 'electricity' | 'maintenance' | null>(null);
  const costConfig = useMemo(() => loadCostConfig(), []);
  const systemConfig = costConfig.systems[systemId];

  const toggle = (type: 'price' | 'electricity' | 'maintenance') => {
    setOpenDetail(prev => prev === type ? null : type);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {/* Price */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1" style={{ background: color + '12' }}>
            <span className="shrink-0" style={{ color }}><CostIcon type="price" /></span>
            <h4 className="text-sm font-black flex-1">初期費用</h4>
            <InfoIcon onClick={() => toggle('price')} color={color} />
          </div>
          <p className="text-[13px] pl-3" style={{ color: 'var(--color-text-sub)' }}>{costs.price}</p>
        </div>
        {/* Electricity */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1" style={{ background: color + '12' }}>
            <span className="shrink-0" style={{ color }}><CostIcon type="electricity" /></span>
            <h4 className="text-sm font-black flex-1">電気代</h4>
            <InfoIcon onClick={() => toggle('electricity')} color={color} />
          </div>
          <p className="text-[13px] pl-3" style={{ color: 'var(--color-text-sub)' }}>{costs.electricity}</p>
        </div>
        {/* Maintenance */}
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1" style={{ background: color + '12' }}>
            <span className="shrink-0" style={{ color }}><CostIcon type="maintenance" /></span>
            <h4 className="text-sm font-black flex-1">維持管理費用</h4>
            <InfoIcon onClick={() => toggle('maintenance')} color={color} />
          </div>
          <p className="text-[13px] pl-3" style={{ color: 'var(--color-text-sub)' }}>{costs.maintenance}</p>
        </div>
      </div>

      {/* Detail panel */}
      {openDetail && (
        <div className="card p-3 text-[13px]" style={{ borderColor: color + '30' }}>
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-black" style={{ color }}>
              {openDetail === 'price' ? '初期費用' : openDetail === 'electricity' ? '電気代' : '維持管理費用'}の内訳
            </h5>
            <button onClick={() => setOpenDetail(null)} className="cursor-pointer font-bold" style={{ color: 'var(--color-text-muted)' }}>×</button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th className="text-left pb-1 font-bold">項目</th>
                {openDetail === 'price' && <th className="text-right pb-1 font-bold">単価（万円）</th>}
                {openDetail === 'electricity' && <th className="text-right pb-1 font-bold">年間（万円）</th>}
                {openDetail === 'maintenance' && (
                  <>
                    <th className="text-right pb-1 font-bold">費用（万円）</th>
                    <th className="text-right pb-1 font-bold">周期</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {systemConfig.unitCosts.map(uc => {
                if (openDetail === 'price') {
                  return (
                    <tr key={uc.key}>
                      <td className="py-0.5">{uc.label}</td>
                      <td className="text-right py-0.5">{uc.price}</td>
                    </tr>
                  );
                }
                if (openDetail === 'electricity') {
                  return (
                    <tr key={uc.key}>
                      <td className="py-0.5">{uc.label}</td>
                      <td className="text-right py-0.5">{uc.electricityPerYear}</td>
                    </tr>
                  );
                }
                return uc.maintenanceCosts.map((mc, mi) => (
                  <tr key={`${uc.key}-${mi}`}>
                    <td className="py-0.5">{uc.label} - {mc.label}</td>
                    <td className="text-right py-0.5">{mc.cost}</td>
                    <td className="text-right py-0.5">{mc.intervalYears}年おき</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
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
  const [showDetailedSettings, setShowDetailedSettings] = useState(false);
  const [yearlyConfigs, setYearlyConfigs] = useState<YearlyUnitConfig[]>([]);
  const currentConfig = systemId === 'myroom' ? myroomCfg : systemId === 'smart' ? smartCfg : zenkanCfg;
  const costs = useMemo(() => {
    const cfg = loadCostConfig();
    const systemCfg = cfg.systems[systemId];
    const unitCounts: Record<string, number> = {};
    if (systemId === 'myroom') {
      const c = currentConfig as import('../data/simulation').MyroomConfig;
      unitCounts['floor'] = c.floor;
      unitCounts['floor_duct'] = c.floor; // ダクトは床下ACと同数
      unitCounts['ldk'] = c.ldk1f + c.ldk2f;
      unitCounts['room'] = c.room1f + c.room2f;
    } else if (systemId === 'smart') {
      const c = currentConfig as SmartConfig;
      unitCounts['ac'] = c.units;
      unitCounts['duct'] = c.units;
    } else {
      unitCounts['system'] = 1;
    }
    return calcDisplayCosts(systemCfg, unitCounts);
  }, [systemId, currentConfig]);

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
    onAddSimulation(systemId, currentConfig, yearlyConfigs.length > 0 ? yearlyConfigs : undefined);
  };

  const addYearlyPeriod = () => {
    const last = yearlyConfigs[yearlyConfigs.length - 1];
    const fromYear = last ? last.toYear + 1 : 0;
    const unitKey = s.id === 'myroom' ? 'room' : s.id === 'smart' ? 'ac' : 'system';
    setYearlyConfigs(prev => [...prev, { unitKey, fromYear, toYear: fromYear + 5, units: 1 }]);
  };

  return (
    <div className="h-full flex flex-col px-[5vw] py-[10vh]">
      {/* Content */}
      <div className="flex-1 flex gap-5 md:gap-8 w-full mx-auto min-h-0">
        {/* Left - title + image (40%) */}
        <div className="shrink-0 w-[40%] flex flex-col justify-center self-center">
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-black mb-1 flex items-end gap-3 flex-wrap" style={{ color: s.color }}>
            {s.name}
            {systemId === 'myroom' && (
              <div className="flex gap-1.5" style={{ marginBottom: '7px' }}>
                <button
                  onClick={() => setHasFloorAc(false)}
                  className="px-3 py-1 rounded-lg text-[13px] font-bold cursor-pointer transition-all"
                  style={{
                    background: !hasFloorAc ? s.color : 'rgba(42,33,24,0.06)',
                    color: !hasFloorAc ? 'white' : 'var(--color-text-sub)',
                    border: !hasFloorAc ? 'none' : '1px solid var(--color-card-border)',
                  }}
                >
                  床下エアコンなし
                </button>
                <button
                  onClick={() => setHasFloorAc(true)}
                  className="px-3 py-1 rounded-lg text-[13px] font-bold cursor-pointer transition-all"
                  style={{
                    background: hasFloorAc ? s.color : 'rgba(42,33,24,0.06)',
                    color: hasFloorAc ? 'white' : 'var(--color-text-sub)',
                    border: hasFloorAc ? 'none' : '1px solid var(--color-card-border)',
                  }}
                >
                  床下エアコンあり
                </button>
              </div>
            )}
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
            <img src={systemId === 'myroom' && !hasFloorAc ? myroomNoFloorImg : images[systemId]} alt={s.name} className="w-full object-contain p-3" />
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
                <svg width="16" height="16" viewBox="0 0 640 640" fill="currentColor" style={{ color: s.color }}>
                  <path d="M173.3 66.5C181.4 62.4 191.2 63.3 198.4 68.8L518.4 308.7C526.7 314.9 530 325.7 526.8 335.5C523.6 345.3 514.4 351.9 504 351.9L351.7 351.9L440.6 529.6C448.5 545.4 442.1 564.6 426.3 572.5C410.5 580.4 391.3 574 383.4 558.2L294.5 380.5L203.2 502.3C197 510.6 186.2 513.9 176.4 510.7C166.6 507.5 160 498.3 160 488L160 88C160 78.9 165.1 70.6 173.3 66.5z" />
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
                        <option value="nounit">配置なし</option>
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
                        <option value="nounit">配置なし</option>
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

          {/* Detailed settings toggle + timeline */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDetailedSettings}
                onChange={e => setShowDetailedSettings(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
                style={{ accentColor: s.color }}
              />
              <span className="text-[13px] font-bold">年ごとの台数変動を設定</span>
            </label>
          </div>

          {showDetailedSettings && (
            <div className="space-y-2">
              <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                例: 0〜5年は居室1台 → 6〜20年は3台 → 21年以降は0台
              </p>
              {yearlyConfigs.map((yc, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={yc.unitKey}
                    onChange={e => {
                      const next = [...yearlyConfigs];
                      next[i] = { ...next[i], unitKey: e.target.value };
                      setYearlyConfigs(next);
                    }}
                    className="text-[13px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--color-card-border)', outline: 'none' }}
                  >
                    {(systemId === 'myroom' ? [
                      { key: 'floor', label: '床下AC' }, { key: 'ldk', label: 'LDK用' }, { key: 'room', label: '居室用' },
                    ] : systemId === 'smart' ? [
                      { key: 'ac', label: 'エアコン' }, { key: 'duct', label: 'ダクトファン' },
                    ] : [
                      { key: 'system', label: 'システム' },
                    ]).map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                  </select>
                  <input type="number" value={yc.fromYear} min={0}
                    onChange={e => { const next = [...yearlyConfigs]; next[i] = { ...next[i], fromYear: Number(e.target.value) }; setYearlyConfigs(next); }}
                    className="w-14 px-2 py-1 rounded-lg text-[13px]"
                    style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                  />
                  <span className="text-[13px]">〜</span>
                  <input type="number" value={yc.toYear} min={0}
                    onChange={e => { const next = [...yearlyConfigs]; next[i] = { ...next[i], toYear: Number(e.target.value) }; setYearlyConfigs(next); }}
                    className="w-14 px-2 py-1 rounded-lg text-[13px]"
                    style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                  />
                  <span className="text-[13px]">年</span>
                  <input type="number" value={yc.units} min={0}
                    onChange={e => { const next = [...yearlyConfigs]; next[i] = { ...next[i], units: Number(e.target.value) }; setYearlyConfigs(next); }}
                    className="w-14 px-2 py-1 rounded-lg text-[13px]"
                    style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                  />
                  <span className="text-[13px]">台</span>
                  <button onClick={() => setYearlyConfigs(prev => prev.filter((_, j) => j !== i))}
                    className="text-[13px] font-bold cursor-pointer" style={{ color: '#c45040' }}>×</button>
                </div>
              ))}
              <button onClick={addYearlyPeriod}
                className="text-[13px] font-bold cursor-pointer px-3 py-1 rounded-lg"
                style={{ color: s.color, border: `1px solid ${s.color}`, background: 'transparent' }}
              >
                + 期間を追加
              </button>
            </div>
          )}

          {/* Cost items - 3 columns with detail toggle */}
          <CostBreakdown costs={costs} systemId={systemId} color={s.color} />

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
