import type { SystemCostConfig, UnitCost, MaintenanceCost } from '../../data/costConfig';

interface BasicCostEditorProps {
  config: SystemCostConfig;
  onChange: (config: SystemCostConfig) => void;
  color: string;
}

export function BasicCostEditor({ config, onChange, color }: BasicCostEditorProps) {
  const updateUnit = (idx: number, updates: Partial<UnitCost>) => {
    const units = [...config.unitCosts];
    units[idx] = { ...units[idx], ...updates };
    onChange({ ...config, unitCosts: units });
  };

  const updateMaintenance = (unitIdx: number, maintIdx: number, updates: Partial<MaintenanceCost>) => {
    const units = [...config.unitCosts];
    const maints = [...units[unitIdx].maintenanceCosts];
    maints[maintIdx] = { ...maints[maintIdx], ...updates };
    units[unitIdx] = { ...units[unitIdx], maintenanceCosts: maints };
    onChange({ ...config, unitCosts: units });
  };

  const addMaintenance = (unitIdx: number) => {
    const units = [...config.unitCosts];
    units[unitIdx] = {
      ...units[unitIdx],
      maintenanceCosts: [...units[unitIdx].maintenanceCosts, { label: '', cost: 0, intervalYears: 1 }],
    };
    onChange({ ...config, unitCosts: units });
  };

  const removeMaintenance = (unitIdx: number, maintIdx: number) => {
    const units = [...config.unitCosts];
    units[unitIdx] = {
      ...units[unitIdx],
      maintenanceCosts: units[unitIdx].maintenanceCosts.filter((_, i) => i !== maintIdx),
    };
    onChange({ ...config, unitCosts: units });
  };

  return (
    <div className="space-y-6">
      {config.unitCosts.map((unit, ui) => (
        <div key={unit.key} className="card p-4">
          <h4
            className="text-base font-black mb-3 px-3 py-2 rounded-lg"
            style={{ background: color + '15', color }}
          >
            {unit.label}
          </h4>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <span className="text-[13px] font-bold mb-1 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor" style={{ color }}>
                  <path d="M341.8 72.6C329.5 61.2 310.5 61.2 298.3 72.6L74.3 280.6C64.7 289.6 61.5 303.5 66.3 315.7C71.1 327.9 82.8 336 96 336L112 336L112 512C112 547.3 140.7 576 176 576L464 576C499.3 576 528 547.3 528 512L528 336L544 336C557.2 336 569 327.9 573.8 315.7C578.6 303.5 575.4 289.5 565.8 280.6L341.8 72.6zM304 384L336 384C362.5 384 384 405.5 384 432L384 528L256 528L256 432C256 405.5 277.5 384 304 384z" />
                </svg>
                初期費用（万円/台）
              </span>
              <input
                type="number"
                value={unit.price}
                onChange={e => updateUnit(ui, { price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                step="0.1"
              />
            </div>
            <div>
              <span className="text-[13px] font-bold block mb-1">備考</span>
              <input
                type="text"
                value={unit.priceNote ?? ''}
                onChange={e => updateUnit(ui, { priceNote: e.target.value })}
                placeholder="備考"
                className="w-full px-3 py-2 rounded-lg text-[13px]"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.5)', color: 'var(--color-text-sub)' }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <span className="text-[13px] font-bold mb-1 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor" style={{ color }}>
                  <path d="M224 32C241.7 32 256 46.3 256 64L256 160L384 160L384 64C384 46.3 398.3 32 416 32C433.7 32 448 46.3 448 64L448 160L512 160C529.7 160 544 174.3 544 192C544 209.7 529.7 224 512 224L512 288C512 383.1 442.8 462.1 352 477.3L352 544C352 561.7 337.7 576 320 576C302.3 576 288 561.7 288 544L288 477.3C197.2 462.1 128 383.1 128 288L128 224C110.3 224 96 209.7 96 192C96 174.3 110.3 160 128 160L192 160L192 64C192 46.3 206.3 32 224 32z" />
                </svg>
                年間電気代（万円/台）
              </span>
              <input
                type="number"
                value={unit.electricityPerYear}
                onChange={e => updateUnit(ui, { electricityPerYear: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                step="0.1"
              />
            </div>
            <div>
              <span className="text-[13px] font-bold block mb-1">備考</span>
              <input
                type="text"
                value={unit.electricityNote ?? ''}
                onChange={e => updateUnit(ui, { electricityNote: e.target.value })}
                placeholder="備考"
                className="w-full px-3 py-2 rounded-lg text-[13px]"
                style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.5)', color: 'var(--color-text-sub)' }}
              />
            </div>
          </div>

          <div>
            <span className="text-[13px] font-bold mb-2 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 640 640" fill="currentColor" style={{ color }}>
                <path d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z" />
              </svg>
              維持管理費用
            </span>
            <table className="w-full text-sm mb-2">
              <thead>
                <tr style={{ color: 'var(--color-text-sub)' }}>
                  <th className="text-left text-[13px] font-bold pb-1 w-56">項目名</th>
                  <th className="text-left text-[13px] font-bold pb-1 w-24">費用（万円）</th>
                  <th className="text-left text-[13px] font-bold pb-1 w-20">何年おき</th>
                  <th className="text-left text-[13px] font-bold pb-1">備考</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {unit.maintenanceCosts.map((mc, mi) => (
                  <tr key={mi}>
                    <td className="pr-2 pb-1">
                      <input
                        type="text"
                        value={mc.label}
                        onChange={e => updateMaintenance(ui, mi, { label: e.target.value })}
                        className="w-full px-2 py-1 rounded text-[13px]"
                        style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                      />
                    </td>
                    <td className="pr-2 pb-1">
                      <input
                        type="number"
                        value={mc.cost}
                        onChange={e => updateMaintenance(ui, mi, { cost: Number(e.target.value) })}
                        className="w-full px-2 py-1 rounded text-[13px]"
                        style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                        step="0.1"
                      />
                    </td>
                    <td className="pr-2 pb-1">
                      <input
                        type="number"
                        value={mc.intervalYears}
                        onChange={e => updateMaintenance(ui, mi, { intervalYears: Number(e.target.value) })}
                        className="w-full px-2 py-1 rounded text-[13px]"
                        style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.7)' }}
                        min="1"
                      />
                    </td>
                    <td className="pr-2 pb-1">
                      <input
                        type="text"
                        value={mc.note ?? ''}
                        onChange={e => updateMaintenance(ui, mi, { note: e.target.value })}
                        placeholder="備考"
                        className="w-full px-2 py-1 rounded text-[13px]"
                        style={{ border: '1px solid var(--color-card-border)', background: 'rgba(255,255,255,0.5)', color: 'var(--color-text-sub)' }}
                      />
                    </td>
                    <td className="pb-1">
                      <button
                        onClick={() => removeMaintenance(ui, mi)}
                        className="text-[13px] cursor-pointer px-1"
                        style={{ color: '#c45040' }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => addMaintenance(ui)}
              className="text-[13px] font-bold cursor-pointer px-3 py-1 rounded-lg"
              style={{ color: 'var(--color-accent-orange)', border: '1px solid var(--color-accent-orange)', background: 'transparent' }}
            >
              + 行を追加
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
