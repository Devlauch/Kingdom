import { CONFIG } from './config';
import { makeNPC } from './npcFactory';
import type { WorldState, Field, Building, BuildingType, CropType } from './types';
import { advanceCalendar } from './systems/calendar';
import { advanceWeather } from './systems/weather';
import { advanceCrops, harvestReadyFields, plantField as plantFieldSystem } from './systems/crops';
import { advanceLivestock } from './systems/livestock';
import { advanceNeedsAndEmotions } from './systems/needs';
import { advanceEmployment, advanceOversight, reviewCourt as reviewCourtSystem } from './systems/employment';
import { advanceTreasury, buildDam as buildDamSystem } from './systems/treasury';
import { accruePerformance, handleSuccessionIfNeeded } from './systems/succession';
import { advanceResources } from './systems/resources';
import { makeAnimal } from './systems/livestock';

export const TILE_COUNT = 40; // soft display cap, not a hard limit - expansion is forest-clearing driven

export function initWorld(): WorldState {
  const npcs: WorldState['npcs'] = {};

  const king = makeNPC({ name: 'Rajan', ageDays: 30 * 360, isKing: true, isRoyal: true, job: 'king' });
  npcs[king.id] = king;

  for (let i = 0; i < CONFIG.startingPopulation - 1; i++) {
    const npc = makeNPC();
    npcs[npc.id] = npc;
  }

  const fields: Field[] = Array.from({ length: 6 }).map((_, i) => ({
    id: `field-${i}`,
    tileIndex: i,
    cropType: null,
    stage: 'empty',
    plantedOnDay: null,
    health: 100,
  }));

  const buildings: Building[] = [];

  // Nothing is pre-cleared - the ancestral huts and court sit in their own fixed clearing,
  // but every buildable tile beyond them starts as forest the player must cut down.
  const clearedCells = new Set<string>();

  return {
    calendar: { day: 0, season: 'spring', year: 1 },
    weather: 'clear',
    npcs,
    fields,
    animals: {},
    buildings,
    clearedCells,
    nation: {
      name: 'Your Kingdom',
      treasury: CONFIG.startingTreasury,
      taxRate: 10,
      hasDam: false,
      corruptionLevel: 0,
      crimeLevel: 0,
      daysSinceOversight: 0,
      wood: 20,
      forestStock: 100,
    },
    foodStock: 100,
    tileCount: TILE_COUNT,
    currentKingId: king.id,
    eventLog: ['Your father has died. The kingdom is now yours.'],
    running: false,
    speed: 1,
  };
}

export function tick(world: WorldState) {
  advanceCalendar(world);
  advanceWeather(world);
  advanceCrops(world);
  const harvested = harvestReadyFields(world);
  world.foodStock += harvested;
  advanceLivestock(world);
  advanceNeedsAndEmotions(world);
  advanceEmployment(world);
  advanceOversight(world);
  advanceTreasury(world);
  advanceResources(world);
  accruePerformance(world);
  handleSuccessionIfNeeded(world);

  if (world.eventLog.length > 50) world.eventLog.length = 50;
}

// --- Player actions ---

export function plantField(world: WorldState, fieldId: string, cropType: CropType) {
  const field = world.fields.find((f) => f.id === fieldId);
  if (!field || field.cropType) return;
  plantFieldSystem(field, cropType, world.calendar.day);
}

const BUILD_COSTS: Record<BuildingType, number> = {
  house: 30,
  school: 60,
  hospital: 80,
  dam: 120,
  pasture: 40,
};

const STAFF_REQUIRED: Record<BuildingType, number> = {
  house: 0,
  school: 1,
  hospital: 1,
  dam: 0,
  pasture: 0,
};

export function clearForest(world: WorldState, col: number, row: number): boolean {
  const key = `${col},${row}`;
  if (world.clearedCells.has(key)) return false;
  if (world.nation.treasury < CONFIG.clearForestCost) return false;

  world.nation.treasury -= CONFIG.clearForestCost;
  world.nation.forestStock = Math.max(0, world.nation.forestStock - CONFIG.forestClearImpact);
  world.clearedCells.add(key);
  world.eventLog.unshift('Cleared a patch of forest to make room for building.');
  return true;
}

