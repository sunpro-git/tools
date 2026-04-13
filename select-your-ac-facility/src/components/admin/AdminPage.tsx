import { useState, useCallback } from 'react';
import type { SystemId } from '../../data/systems';
import { loadCostConfig, saveCostConfig, resetCostConfig, type CostConfig } from '../../data/costConfig';
import { BasicCostEditor } from './BasicCostEditor';

const TABS: { id: SystemId; label: string; color: string }[] = [
  { id: 'myroom', label: '個別空調', color: '#4a7de8' },
  { id: 'smart', label: '分配空調', color: '#e8734a' },
  { id: 'zenkan', label: '全館空調', color: '#4ab87a' },
];

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [config, setConfig] = useState<CostConfig>(loadCostConfig);
  const [activeTab, setActiveTab] = useState<SystemId>('myroom');
  const handleChange = useCallback((systemId: SystemId, updated: CostConfig['systems'][SystemId]) => {
    setConfig(prev => {
      const next = { ...prev, systems: { ...prev.systems, [systemId]: updated } };
      saveCostConfig(next);
      return next;
    });
  }, []);

  const handleReset = () => {
    const def = resetCostConfig();
    setConfig(def);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ac-cost-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          saveCostConfig(imported);
          setConfig(imported);
        } catch {
          alert('JSONファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">シミュレーション費用設定</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-sub)' }}>
              各空調方式の単価・維持管理費用・年ごとの台数変動を設定
            </p>
          </div>
          <button
            onClick={onBack}
            className="nav-btn-outline px-5 py-2.5 text-sm"
          >
            ← 戻る
          </button>
        </div>

        {/* System tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all"
              style={{
                background: activeTab === tab.id ? tab.color : 'rgba(42,33,24,0.06)',
                color: activeTab === tab.id ? 'white' : 'var(--color-text-sub)',
                border: activeTab === tab.id ? 'none' : '1px solid var(--color-card-border)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <BasicCostEditor
          config={config.systems[activeTab]}
          onChange={(updated) => handleChange(activeTab, updated)}
          color={TABS.find(t => t.id === activeTab)!.color}
        />

        {/* Footer actions */}
        <div className="flex items-center gap-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--color-card-border)' }}>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer"
            style={{ color: '#c45040', border: '1px solid #c45040', background: 'transparent' }}
          >
            デフォルトに戻す
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer"
              style={{ color: 'var(--color-text)', border: '1px solid var(--color-card-border)', background: 'transparent' }}
            >
              JSONエクスポート
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer"
              style={{ color: 'var(--color-text)', border: '1px solid var(--color-card-border)', background: 'transparent' }}
            >
              JSONインポート
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
