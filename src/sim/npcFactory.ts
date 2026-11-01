import { CONFIG } from './config';
import { randInt, pick, chance } from './rng';
import type { NPC, Sex } from './types';

const FIRST_NAMES_M = ['Arjun', 'Veer', 'Ravi', 'Dev', 'Aman', 'Kabir', 'Rohan', 'Ishan'];
const FIRST_NAMES_F = ['Asha', 'Meera', 'Priya', 'Kiran', 'Diya', 'Nisha', 'Tara', 'Isha'];

let npcCounter = 0;

export function makeNPC(overrides: Partial<NPC> = {}): NPC {
  npcCounter += 1;
  const sex: Sex = overrides.sex ?? (chance(0.5) ? 'M' : 'F');
  const name = overrides.name ?? pick(sex === 'M' ? FIRST_NAMES_M : FIRST_NAMES_F);
  const ageDays = overrides.ageDays ?? randInt(16, 45) * 360;
  const lifespanDays =
    overrides.lifespanDays ??
    CONFIG.baseLifespanDays + randInt(-CONFIG.lifespanVarianceDays, CONFIG.lifespanVarianceDays);

  return {
    id: overrides.id ?? `npc-${npcCounter}`,
    name,
    sex,
    ageDays,
    lifespanDays,
    alive: true,
    job: overrides.job ?? 'unemployed',
    salary: overrides.salary ?? 0,
    needs: overrides.needs ?? { hunger: randInt(0, 20), health: 100, shelter: 0 },
    emotions: overrides.emotions ?? { happiness: randInt(50, 70), fear: 0, anger: 0, grief: 0 },
    spouseId: overrides.spouseId ?? null,
    parentIds: overrides.parentIds ?? [],
    childIds: overrides.childIds ?? [],
    isKing: overrides.isKing ?? false,
    isRoyal: overrides.isRoyal ?? false,
    post: overrides.post ?? null,
    performanceScore: overrides.performanceScore ?? 0,
    deathCause: null,
  };
}
