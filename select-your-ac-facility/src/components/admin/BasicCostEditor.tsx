import React from 'react';
import type { SystemCostConfig, CostItem } from '../../data/costConfig';

interface BasicCostEditorProps {
  config: SystemCostConfig;
  onChange: (config: SystemCostConfig) => void;
  color: string;
}

function CostTable({
  label, icon, items, color,
  onChange, onAdd, onRemove,
  showInterval,
}: {
  label: string;
  icon: React.ReactNode;
  items: CostItem[];
  color: string;
  onChange: (idx: number, updates: Partial<CostItem>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  showInterval?: boolean;
}) {
  return (
    <div>
      <span className="text-[13px] font-bold mb-2 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <table className="w-full text-sm mb-2">
        <thead>
          <tr style={{ color: 'var(--color-text-sub)' }}>
            <th className="text-left text-[13px] font-bold pb-1 w-44">項目名</th>
            <th className="text-left text-[13px] font-bold pb-1 w-24">費用（万円）</th>
            {showInterval && <th className="text-left text-[13px] font-bold pb-1 w-20">何年おき</th>}
            <th className="text-left text-[13px] font-bold pb-1">備考</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="pr-2 pb-1">
                <input type="text" value={item.label}
                  onChange={e => onChange(i, { label: e.target.value })}
                  className="w-full px-2 py-1 rounded text-[13px]"
                  style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                />
              </td>
              <td className="pr-2 pb-1">
                <input type="number" value={item.cost} step="0.1"
                  onChange={e => onChange(i, { cost: Number(e.target.value) })}
                  className="w-full px-2 py-1 rounded text-[13px]"
                  style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                />
              </td>
              {showInterval && (
                <td className="pr-2 pb-1">
                  <input type="number" value={item.intervalYears} min={1}
                    onChange={e => onChange(i, { intervalYears: Number(e.target.value) })}
                    className="w-full px-2 py-1 rounded text-[13px]"
                    style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                  />
                </td>
              )}
              <td className="pr-2 pb-1">
                <input type="text" value={item.note ?? ''} placeholder="備考"
                  onChange={e => onChange(i, { note: e.target.value })}
                  className="w-full px-2 py-1 rounded text-[13px]"
                  style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.5)', color: 'var(--color-text-sub)' }}
                />
              </td>
              <td className="pb-1">
                <button onClick={() => onRemove(i)} className="text-[13px] cursor-pointer px-1" style={{ color: '#c45040' }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onAdd}
        className="text-[13px] font-bold cursor-pointer px-3 py-1 rounded-lg"
        style={{ color, border: `1px solid ${color}`, background: 'transparent' }}
      >
        + 行を追加
      </button>
    </div>
  );
}

// SVG icons
const PriceIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor" style={{ color }}>
    <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z" />
  </svg>
);
const ElecIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor" style={{ color }}>
    <path d="M224 32C241.7 32 256 46.3 256 64L256 160L384 160L384 64C384 46.3 398.3 32 416 32C433.7 32 448 46.3 448 64L448 160L512 160C529.7 160 544 174.3 544 192C544 209.7 529.7 224 512 224L512 288C512 383.1 442.8 462.1 352 477.3L352 544C352 561.7 337.7 576 320 576C302.3 576 288 561.7 288 544L288 477.3C197.2 462.1 128 383.1 128 288L128 224C110.3 224 96 209.7 96 192C96 174.3 110.3 160 128 160L192 160L192 64C192 46.3 206.3 32 224 32z" />
  </svg>
);
const MaintIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor" style={{ color }}>
    <path d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z" />
  </svg>
);

export function BasicCostEditor({ config, onChange, color }: BasicCostEditorProps) {
  const updateCostList = (unitIdx: number, listKey: 'initialCosts' | 'electricityCosts' | 'maintenanceCosts', itemIdx: number, updates: Partial<CostItem>) => {
    const units = [...config.unitCosts];
    const list = [...units[unitIdx][listKey]];
    list[itemIdx] = { ...list[itemIdx], ...updates };
    units[unitIdx] = { ...units[unitIdx], [listKey]: list };
    onChange({ ...config, unitCosts: units });
  };

  const addCostItem = (unitIdx: number, listKey: 'initialCosts' | 'electricityCosts' | 'maintenanceCosts') => {
    const units = [...config.unitCosts];
    const defaultInterval = listKey === 'initialCosts' ? 0 : 1;
    units[unitIdx] = {
      ...units[unitIdx],
      [listKey]: [...units[unitIdx][listKey], { label: '', cost: 0, intervalYears: defaultInterval }],
    };
    onChange({ ...config, unitCosts: units });
  };

  const removeCostItem = (unitIdx: number, listKey: 'initialCosts' | 'electricityCosts' | 'maintenanceCosts', itemIdx: number) => {
    const units = [...config.unitCosts];
    units[unitIdx] = {
      ...units[unitIdx],
      [listKey]: units[unitIdx][listKey].filter((_, i) => i !== itemIdx),
    };
    onChange({ ...config, unitCosts: units });
  };

  return (
    <div className="space-y-6">
      {config.unitCosts.map((unit, ui) => (
        <div key={unit.key} className="card p-4">
          <h4 className="text-base font-black mb-4 px-3 py-2 rounded-lg" style={{ background: color + '15', color }}>
            {unit.label}
          </h4>

          <div className="space-y-4">
            <CostTable
              label="初期費用" icon={<PriceIcon color={color} />}
              items={unit.initialCosts} color={color}
              onChange={(i, u) => updateCostList(ui, 'initialCosts', i, u)}
              onAdd={() => addCostItem(ui, 'initialCosts')}
              onRemove={(i) => removeCostItem(ui, 'initialCosts', i)}
            />
            <CostTable
              label="年間電気代" icon={<ElecIcon color={color} />}
              items={unit.electricityCosts} color={color}
              onChange={(i, u) => updateCostList(ui, 'electricityCosts', i, u)}
              onAdd={() => addCostItem(ui, 'electricityCosts')}
              onRemove={(i) => removeCostItem(ui, 'electricityCosts', i)}
            />
            <CostTable
              label="維持管理費用" icon={<MaintIcon color={color} />}
              items={unit.maintenanceCosts} color={color} showInterval
              onChange={(i, u) => updateCostList(ui, 'maintenanceCosts', i, u)}
              onAdd={() => addCostItem(ui, 'maintenanceCosts')}
              onRemove={(i) => removeCostItem(ui, 'maintenanceCosts', i)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
