import type { WorldState } from '../types';

export function advanceTreasury(world: WorldState) {
  const living = Object.values(world.npcs).filter((n) => n.alive);

  // Tax collected daily in small amounts, scaled by population and rate.
  const taxIncome = living.length * (world.nation.taxRate / 100) * 0.5;
  world.nation.treasury += taxIncome;

  // Corruption silently skims the treasury.
  if (world.nation.corruptionLevel > 0) {
    const leak = (world.nation.corruptionLevel / 100) * taxIncome * 0.5;
    world.nation.treasury -= leak;
  }

  // Salaries paid daily; unpaid staff quit.
  const paidStaff = living.filter((n) => n.salary > 0);
  const totalSalaries = paidStaff.reduce((sum, n) => sum + n.salary, 0);

  if (world.nation.treasury >= totalSalaries) {
    world.nation.treasury -= totalSalaries;
  } else {
    world.nation.treasury = 0;
    for (const staff of paidStaff) {
      staff.job = 'unemployed';
      staff.salary = 0;
      world.eventLog.unshift(`${staff.name} quit — the treasury could not pay salaries.`);
    }
  }

  world.nation.treasury = Math.max(0, world.nation.treasury);
}

export function buildDam(world: WorldState, cost: number): boolean {
  if (world.nation.treasury < cost) return false;
  world.nation.treasury -= cost;
  world.nation.hasDam = true;
  world.eventLog.unshift('A dam has been built, guarding the fields from floods.');
  return true;
}
