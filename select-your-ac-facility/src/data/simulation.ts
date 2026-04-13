import type { SystemId } from './systems';

// --- Config types ---
export interface MyroomConfig {
  floor: number;   // 床下エアコン 0-2
  ldk: number;     // LDK用エアコン 0-2
  room: number;    // 居室用エアコン 0-4
}

export interface SmartConfig {
  units: number;
  floor1: 'none' | 'floor' | 'floor+2' | 'nounit';   // 1階: 分配しない / 床下に分配 / 床下+2箇所 / 配置なし
  floor2: 'none' | '2rooms' | 'nounit';               // 2階: 分配しない / 2箇所に分配 / 配置なし
}

export interface ZenkanConfig {
  system: number;
}

export type SimConfig = {
  myroom: MyroomConfig;
  smart: SmartConfig;
  zenkan: ZenkanConfig;
};

// --- SimEntry (for multi-plan comparison) ---
export interface SimEntry {
  id: string;
  systemId: SystemId;
  label: string;
  config: SimConfig[SystemId];
  yearlyConfigs?: import('./costConfig').YearlyUnitConfig[];
}

// --- Cost result ---
export interface CostResult {
  price: string;
  electricity: string;
  maintenance: string;
  priceValue: number;
  electricityValue: number;
  maintenanceValue: number;
  totalUnits: number;
}

// --- Unit costs (dummy data) ---
const UNIT_COSTS = {
  floor:  { price: 25, electricity: 0.4, maintenance: 0.8, replacement: 20 },
  ldk:    { price: 18, electricity: 0.6, maintenance: 0.5, replacement: 15 },
  room:   { price: 12, electricity: 0.3, maintenance: 0.5, replacement: 10 },
  smart:  { price: 33.8, electricity: 0.5, maintenance: 0.4, replacement: 15 },
  zenkan: { price: 366, electricity: 1.8, maintenance: 2.5, replacement: 200 },
};

// Replacement cycles (years)
const REPLACEMENT_CYCLE: Record<SystemId, number> = {
  myroom: 10,
  smart: 10,
  zenkan: 15,
};

export const defaultConfigs: SimConfig = {
  myroom: { floor: 0, ldk: 1, room: 2 },
  smart: { units: 2, floor1: 'floor+2', floor2: '2rooms' },
  zenkan: { system: 1 },
};

// --- Calculate display costs ---
export function calcCosts(systemId: SystemId, config: SimConfig[typeof systemId]): CostResult {
  if (systemId === 'myroom') {
    const c = config as MyroomConfig;
    const totalUnits = c.floor + c.ldk1f + c.room1f + c.ldk2f + c.room2f;
    const price = c.floor * UNIT_COSTS.floor.price + (c.ldk1f + c.ldk2f) * UNIT_COSTS.ldk.price + (c.room1f + c.room2f) * UNIT_COSTS.room.price;
    const elec = c.floor * UNIT_COSTS.floor.electricity + (c.ldk1f + c.ldk2f) * UNIT_COSTS.ldk.electricity + (c.room1f + c.room2f) * UNIT_COSTS.room.electricity;
    const maint = c.floor * UNIT_COSTS.floor.maintenance + (c.ldk1f + c.ldk2f) * UNIT_COSTS.ldk.maintenance + (c.room1f + c.room2f) * UNIT_COSTS.room.maintenance;
    return {
      price: totalUnits === 0 ? '台数を選択してください' : `約${price}万円〜（計${totalUnits}台）`,
      electricity: totalUnits === 0 ? '—' : `月額 約${elec.toFixed(1)}万円（目安）`,
      maintenance: totalUnits === 0 ? '—' : `年間 約${maint.toFixed(1)}万円（${totalUnits}台分）`,
      priceValue: price, electricityValue: elec, maintenanceValue: maint, totalUnits,
    };
  }
  if (systemId === 'smart') {
    const c = config as SmartConfig;
    const price = c.units * UNIT_COSTS.smart.price;
    const elec = c.units * UNIT_COSTS.smart.electricity;
    const maint = c.units * UNIT_COSTS.smart.maintenance;
    return {
      price: `約${price.toFixed(1)}万円〜（${c.units}台+ダクト）`,
      electricity: `月額 約${elec.toFixed(1)}万円（目安）`,
      maintenance: `年間 約${maint.toFixed(1)}万円（${c.units}台分）`,
      priceValue: price, electricityValue: elec, maintenanceValue: maint, totalUnits: c.units,
    };
  }
  return {
    price: `約${UNIT_COSTS.zenkan.price}万円`,
    electricity: `月額 約${UNIT_COSTS.zenkan.electricity}万円（24時間運転）`,
    maintenance: `年間 約${UNIT_COSTS.zenkan.maintenance}万円（専門業者）`,
    priceValue: UNIT_COSTS.zenkan.price, electricityValue: UNIT_COSTS.zenkan.electricity, maintenanceValue: UNIT_COSTS.zenkan.maintenance, totalUnits: 1,
  };
}

