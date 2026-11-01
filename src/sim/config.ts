// Central tuning knobs. Change numbers here, not inside system logic.
export const CONFIG = {
  // Time
  msPerDayAtSpeed1: 3000, // 1 in-game day every 3 real seconds at 1x speed
  daysPerSeason: 30,
  seasonsPerYear: 4,

  // Crops
  cropGrowthDays: { rice: 100, wheat: 80 } as Record<string, number>,
  cropStageThresholds: [0, 0.15, 0.4, 0.8, 1], // fraction of growth -> seedbed/sprout/growing/ripe
  rainDamageByStage: { seedbed: 5, sprout: 35, growing: 15, ripe: 5 } as Record<string, number>,
  droughtDamagePerDay: 2,
  floodDamageNoDam: 70,
  floodDamageWithDam: 10,

  // Livestock
  livestockMatureAgeDays: 180,
  gestationDays: { cow: 280, sheep: 150 } as Record<string, number>,
  breedCooldownDays: 60,

  // NPC needs
  hungerIncreasePerDay: 4,
  hungerStarvationThreshold: 80,
  healthDeclineWhenStarving: 3,
  deathHealthThreshold: 0,
  baseLifespanDays: 70 * 360,
  lifespanVarianceDays: 15 * 360,

  // Emotions
  happinessDecayUnemployed: 2,
  happinessTaxPenaltyPerPercent: 0.6,
  emigrationHappinessThreshold: 20,
  emigrationCheckDays: 10,

  // Jobs & salaries
  salaries: { minister: 8, soldier: 5, teacher: 4, doctor: 6, woodcutter: 4, blacksmith: 5 } as Record<string, number>,

  // Wood & forest
  woodPerCutterPerDay: 3,
  forestDepletionPerCutterPerDay: 0.15,
  forestRegrowPerDay: 0.05,
  houseUpgradeCost: { treasury: 50, wood: 40 },
  animalCost: { cow: 25, sheep: 15 },
  clearForestCost: 15,
  forestClearImpact: 2,

  // Corruption & crime
  corruptionRiskPerUncheckedDay: 0.15, // % chance per day accrues once unchecked streak is long
  uncheckedDaysBeforeRisk: 20,
  crimeRiseNoSoldiers: 1.5,

  // Starting state
  startingPopulation: 50,
  startingTreasury: 200,
};
