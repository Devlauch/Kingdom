import { CONFIG } from '../config';
import { chance } from '../rng';
import type { WorldState, Animal, AnimalSpecies } from '../types';

let animalCounter = 0;

export function makeAnimal(species: AnimalSpecies, overrides: Partial<Animal> = {}): Animal {
  animalCounter += 1;
  return {
    id: overrides.id ?? `animal-${animalCounter}`,
    species,
    sex: overrides.sex ?? (chance(0.5) ? 'M' : 'F'),
    ageDays: overrides.ageDays ?? 0,
    alive: true,
    pregnant: false,
    pregnantSinceDay: null,
    lastBredDay: null,
    health: overrides.health ?? 100,
  };
}

function isMature(animal: Animal): boolean {
  return animal.ageDays >= CONFIG.livestockMatureAgeDays;
}

export function advanceLivestock(world: WorldState) {
  const animals = Object.values(world.animals);
  const hasPasture = world.buildings.some((b) => b.type === 'pasture');

  for (const animal of animals) {
    if (!animal.alive) continue;
    animal.ageDays += 1;

    // No pasture, no food for the herd - health suffers.
    if (!hasPasture) {
      animal.health -= 1;
    }

    if (animal.pregnant && animal.pregnantSinceDay !== null) {
      const gestation = CONFIG.gestationDays[animal.species];
      if (world.calendar.day - animal.pregnantSinceDay >= gestation) {
        const baby = makeAnimal(animal.species, { ageDays: 0 });
        world.animals[baby.id] = baby;
        animal.pregnant = false;
        animal.pregnantSinceDay = null;
        world.eventLog.unshift(`A ${animal.species} gave birth.`);
      }
    }

    if (animal.health <= 0) {
      animal.alive = false;
      world.eventLog.unshift(`A ${animal.species} died.`);
    }
  }

  // Breeding: pair up mature, healthy, non-pregnant males and females of the same species.
  if (!hasPasture) return;
  const bySpecies: Record<string, Animal[]> = {};
  for (const a of animals) {
    if (!a.alive || !isMature(a) || a.health < 40) continue;
    (bySpecies[a.species] ??= []).push(a);
  }

  for (const group of Object.values(bySpecies)) {
    const females = group.filter((a) => a.sex === 'F' && !a.pregnant);
    const males = group.filter((a) => a.sex === 'M');
    if (males.length === 0) continue;

    for (const female of females) {
      const cooldownOk =
        female.lastBredDay === null ||
        world.calendar.day - female.lastBredDay >= CONFIG.breedCooldownDays;
      if (cooldownOk && chance(0.05)) {
        female.pregnant = true;
        female.pregnantSinceDay = world.calendar.day;
        female.lastBredDay = world.calendar.day;
      }
    }
  }
}