// --- Calculate cumulative costs over years ---
function getYearlyCosts(systemId: SystemId, config: SimConfig[typeof systemId]) {
  const costs = calcCosts(systemId, config);
  const annualElec = costs.electricityValue * 12;
  const annualMaint = costs.maintenanceValue;

  // Replacement cost per cycle
  let replacementCost = 0;
  if (systemId === 'myroom') {
    const c = config as MyroomConfig;
    replacementCost = c.floor * UNIT_COSTS.floor.replacement + (c.ldk1f + c.ldk2f) * UNIT_COSTS.ldk.replacement + (c.room1f + c.room2f) * UNIT_COSTS.room.replacement;
  } else if (systemId === 'smart') {
    const c = config as SmartConfig;
    replacementCost = c.units * UNIT_COSTS.smart.replacement;
  } else {
    replacementCost = UNIT_COSTS.zenkan.replacement;
  }

  return {
    initialCost: costs.priceValue,
    annualRunning: annualElec + annualMaint,
    replacementCost,
    replacementCycle: REPLACEMENT_CYCLE[systemId],
  };
}

export function calcCumulativeCosts(entry: SimEntry, maxYears: number): { year: number; cost: number }[] {
  const { initialCost, annualRunning, replacementCost, replacementCycle } = getYearlyCosts(entry.systemId, entry.config);
  const data: { year: number; cost: number }[] = [];

  for (let y = 0; y <= maxYears; y++) {
    const running = annualRunning * y;
    const replacements = y > 0 ? Math.floor(y / replacementCycle) * replacementCost : 0;
    data.push({ year: y, cost: Math.round(initialCost + running + replacements) });
  }

  return data;
}

// --- Label generation ---
const PLAN_LABELS = ['A', 'B', 'C', 'D', 'E'];

function configDetail(systemId: SystemId, config: SimConfig[SystemId]): string {
  if (systemId === 'myroom') {
    const c = config as MyroomConfig;
    const parts: string[] = [];
    if (c.floor > 0) parts.push(`床下AC×${c.floor}`);
    if (c.ldk > 0) parts.push(`LDK×${c.ldk}`);
    if (c.room > 0) parts.push(`居室×${c.room}`);
    return parts.length > 0 ? parts.join(' / ') : '未選択';
  }
  if (systemId === 'smart') {
    const c = config as SmartConfig;
    const f1 = c.floor1 === 'none' ? '1F分配なし' : c.floor1 === 'floor' ? '1F床下' : '1F床下+2箇所';
    const f2 = c.floor2 === 'none' ? '2F分配なし' : '2F 2箇所';
    return `${f1} / ${f2}`;
  }
  return '1式';
}

export function generateLabel(systemId: SystemId, config: SimConfig[SystemId], existingEntries: SimEntry[]): string {
  const systemNames: Record<SystemId, string> = { myroom: '個別空調', smart: '分配空調', zenkan: '全館空調' };
  const sameSystem = existingEntries.filter(e => e.systemId === systemId);
  const idx = sameSystem.length;
  const detail = configDetail(systemId, config);
  return `${systemNames[systemId]}${PLAN_LABELS[idx] ?? (idx + 1)}（${detail}）`;
}
