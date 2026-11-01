import { CONFIG } from '../config';
import type { WorldState, Field, CropStage } from '../types';

function stageForProgress(progress: number): CropStage {
  const t = CONFIG.cropStageThresholds;
  if (progress >= t[4]) return 'ripe';
  if (progress >= t[3]) return 'ripe';
  if (progress >= t[2]) return 'growing';
  if (progress >= t[1]) return 'sprout';
  return 'seedbed';
}

export function plantField(field: Field, cropType: Field['cropType'], day: number) {
  field.cropType = cropType;
  field.stage = 'seedbed';
  field.plantedOnDay = day;
  field.health = 100;
}

export function advanceCrops(world: WorldState) {
  for (const field of world.fields) {
    if (!field.cropType || field.plantedOnDay === null) continue;

    const growthDays = CONFIG.cropGrowthDays[field.cropType];
    const ageDays = world.calendar.day - field.plantedOnDay;
    const progress = Math.min(1, ageDays / growthDays);
    field.stage = stageForProgress(progress);

    // Weather damage depends on growth stage - same rain hits differently depending on timing.
    if (world.weather === 'rain') {
      field.health -= CONFIG.rainDamageByStage[field.stage] * 0.1;
    } else if (world.weather === 'drought') {
      field.health -= CONFIG.droughtDamagePerDay;
    } else if (world.weather === 'flood') {
      field.health -= world.nation.hasDam ? CONFIG.floodDamageWithDam : CONFIG.floodDamageNoDam;
    }

    field.health = Math.max(0, Math.min(100, field.health));

    if (field.health <= 0) {
      world.eventLog.unshift(`A ${field.cropType} field was destroyed before harvest.`);
      field.cropType = null;
      field.stage = 'empty';
      field.plantedOnDay = null;
      field.health = 100;
    }
  }
}

export function harvestReadyFields(world: WorldState): number {
  let foodProduced = 0;
  for (const field of world.fields) {
    if (field.stage === 'ripe' && field.cropType) {
      const yieldAmount = Math.round((field.health / 100) * 20);
      foodProduced += yieldAmount;
      world.eventLog.unshift(`Harvested ${yieldAmount} food from a ${field.cropType} field.`);
      field.cropType = null;
      field.stage = 'empty';
      field.plantedOnDay = null;
      field.health = 100;
    }
  }
  return foodProduced;
}
