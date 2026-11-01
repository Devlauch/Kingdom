import { CONFIG } from '../config';
import type { WorldState, Season } from '../types';

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function advanceCalendar(world: WorldState) {
  world.calendar.day += 1;
  const dayInYear = world.calendar.day % (CONFIG.daysPerSeason * CONFIG.seasonsPerYear);
  const seasonIndex = Math.floor(dayInYear / CONFIG.daysPerSeason);
  const newSeason = SEASON_ORDER[seasonIndex];
  if (newSeason !== world.calendar.season) {
    world.calendar.season = newSeason;
    world.eventLog.unshift(`Season changed to ${newSeason}.`);
  }
  if (dayInYear === 0 && world.calendar.day > 0) {
    world.calendar.year += 1;
  }
}
