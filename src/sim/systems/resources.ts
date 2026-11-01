import { CONFIG } from '../config';
import type { WorldState } from '../types';

export function advanceResources(world: WorldState) {
  const woodcutters = Object.values(world.npcs).filter((n) => n.alive && n.job === 'woodcutter');

  if (woodcutters.length > 0 && world.nation.forestStock > 0) {
    const cut = woodcutters.length * CONFIG.woodPerCutterPerDay * (world.nation.forestStock / 100);
    world.nation.wood += cut;
    world.nation.forestStock = Math.max(0, world.nation.forestStock - woodcutters.length * CONFIG.forestDepletionPerCutterPerDay);

    if (world.nation.forestStock < 20 && world.calendar.day % 15 === 0) {
      world.eventLog.unshift('The forest is thinning fast — wood is getting harder to find.');
    }
  } else {
    world.nation.forestStock = Math.min(100, world.nation.forestStock + CONFIG.forestRegrowPerDay);
  }
}
