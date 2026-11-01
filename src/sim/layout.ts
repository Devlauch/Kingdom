// Shared village grid layout, used by both the 2D isometric view and the 3D view
// so a building placed in one always matches the other.
export const COURT_CELL = { col: 0, row: 0 };
export const FORGE_CELL = { col: 1, row: 0 };
export const STARTER_HUT_CELLS = [
  { col: -2, row: -1 }, { col: -1, row: -1 }, { col: 1, row: -1 }, { col: 2, row: -1 }, { col: -2, row: 1 },
];
export const FIELD_ROW = 2;
export const FIELD_CELLS = [0, 1, 2, 3, 4, 5].map((c) => ({ col: c - 2, row: FIELD_ROW }));
export const FOREST_EDGE_CELL = { col: -5, row: -1 };

export const RESERVED_CELLS = new Set(
  [COURT_CELL, FORGE_CELL, ...FIELD_CELLS, ...STARTER_HUT_CELLS].map((c) => `${c.col},${c.row}`)
);

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export type CellSelection =
  | { kind: 'field'; fieldIndex: number }
  | { kind: 'building'; buildingId: string }
  | { kind: 'empty-plot'; col: number; row: number }
  | { kind: 'forest'; col: number; row: number }
  | { kind: 'reserved' };

export function classifyCell(
  col: number,
  row: number,
  world: { clearedCells: Set<string>; buildings: { id: string; col: number; row: number }[] }
): CellSelection {
  const fieldIndex = FIELD_CELLS.findIndex((c) => c.col === col && c.row === row);
  if (fieldIndex >= 0) return { kind: 'field', fieldIndex };

  const key = cellKey(col, row);
  if (RESERVED_CELLS.has(key)) return { kind: 'reserved' };

  const building = world.buildings.find((b) => b.col === col && b.row === row);
  if (building) return { kind: 'building', buildingId: building.id };

  if (world.clearedCells.has(key)) return { kind: 'empty-plot', col, row };

  return { kind: 'forest', col, row };
}
