import { chance } from '../rng';
import type { WorldState, Weather } from '../types';

// Weather probabilities shift by season - this is the "nature doesn't ask permission" system.
const SEASON_WEATHER_WEIGHTS: Record<string, Record<Weather, number>> = {
  spring: { clear: 0.55, rain: 0.35, drought: 0.02, flood: 0.08 },
  summer: { clear: 0.5, rain: 0.2, drought: 0.25, flood: 0.05 },
  autumn: { clear: 0.6, rain: 0.3, drought: 0.05, flood: 0.05 },
  winter: { clear: 0.75, rain: 0.2, drought: 0.02, flood: 0.03 },
};

function rollWeather(season: string): Weather {
  const weights = SEASON_WEATHER_WEIGHTS[season];
  const roll = Math.random();
  let acc = 0;
  for (const [type, weight] of Object.entries(weights)) {
    acc += weight;
    if (roll <= acc) return type as Weather;
  }
  return 'clear';
}

export function advanceWeather(world: WorldState) {
  const previous = world.weather;
  world.weather = rollWeather(world.calendar.season);

  if (world.weather === 'flood' && previous !== 'flood') {
    world.eventLog.unshift(
      world.nation.hasDam
        ? 'Heavy rain threatens flooding, but the dam holds back most of the damage.'
        : 'Flood! Without a dam, the water tears through the fields.'
    );
  } else if (world.weather === 'drought' && previous !== 'drought') {
    world.eventLog.unshift('A drought begins. Crops will wither without rain.');
  } else if (world.weather === 'rain' && previous === 'clear' && chance(0.3)) {
    world.eventLog.unshift('Rain falls over the village.');
  }
}
