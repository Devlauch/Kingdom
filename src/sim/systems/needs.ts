import { CONFIG } from '../config';
import { chance } from '../rng';
import type { WorldState, NPC } from '../types';

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export function advanceNeedsAndEmotions(world: WorldState) {
  const living = Object.values(world.npcs).filter((n) => n.alive);

  // Feed the population from the food stock. Not enough food -> hunger rises for everyone.
  const foodNeeded = living.length;
  const fed = Math.min(world.foodStock, foodNeeded);
  world.foodStock = Math.max(0, world.foodStock - fed);
  const shortageRatio = foodNeeded > 0 ? 1 - fed / foodNeeded : 0;

  if (shortageRatio > 0.3 && world.calendar.day % 10 === 0) {
    world.eventLog.unshift('Food shortage — people are going hungry.');
  }

  for (const npc of living) {
    npc.ageDays += 1;

    // Hunger: fed people recover, unfed people worsen.
    if (shortageRatio <= 0) {
      npc.needs.hunger = clamp(npc.needs.hunger - 3);
    } else {
      npc.needs.hunger = clamp(npc.needs.hunger + CONFIG.hungerIncreasePerDay * (0.3 + shortageRatio));
    }

    // Starvation damages health.
    if (npc.needs.hunger >= CONFIG.hungerStarvationThreshold) {
      npc.needs.health = clamp(npc.needs.health - CONFIG.healthDeclineWhenStarving);
    } else if (npc.needs.health < 100) {
      npc.needs.health = clamp(npc.needs.health + 0.5);
    }

    // Emotions react to real conditions, not player commands.
    let happinessTarget = 60;
    happinessTarget -= npc.needs.hunger * 0.3;
    happinessTarget -= world.nation.taxRate * CONFIG.happinessTaxPenaltyPerPercent;
    if (npc.job === 'unemployed') happinessTarget -= 15;
    if (world.nation.crimeLevel > 40) happinessTarget -= 10;
    if (world.nation.corruptionLevel > 40) happinessTarget -= 10;

    npc.emotions.happiness = clamp(npc.emotions.happiness + (happinessTarget - npc.emotions.happiness) * 0.05);
    npc.emotions.fear = clamp(npc.emotions.fear + (world.nation.crimeLevel * 0.3 - npc.emotions.fear) * 0.05);
    npc.emotions.anger = clamp(
      npc.emotions.anger + ((npc.job === 'unemployed' ? 20 : 0) + world.nation.taxRate * 0.4 - npc.emotions.anger) * 0.03
    );

    checkDeath(world, npc);
  }
}

function checkDeath(world: WorldState, npc: NPC) {
  if (!npc.alive) return;

  if (npc.needs.health <= CONFIG.deathHealthThreshold) {
    killNpc(world, npc, npc.needs.hunger >= CONFIG.hungerStarvationThreshold ? 'starvation' : 'illness');
    return;
  }

  if (npc.ageDays >= npc.lifespanDays) {
    killNpc(world, npc, 'old age');
    return;
  }

  // Small baseline chance of disease death, worse without a staffed hospital.
  const hospital = world.buildings.find((b) => b.type === 'hospital');
  const hasDoctor = !!hospital && hospital.staffIds.length > 0;
  const diseaseRisk = hasDoctor ? 0.00005 : 0.0004;
  if (chance(diseaseRisk)) {
    killNpc(world, npc, 'disease');
  }
}

export function killNpc(world: WorldState, npc: NPC, cause: string) {
  npc.alive = false;
  npc.deathCause = cause;
  world.eventLog.unshift(`${npc.name} died of ${cause}.`);

  if (npc.isKing) {
    world.eventLog.unshift(`The king has died! The kingdom awaits its heir.`);
  }
}
