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

export const defaultConfigs: SimConfig = {
  myroom: { floor: 0, ldk: 1, room: 2 },
  smart: { units: 2, floor1: 'floor+2', floor2: '2rooms' },
  zenkan: { system: 1 },
};


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
