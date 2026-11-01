import { chance } from '../rng';
import type { WorldState, NPC } from '../types';

export function accruePerformance(world: WorldState) {
  const livingWithPost = Object.values(world.npcs).filter((n) => n.alive && n.post);
  for (const npc of livingWithPost) {
    // Performance drifts based on effort (random) and happiness - a miserable heir performs worse.
    const roll = chance(0.5) ? 1 : -0.5;
    const moraleFactor = npc.emotions.happiness / 100;
    npc.performanceScore += roll * moraleFactor;
  }
}

function pickHeir(world: WorldState, king: NPC): NPC | null {
  const children = king.childIds
    .map((id) => world.npcs[id])
    .filter((c) => c && c.alive);

  if (children.length > 0) {
    // Merit-based succession: best performance in their assigned post wins, not birth order.
    return children.reduce((best, c) => (c.performanceScore > best.performanceScore ? c : best));
  }

  if (king.spouseId) {
    const spouse = world.npcs[king.spouseId];
    if (spouse && spouse.alive) return spouse;
  }

  return null;
}

export function handleSuccessionIfNeeded(world: WorldState) {
  const king = world.currentKingId ? world.npcs[world.currentKingId] : null;
  if (king && king.alive) return;

  const oldKing = king;
  const heir = oldKing ? pickHeir(world, oldKing) : null;

  if (!heir) {
    world.eventLog.unshift('With no heir to take the throne, the kingdom falls into chaos.');
    world.currentKingId = null;
    return;
  }

  heir.isKing = true;
  heir.job = 'king';
  heir.post = null;
  world.currentKingId = heir.id;
  world.eventLog.unshift(`${heir.name} ascends to the throne.`);
}
