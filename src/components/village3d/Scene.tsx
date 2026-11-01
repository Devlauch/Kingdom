import { useMemo } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { WorldState, Building } from '../../sim/types';
import { COURT_CELL, FORGE_CELL, STARTER_HUT_CELLS, FIELD_CELLS, RESERVED_CELLS, classifyCell, type CellSelection } from '../../sim/layout';
import { toonify } from './toon';

export const TILE = 3; // world units per grid cell

export function toWorld(col: number, row: number): [number, number, number] {
  return [col * TILE, 0, row * TILE];
}

function hashCell(col: number, row: number, mod: number): number {
  return Math.abs((col * 928371 + row * 689287 + col * row * 37) % mod);
}

const TREE_PATHS = [1, 2, 3, 4, 5].map((n) => `/assets/models/trees/tree-${n}.glb`);

function Tree({ col, row }: { col: number; row: number }) {
  const path = TREE_PATHS[hashCell(col, row, TREE_PATHS.length)];
  const { scene } = useGLTF(path);
  const toonified = useMemo(() => toonify(scene.clone(true)), [scene]);
  const [x, , z] = toWorld(col, row);
  const scale = 0.85 + (hashCell(col, row, 30) / 30) * 0.5;
  const rotation = (hashCell(col + 1, row + 1, 360) * Math.PI) / 180;
  const jitterX = (hashCell(col, row, 100) / 100 - 0.5) * 1.2;
  const jitterZ = (hashCell(row, col, 100) / 100 - 0.5) * 1.2;

  return <Clone object={toonified} position={[x + jitterX, 0, z + jitterZ]} scale={scale} rotation={[0, rotation, 0]} />;
}

function Forest({ world }: { world: WorldState }) {
  const cells = useMemo(() => {
    let minCol = -8, maxCol = 8, minRow = -8, maxRow = 8;
    for (const key of world.clearedCells) {
      const [c, r] = key.split(',').map(Number);
      minCol = Math.min(minCol, c - 5);
      maxCol = Math.max(maxCol, c + 5);
      minRow = Math.min(minRow, r - 5);
      maxRow = Math.max(maxRow, r + 5);
    }
    const out: { col: number; row: number }[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = `${col},${row}`;
        if (world.clearedCells.has(key) || RESERVED_CELLS.has(key)) continue;
        out.push({ col, row });
      }
    }
    return out;
  }, [world.clearedCells]);

  return (
    <group>
      {cells.map((c) => (
        <Tree key={`${c.col},${c.row}`} col={c.col} row={c.row} />
      ))}
    </group>
  );
}

const HUT_COLORS: Record<string, { wall: string; roof: string }> = {
  house: { wall: '#d8c39a', roof: '#8b5a3c' },
  school: { wall: '#cdb9e0', roof: '#6a4a8a' },
  hospital: { wall: '#f0d8d8', roof: '#b0524f' },
  pasture: { wall: '#d9d0a8', roof: '#6b7a3a' },
};

function Hut({ col, row, type = 'house', big = false }: { col: number; row: number; type?: string; big?: boolean }) {
  const [x, , z] = toWorld(col, row);
  const colors = HUT_COLORS[type] ?? HUT_COLORS.house;
  const size = big ? 1.5 : 1.15;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, size * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[size * 1.3, size, size * 1.3]} />
        <meshToonMaterial color={colors.wall} />
      </mesh>
      <mesh position={[0, size * 1.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[size * 1.05, size * 0.8, 4]} />
        <meshToonMaterial color={colors.roof} />
      </mesh>
    </group>
  );
}

function Crops({ world }: { world: WorldState }) {
  const stageColor: Record<string, string> = {
    empty: '#8a7450',
    seedbed: '#6b7a3a',
    sprout: '#7a9a3a',
    growing: '#8ab23a',
    ripe: '#c9d24a',
  };
  return (
    <group>
      {world.fields.map((f, i) => {
        const cell = FIELD_CELLS[i] ?? FIELD_CELLS[FIELD_CELLS.length - 1];
        const [x, , z] = toWorld(cell.col, cell.row);
        return (
          <mesh key={f.id} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TILE * 0.85, TILE * 0.85]} />
            <meshToonMaterial color={stageColor[f.stage] ?? stageColor.empty} />
          </mesh>
        );
      })}
    </group>
  );
}