export function buildStructure(world: WorldState, col: number, row: number, type: BuildingType): boolean {
  const key = `${col},${row}`;
  if (!world.clearedCells.has(key)) return false;
  const cost = BUILD_COSTS[type];
  if (world.nation.treasury < cost) return false;
  if (world.buildings.some((b) => b.col === col && b.row === row)) return false;

  if (type === 'dam') {
    return buildDamSystem(world, cost);
  }

  world.nation.treasury -= cost;
  world.buildings.push({
    id: `bldg-${col}-${row}-${type}-${world.calendar.day}`,
    col,
    row,
    type,
    staffIds: [],
    requiredStaff: STAFF_REQUIRED[type],
    level: 1,
  });
  world.eventLog.unshift(`Built a ${type}.`);
  return true;
}

export function demolishBuilding(world: WorldState, buildingId: string): boolean {
  const building = world.buildings.find((b) => b.id === buildingId);
  if (!building) return false;

  for (const staffId of building.staffIds) {
    const staff = world.npcs[staffId];
    if (staff) {
      staff.job = 'unemployed';
      staff.salary = 0;
    }
  }

  world.buildings = world.buildings.filter((b) => b.id !== buildingId);
  world.eventLog.unshift(`The ${building.type} was torn down. The tile is free to build on again.`);
  return true;
}

export function upgradeHouse(world: WorldState, buildingId: string): boolean {
  const building = world.buildings.find((b) => b.id === buildingId);
  if (!building || building.type !== 'house') return false;
  if (building.level >= 2) return false;
  if (world.nation.treasury < CONFIG.houseUpgradeCost.treasury) return false;
  if (world.nation.wood < CONFIG.houseUpgradeCost.wood) return false;

  world.nation.treasury -= CONFIG.houseUpgradeCost.treasury;
  world.nation.wood -= CONFIG.houseUpgradeCost.wood;
  building.level = 2;
  world.eventLog.unshift('A hut was rebuilt into a proper house.');
  return true;
}

export function buyAnimal(world: WorldState, species: 'cow' | 'sheep'): boolean {
  const hasPasture = world.buildings.some((b) => b.type === 'pasture');
  if (!hasPasture) return false;
  const cost = CONFIG.animalCost[species];
  if (world.nation.treasury < cost) return false;

  world.nation.treasury -= cost;
  const animal = makeAnimal(species, { ageDays: CONFIG.livestockMatureAgeDays });
  world.animals[animal.id] = animal;
  world.eventLog.unshift(`Bought a ${species} for the pasture.`);
  return true;
}

export function hireStaff(world: WorldState, buildingId: string, npcId: string, salary: number): boolean {
  const building = world.buildings.find((b) => b.id === buildingId);
  const npc = world.npcs[npcId];
  if (!building || !npc || !npc.alive || npc.job !== 'unemployed') return false;
  if (building.staffIds.length >= building.requiredStaff) return false;
  if (world.nation.treasury < salary) return false;

  building.staffIds.push(npc.id);
  npc.job = building.type === 'hospital' ? 'doctor' : building.type === 'school' ? 'teacher' : 'builder';
  npc.salary = salary;
  world.eventLog.unshift(`${npc.name} was hired at the ${building.type}.`);
  return true;
}

export function hireCourtRole(
  world: WorldState,
  npcId: string,
  job: 'minister' | 'soldier' | 'woodcutter' | 'blacksmith',
  salary: number
): boolean {
  const npc = world.npcs[npcId];
  if (!npc || !npc.alive || npc.job !== 'unemployed') return false;
  npc.job = job;
  npc.salary = salary;
  world.eventLog.unshift(`${npc.name} was appointed as ${job}.`);
  return true;
}

export function setTaxRate(world: WorldState, rate: number) {
  world.nation.taxRate = Math.max(0, Math.min(100, rate));
}

export function assignPost(world: WorldState, childId: string, post: NonNullable<import('./types').NPC['post']>) {
  const child = world.npcs[childId];
  if (!child) return;
  child.post = post;
}

export function reviewCourt(world: WorldState) {
  reviewCourtSystem(world);
}
