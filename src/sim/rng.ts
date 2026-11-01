// Small seedable RNG so simulation runs are reproducible for debugging.
let seed = 42;

export function setSeed(s: number) {
  seed = s;
}

export function rand(): number {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function chance(probability0to1: number): boolean {
  return rand() < probability0to1;
}

export function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
