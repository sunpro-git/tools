import type { SystemId } from './systems';

// --- Types ---

export interface CostItem {
  label: string;
  cost: number;          // 万円
  intervalYears: number; // 何年おき（1=毎年, 0=初期費用のみ）
  note?: string;
}

export interface UnitCost {
  key: string;
  label: string;
  initialCosts: CostItem[];      // 初期費用（intervalYears=0）
  electricityCosts: CostItem[];  // 電気代（intervalYears=1が基本）
  maintenanceCosts: CostItem[];  // 維持管理費用
}

export interface YearlyUnitConfig {
  unitKey: string;       // UnitCost.key
  fromYear: number;
  toYear: number;
  units: number | string; // number for台数, string for分配空調の選択肢
}

export interface SystemCostConfig {
  systemId: SystemId;
  label: string;
  unitCosts: UnitCost[];
  yearlyConfigs: YearlyUnitConfig[]; // 詳細設定モード
}

export interface CostConfig {
  systems: Record<SystemId, SystemCostConfig>;
}

// --- Default values ---

const defaultConfig: CostConfig = {
  systems: {
    myroom: {
      systemId: 'myroom',
      label: '個別空調',
      unitCosts: [
        {
          key: 'floor', label: '床下エアコン',
          initialCosts: [
            { label: '本体', cost: 20, intervalYears: 0 },
            { label: '工事費', cost: 5, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代', cost: 4.8, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 1, intervalYears: 1 },
            { label: '本体交換', cost: 20, intervalYears: 12 },
          ],
        },
        {
          key: 'ldk', label: 'LDK用エアコン',
          initialCosts: [
            { label: '本体', cost: 15, intervalYears: 0 },
            { label: '工事費', cost: 3, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代', cost: 7.2, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.5, intervalYears: 1 },
            { label: '本体交換', cost: 15, intervalYears: 12 },
          ],
        },
        {
          key: 'room', label: '居室用エアコン',
          initialCosts: [
            { label: '本体', cost: 10, intervalYears: 0 },
            { label: '工事費', cost: 2, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代', cost: 3.6, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.5, intervalYears: 1 },
            { label: '本体交換', cost: 10, intervalYears: 12 },
          ],
        },
      ],
      yearlyConfigs: [],
    },
    smart: {
      systemId: 'smart',
      label: '分配空調',
      unitCosts: [
        {
          key: '1f_floor', label: '1Fエアコン（床下に分配）',
          initialCosts: [
            { label: '本体', cost: 30, intervalYears: 0 },
            { label: '工事費', cost: 3.8, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代', cost: 6, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.4, intervalYears: 1 },
            { label: '本体交換', cost: 15, intervalYears: 12 },
            { label: 'ダクト清掃', cost: 3, intervalYears: 7 },
          ],
        },
        {
          key: '1f_floor2', label: '1Fエアコン（床下+2箇所に分配）',
          initialCosts: [
            { label: '本体', cost: 30, intervalYears: 0 },
            { label: '工事費', cost: 5, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代', cost: 6, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.4, intervalYears: 1 },
            { label: '本体交換', cost: 15, intervalYears: 12 },
            { label: 'ダクト清掃', cost: 3, intervalYears: 7 },
            { label: 'ファン交換', cost: 5, intervalYears: 12 },
          ],
        },
        {
          key: '2f_2rooms', label: '2Fエアコン（2箇所に分配）',
          initialCosts: [
            { label: '本体', cost: 30, intervalYears: 0 },
            { label: '工事費', cost: 4, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代', cost: 6, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.4, intervalYears: 1 },
            { label: '本体交換', cost: 15, intervalYears: 12 },
            { label: 'ダクト清掃', cost: 3, intervalYears: 7 },
            { label: 'ファン交換', cost: 5, intervalYears: 12 },
          ],
        },
      ],
      yearlyConfigs: [],
    },
    zenkan: {
      systemId: 'zenkan',
      label: '全館空調',
      unitCosts: [
        {
          key: 'system', label: '全館空調システム with air',
          initialCosts: [
            { label: 'システム一式', cost: 366, intervalYears: 0 },
          ],
          electricityCosts: [
            { label: '電気代（24時間運転）', cost: 21.6, intervalYears: 1 },
          ],
          maintenanceCosts: [
            { label: '定期メンテナンス', cost: 2.5, intervalYears: 1 },
            { label: '本体交換', cost: 200, intervalYears: 15 },
          ],
        },
      ],
      yearlyConfigs: [],
    },
  },
};

// --- localStorage management ---

const STORAGE_KEY = 'ac-selector-cost-config';

export function loadCostConfig(): CostConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return structuredClone(defaultConfig);
}

export function saveCostConfig(config: CostConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetCostConfig(): CostConfig {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(defaultConfig);
}

export function getDefaultConfig(): CostConfig {
  return structuredClone(defaultConfig);
}

// --- Calculation helpers using config ---

export function calcYearlyCostFromConfig(
  systemConfig: SystemCostConfig,
  unitCounts: Record<string, number>,
  year: number,
  entryYearlyConfigs?: YearlyUnitConfig[],
): number {
  let cost = 0;
  for (const uc of systemConfig.unitCosts) {
    const yearlyOverride = [...(entryYearlyConfigs ?? []), ...systemConfig.yearlyConfigs].find(
      yc => yc.unitKey === uc.key && year >= yc.fromYear && year <= yc.toYear
    );
    const count = typeof yearlyOverride?.units === 'number' ? yearlyOverride.units : (unitCounts[uc.key] ?? 0);

    // Initial costs (year 0 only)
    if (year === 0) {
      for (const ic of uc.initialCosts) {
        cost += ic.cost * count;
      }
    }

    // Electricity costs
    if (year > 0) {
      for (const ec of uc.electricityCosts) {
        if (ec.intervalYears > 0 && year % ec.intervalYears === 0) {
          cost += ec.cost * count;
        } else if (ec.intervalYears === 1) {
          cost += ec.cost * count;
        }
      }
    }

    // Maintenance costs
    if (year > 0) {
      for (const mc of uc.maintenanceCosts) {
        if (mc.intervalYears > 0 && year % mc.intervalYears === 0) {
          cost += mc.cost * count;
        }
      }
    }
  }

  return cost;
}

export function calcCumulativeFromConfig(
  systemConfig: SystemCostConfig,
  unitCounts: Record<string, number>,
  maxYears: number,
  entryYearlyConfigs?: YearlyUnitConfig[],
): { year: number; cost: number }[] {
  const data: { year: number; cost: number }[] = [];
  let cumulative = 0;

  for (let y = 0; y <= maxYears; y++) {
    cumulative += calcYearlyCostFromConfig(systemConfig, unitCounts, y, entryYearlyConfigs);
    data.push({ year: y, cost: Math.round(cumulative * 10) / 10 });
  }

  return data;
}

// --- Display cost summary from config ---
export interface DisplayCosts {
  price: string;
  electricity: string;
  maintenance: string;
  priceValue: number;
  electricityValue: number;
  maintenanceValue: number;
}

export function calcDisplayCosts(
  systemConfig: SystemCostConfig,
  unitCounts: Record<string, number>,
): DisplayCosts {
  let totalPrice = 0;
  let totalElectricity = 0;
  let totalMaintenance = 0;

  for (const uc of systemConfig.unitCosts) {
    const count = unitCounts[uc.key] ?? 0;
    for (const ic of uc.initialCosts) {
      totalPrice += ic.cost * count;
    }
    for (const ec of uc.electricityCosts) {
      totalElectricity += ec.cost * count;
    }
    for (const mc of uc.maintenanceCosts) {
      totalMaintenance += (mc.cost / (mc.intervalYears || 1)) * count;
    }
  }

  const totalUnits = Object.values(unitCounts).reduce((a, b) => a + b, 0);

  return {
    price: totalUnits === 0 ? '台数を選択してください' : `${totalPrice.toFixed(1)}万円`,
    electricity: totalUnits === 0 ? '—' : `年間 ${totalElectricity.toFixed(1)}万円`,
    maintenance: totalUnits === 0 ? '—' : `年間 ${totalMaintenance.toFixed(1)}万円`,
    priceValue: totalPrice,
    electricityValue: totalElectricity,
    maintenanceValue: totalMaintenance,
  };
}
