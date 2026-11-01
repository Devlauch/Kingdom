import { CONFIG } from '../config';
import { chance } from '../rng';
import type { WorldState } from '../types';

export function advanceEmployment(world: WorldState) {
  if (world.calendar.day % CONFIG.emigrationCheckDays !== 0) return;

  const living = Object.values(world.npcs).filter((n) => n.alive && !n.isKing);
  for (const npc of living) {
    if (npc.emotions.happiness < CONFIG.emigrationHappinessThreshold && chance(0.3)) {
      delete world.npcs[npc.id];
      world.eventLog.unshift(`${npc.name} left to seek a better life elsewhere.`);
    }
  }
}

export function advanceOversight(world: WorldState) {
  world.nation.daysSinceOversight += 1;

  if (world.nation.daysSinceOversight > CONFIG.uncheckedDaysBeforeRisk) {
    if (chance(CONFIG.corruptionRiskPerUncheckedDay)) {
      world.nation.corruptionLevel = Math.min(100, world.nation.corruptionLevel + 5);
      world.eventLog.unshift('Unchecked officials have grown more corrupt.');
    }
  }

  const soldiers = Object.values(world.npcs).filter((n) => n.alive && n.job === 'soldier');
  const blacksmiths = Object.values(world.npcs).filter((n) => n.alive && n.job === 'blacksmith');
  const hasWeapons = blacksmiths.length > 0 && world.nation.wood > 0;
  const effectiveSoldiers = hasWeapons ? soldiers.length * 1.5 : soldiers.length;

  if (hasWeapons) {
    world.nation.wood = Math.max(0, world.nation.wood - blacksmiths.length * 0.5);
  }

  if (effectiveSoldiers === 0) {
    world.nation.crimeLevel = Math.min(100, world.nation.crimeLevel + CONFIG.crimeRiseNoSoldiers);
  } else {
    world.nation.crimeLevel = Math.max(0, world.nation.crimeLevel - effectiveSoldiers * 0.5);
  }

  if (world.nation.corruptionLevel >= 90 || world.nation.crimeLevel >= 90) {
    world.eventLog.unshift('The kingdom teeters on the edge of collapse.');
  }
}

export function reviewCourt(world: WorldState) {
  world.nation.daysSinceOversight = 0;
  world.nation.corruptionLevel = Math.max(0, world.nation.corruptionLevel - 10);
}
