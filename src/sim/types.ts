export type Sex = 'M' | 'F';

export type JobType =
  | 'unemployed'
  | 'farmer'
  | 'herder'
  | 'builder'
  | 'soldier'
  | 'minister'
  | 'teacher'
  | 'doctor'
  | 'woodcutter'
  | 'blacksmith'
  | 'king';

export type PostType = 'army' | 'treasury' | 'district' | 'diplomacy';

export interface Needs {
  hunger: number; // 0 (full) -> 100 (starving)
  health: number; // 100 (healthy) -> 0 (dead)
  shelter: number; // 0 (housed) -> 100 (homeless)
}

export interface Emotions {
  happiness: number; // 0-100
  fear: number;
  anger: number;
  grief: number;
}

export interface NPC {
  id: string;
  name: string;
  sex: Sex;
  ageDays: number;
  lifespanDays: number;
  alive: boolean;
  job: JobType;
  salary: number;
  needs: Needs;
  emotions: Emotions;
  spouseId: string | null;
  parentIds: string[];
  childIds: string[];
  isKing: boolean;
  isRoyal: boolean;
  post: PostType | null;
  performanceScore: number; // accrues while serving a post; decides succession
  deathCause: string | null;
}

export type CropType = 'rice' | 'wheat';
export type CropStage = 'empty' | 'seedbed' | 'sprout' | 'growing' | 'ripe';

export interface Field {
  id: string;
  tileIndex: number;
  cropType: CropType | null;
  stage: CropStage;
  plantedOnDay: number | null;
  health: number; // 0-100, damaged by weather; 0 = destroyed
}

export type AnimalSpecies = 'cow' | 'sheep';

export interface Animal {
  id: string;
  species: AnimalSpecies;
  sex: Sex;
  ageDays: number;
  alive: boolean;
  pregnant: boolean;
  pregnantSinceDay: number | null;
  lastBredDay: number | null;
  health: number;
}

export type BuildingType = 'house' | 'school' | 'hospital' | 'dam' | 'pasture';

export interface Building {
  id: string;
  col: number;
  row: number;
  type: BuildingType;
  staffIds: string[]; // required to function
  requiredStaff: number;
  level: number; // house upgrades raise this
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'rain' | 'drought' | 'flood';

export interface Calendar {
  day: number;
  season: Season;
  year: number;
}

export interface Nation {
  name: string;
  treasury: number;
  taxRate: number; // 0-100
  hasDam: boolean;
  corruptionLevel: number; // 0-100
  crimeLevel: number; // 0-100
  daysSinceOversight: number;
  wood: number;
  forestStock: number; // 0-100, depletes as woodcutters work; a real finite resource
}

export interface WorldState {
  calendar: Calendar;
  weather: Weather;
  npcs: Record<string, NPC>;
  fields: Field[];
  animals: Record<string, Animal>;
  buildings: Building[];
  nation: Nation;
  foodStock: number;
  clearedCells: Set<string>; // "col,row" keys of forest tiles the player has cleared and can build on
  tileCount: number;
  currentKingId: string | null;
  eventLog: string[];
  running: boolean;
  speed: number;
}
