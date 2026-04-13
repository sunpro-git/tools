import type { SystemId } from './systems';

// --- Types ---

export interface MaintenanceCost {
  label: string;
  cost: number;          // 万円
  intervalYears: number; // 何年おき
  note?: string;         // 備考
}

export interface UnitCost {
  key: string;           // unique key (e.g. "floor", "ldk", "room")
  label: string;
  price: number;         // 初期費用（万円/台）
  priceNote?: string;    // 初期費用の備考
  electricityPerYear: number; // 年間電気代（万円/台）
  electricityNote?: string;   // 電気代の備考
  maintenanceCosts: MaintenanceCost[];
}

export interface YearlyUnitConfig {
  unitKey: string;       // UnitCost.key
  fromYear: number;
  toYear: number;
  units: number;
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
          key: 'floor', label: '床下AC',
          price: 25, electricityPerYear: 4.8,
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 1, intervalYears: 1 },
            { label: '本体交換', cost: 20, intervalYears: 12 },
          ],
        },
        {
          key: 'floor_duct', label: '床下AC用ダクト',
          price: 5, electricityPerYear: 0,
          maintenanceCosts: [
            { label: 'ダクト清掃', cost: 2, intervalYears: 7 },
          ],
        },
        {
          key: 'ldk', label: 'LDK用',
          price: 18, electricityPerYear: 7.2,
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.5, intervalYears: 1 },
            { label: '本体交換', cost: 15, intervalYears: 12 },
          ],
        },
        {
          key: 'room', label: '居室用',
          price: 12, electricityPerYear: 3.6,
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
          key: 'ac', label: 'エアコン',
          price: 33.8, electricityPerYear: 6,
          maintenanceCosts: [
            { label: 'フィルター清掃', cost: 0.4, intervalYears: 1 },
            { label: '本体交換', cost: 15, intervalYears: 12 },
          ],
        },
        {
          key: 'duct', label: 'ダクトファン',
          price: 0, electricityPerYear: 0.5,
          maintenanceCosts: [
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
          key: 'system', label: 'システム',
          price: 366, electricityPerYear: 21.6,
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
    // Check yearly config for unit count override (entry-level first via order)
    const yearlyOverride = [...(entryYearlyConfigs ?? []), ...systemConfig.yearlyConfigs].find(
      yc => yc.unitKey === uc.key && year >= yc.fromYear && year <= yc.toYear
    );
    const count = yearlyOverride?.units ?? (unitCounts[uc.key] ?? 0);

    // Initial cost (year 0 only)
    if (year === 0) {
      cost += uc.price * count;
    }

    // Annual electricity
    if (year > 0) {
      cost += uc.electricityPerYear * count;
    }

    // Maintenance costs
    if (year > 0) {
      for (const mc of uc.maintenanceCosts) {
        if (year % mc.intervalYears === 0) {
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
    totalPrice += uc.price * count;
    totalElectricity += uc.electricityPerYear * count;
    // Maintenance: sum all items, dividing periodic costs by interval
    for (const mc of uc.maintenanceCosts) {
      totalMaintenance += (mc.cost / mc.intervalYears) * count;
    }
  }

  const totalUnits = Object.values(unitCounts).reduce((a, b) => a + b, 0);

  return {
    price: totalUnits === 0 ? '台数を選択してください' : `${Math.round(totalPrice)}万円`,
    electricity: totalUnits === 0 ? '—' : `年間 ${totalElectricity.toFixed(1)}万円`,
    maintenance: totalUnits === 0 ? '—' : `年間 ${totalMaintenance.toFixed(1)}万円`,
    priceValue: totalPrice,
    electricityValue: totalElectricity,
    maintenanceValue: totalMaintenance,
  };
}