function PropModel({ path, position, scale = 1, rotation = 0 }: { path: string; position: [number, number, number]; scale?: number; rotation?: number }) {
  const { scene } = useGLTF(path);
  const toonified = useMemo(() => toonify(scene.clone(true)), [scene]);
  return <Clone object={toonified} position={position} scale={scale} rotation={[0, rotation, 0]} />;
}

function GroundPlanes({ world, onSelectCell }: { world: WorldState; onSelectCell?: (s: CellSelection) => void }) {
  const extent = useMemo(() => {
    let minCol = -3, maxCol = 3, minRow = -3, maxRow = 3;
    for (const key of world.clearedCells) {
      const [c, r] = key.split(',').map(Number);
      minCol = Math.min(minCol, c);
      maxCol = Math.max(maxCol, c);
      minRow = Math.min(minRow, r);
      maxRow = Math.max(maxRow, r);
    }
    const cx = ((minCol + maxCol) / 2) * TILE;
    const cz = ((minRow + maxRow) / 2) * TILE;
    const sizeX = (maxCol - minCol + 4) * TILE;
    const sizeZ = (maxRow - minRow + 4) * TILE;
    return { cx, cz, sizeX, sizeZ };
  }, [world.clearedCells]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!onSelectCell) return;
    const col = Math.round(e.point.x / TILE);
    const row = Math.round(e.point.z / TILE);
    onSelectCell(classifyCell(col, row, world));
  };

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow onClick={handleClick}>
        <planeGeometry args={[400, 400]} />
        <meshToonMaterial color="#3a5a2c" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[extent.cx, 0, extent.cz]} receiveShadow onClick={handleClick}>
        <planeGeometry args={[extent.sizeX, extent.sizeZ]} />
        <meshToonMaterial color="#c9a876" />
      </mesh>
    </>
  );
}

export default function Scene({
  world,
  buildings,
  onSelectCell,
}: {
  world: WorldState;
  buildings: Building[];
  onSelectCell?: (s: CellSelection) => void;
}) {
  return (
    <group>
      <GroundPlanes world={world} onSelectCell={onSelectCell} />
      <Forest world={world} />
      <Crops world={world} />

      {STARTER_HUT_CELLS.map((c) => (
        <Hut key={`${c.col},${c.row}`} col={c.col} row={c.row} />
      ))}
      <Hut col={COURT_CELL.col} row={COURT_CELL.row} big />

      {buildings.map((b) => (
        <Hut key={b.id} col={b.col} row={b.row} type={b.type} big={b.type !== 'house'} />
      ))}

      <PropModel path="/assets/models/village/stall.glb" position={toWorld(FORGE_CELL.col + 1, FORGE_CELL.row)} />
      <PropModel path="/assets/models/village/stall-green.glb" position={toWorld(FORGE_CELL.col + 2, FORGE_CELL.row + 1)} rotation={0.6} />
      <PropModel path="/assets/models/village/well.glb" position={toWorld(0, 2.0 / TILE)} scale={0.8} />
      <PropModel path="/assets/models/village/watchtower.glb" position={toWorld(-4, -3)} scale={1.1} />

      {[-1, 0, 1].map((i) => (
        <PropModel key={`fence-n-${i}`} path="/assets/models/village/fence.glb" position={toWorld(i * 1.2, -1.8)} />
      ))}
      {[-1, 0, 1].map((i) => (
        <PropModel key={`fence-s-${i}`} path="/assets/models/village/fence.glb" position={toWorld(i * 1.2, 1.8)} />
      ))}
    </group>
  );
}

TREE_PATHS.forEach((p) => useGLTF.preload(p));
['stall.glb', 'stall-green.glb', 'stall-red.glb', 'well.glb', 'watchtower.glb', 'fence.glb', 'fence-gate.glb'].forEach((f) =>
  useGLTF.preload(`/assets/models/village/${f}`)
);
