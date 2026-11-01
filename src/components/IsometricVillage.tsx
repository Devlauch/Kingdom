import { useEffect, useRef } from 'react';
import type { WorldState, Building } from '../sim/types';
import { COURT_CELL, FORGE_CELL, STARTER_HUT_CELLS, FIELD_CELLS, FOREST_EDGE_CELL, RESERVED_CELLS } from '../sim/layout';

const TILE_W = 96;
const TILE_H = 48;
const ORIGIN_X = 760;
const ORIGIN_Y = 420;
const WIDTH = 1520;
const HEIGHT = 1000;

function isoToScreen(col: number, row: number) {
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * (TILE_H / 2),
  };
}

function screenToIso(x: number, y: number) {
  const dx = (x - ORIGIN_X) / (TILE_W / 2);
  const dy = (y - ORIGIN_Y) / (TILE_H / 2);
  return { col: Math.round((dx + dy) / 2), row: Math.round((dy - dx) / 2) };
}

function faceForEmotions(happiness: number, anger: number, fear: number): string {
  if (anger > 55) return '😠';
  if (fear > 55) return '😨';
  if (happiness >= 65) return '😊';
  if (happiness >= 40) return '😐';
  return '😢';
}

function hashId(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

const ASSET_PATHS = {
  grass: '/assets/ground/grass_sheet.png',
  dirt: '/assets/ground/dirt_sheet.png',
  hut: '/assets/buildings/hut.png',
  school: '/assets/buildings/school.png',
  hospital: '/assets/buildings/hospital.png',
  court: '/assets/buildings/court.png',
  pasture: '/assets/buildings/pasture.png',
  sprout: '/assets/crops/sprout.png',
  growing: '/assets/crops/growing.png',
  ripe: '/assets/crops/ripe.png',
  fence: '/assets/props/fence.png',
  tree1: '/assets/trees/tree-1.png',
  tree2: '/assets/trees/tree-2.png',
  tree3: '/assets/trees/tree-3.png',
  tree4: '/assets/trees/tree-4.png',
  tree5: '/assets/trees/tree-5.png',
  tree6: '/assets/trees/tree-6.png',
  tree7: '/assets/trees/tree-7.png',
  tree8: '/assets/trees/tree-8.png',
  tree9: '/assets/trees/tree-9.png',
  tree10: '/assets/trees/tree-10.png',
  tree11: '/assets/trees/tree-11.png',
  tree12: '/assets/trees/tree-12.png',
};

type AssetKey = keyof typeof ASSET_PATHS;
const TREE_KEYS: AssetKey[] = ['tree1', 'tree2', 'tree3', 'tree4', 'tree5', 'tree6', 'tree7', 'tree8', 'tree9', 'tree10', 'tree11', 'tree12'];
const BUILDING_SPRITE: Record<string, AssetKey> = { house: 'hut', school: 'school', hospital: 'hospital', pasture: 'pasture' };

function loadImages(): Record<AssetKey, HTMLImageElement> {
  const images = {} as Record<AssetKey, HTMLImageElement>;
  (Object.keys(ASSET_PATHS) as AssetKey[]).forEach((key) => {
    const img = new Image();
    img.src = ASSET_PATHS[key];
    images[key] = img;
  });
  return images;
}

function treeIndexFor(col: number, row: number): number {
  return Math.abs((col * 37 + row * 91 + col * row * 13) % TREE_KEYS.length);
}

interface VisualPos {
  x: number;
  y: number;
  tx: number;
  ty: number;
  nextRetarget: number;
}

export type CellSelection =
  | { kind: 'field'; fieldIndex: number }
  | { kind: 'building'; buildingId: string }
  | { kind: 'empty-plot'; col: number; row: number }
  | { kind: 'forest'; col: number; row: number }
  | { kind: 'reserved' };

interface Props {
  worldRef: React.RefObject<WorldState>;
  onSelectCell: (selection: CellSelection) => void;
}

export default function IsometricVillage({ worldRef, onSelectCell }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Record<AssetKey, HTMLImageElement>>(loadImages());
  const npcVisualsRef = useRef<Map<string, VisualPos>>(new Map());
  const animalVisualsRef = useRef<Map<string, VisualPos>>(new Map());
  const rainRef = useRef<{ x: number; y: number; speed: number }[]>(
    Array.from({ length: 90 }).map(() => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      speed: 4 + Math.random() * 4,
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const { col, row } = screenToIso(x, y);
      const world = worldRef.current;
      const key = `${col},${row}`;

      const fieldIndex = FIELD_CELLS.findIndex((c) => c.col === col && c.row === row);
      if (fieldIndex >= 0) {
        onSelectCell({ kind: 'field', fieldIndex });
        return;
      }
      if (RESERVED_CELLS.has(key)) {
        onSelectCell({ kind: 'reserved' });
        return;
      }
      const building = world.buildings.find((b) => b.col === col && b.row === row);
      if (building) {
        onSelectCell({ kind: 'building', buildingId: building.id });
        return;
      }
      if (world.clearedCells.has(key)) {
        onSelectCell({ kind: 'empty-plot', col, row });
        return;
      }
      onSelectCell({ kind: 'forest', col, row });
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [worldRef, onSelectCell]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    const ctx = ctx2d;
    const images = imagesRef.current;

    let lastTime = performance.now();
    let frameId: number;

    function drawGroundTile(key: AssetKey, col: number, row: number) {
      const img = images[key];
      if (!img.complete || img.naturalWidth === 0) return;
      const { x, y } = isoToScreen(col, row);
      ctx.drawImage(img, 0, 0, 128, 64, x - TILE_W / 2, y - TILE_H / 2, TILE_W, TILE_H);
    }

    function drawSprite(key: AssetKey, col: number, row: number, displayW: number) {
      const img = images[key];
      if (!img.complete || img.naturalWidth === 0) return;
      const { x, y } = isoToScreen(col, row);
      const ratio = img.naturalHeight / img.naturalWidth;
      const displayH = displayW * ratio;
      ctx.drawImage(img, x - displayW / 2, y + TILE_H / 2 - displayH, displayW, displayH);
    }

    function stepVisual(map: Map<string, VisualPos>, id: string, anchor: { x: number; y: number }, radius: number, time: number, dt: number) {
      let v = map.get(id);
      if (!v) {
        const seedAngle = hashId(id, 360) * (Math.PI / 180);
        const seedR = (hashId(id + 'r', 100) / 100) * radius;
        const sx = anchor.x + Math.cos(seedAngle) * seedR;
        const sy = anchor.y + Math.sin(seedAngle) * seedR * 0.5;
        v = { x: sx, y: sy, tx: sx, ty: sy, nextRetarget: time };
        map.set(id, v);
      }
      if (time > v.nextRetarget) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        v.tx = anchor.x + Math.cos(angle) * r;
        v.ty = anchor.y + Math.sin(angle) * r * 0.5;
        v.nextRetarget = time + 2500 + Math.random() * 3500;
      }
      const speed = 18;
      const dx = v.tx - v.x;
      const dy = v.ty - v.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        v.x += (dx / dist) * Math.min(dist, speed * dt);
        v.y += (dy / dist) * Math.min(dist, speed * dt);
      }
      return v;
    }

    const draw = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      const world = worldRef.current;

      ctx.fillStyle = '#16301a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Forest fills every cell that hasn't been cleared, fields, or reserved - shrinks as the village grows.
      let minCol = -8, maxCol = 8, minRow = -8, maxRow = 8;
      for (const key of world.clearedCells) {
        const [c, r] = key.split(',').map(Number);
        minCol = Math.min(minCol, c - 5);
        maxCol = Math.max(maxCol, c + 5);
        minRow = Math.min(minRow, r - 5);
        maxRow = Math.max(maxRow, r + 5);
      }

      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const key = `${col},${row}`;
          if (world.clearedCells.has(key)) continue;
          if (RESERVED_CELLS.has(key)) continue;
          const treeKey = TREE_KEYS[treeIndexFor(col, row)];
          const jitterX = (hashId(`${col},${row}x`, 20) - 10) * 1.2;
          const jitterY = (hashId(`${col},${row}y`, 20) - 10) * 0.6;
          const { x, y } = isoToScreen(col, row);
          const img = images[treeKey];
          if (img.complete && img.naturalWidth > 0) {
            const displayW = 100;
            const ratio = img.naturalHeight / img.naturalWidth;
            ctx.drawImage(img, x - displayW / 2 + jitterX, y + TILE_H / 2 - displayW * ratio + jitterY, displayW, displayW * ratio);
          }
        }
      }

      // Ground beneath cleared plots, fields, and reserved areas.
      for (const key of world.clearedCells) {
        const [c, r] = key.split(',').map(Number);
        drawGroundTile('grass', c, r);
      }
      for (const cell of FIELD_CELLS) drawGroundTile('dirt', cell.col, cell.row);
      drawGroundTile('grass', COURT_CELL.col, COURT_CELL.row);
      drawGroundTile('grass', FORGE_CELL.col, FORGE_CELL.row);
      for (const cell of STARTER_HUT_CELLS) drawGroundTile('grass', cell.col, cell.row);

      type Drawable = { depth: number; draw: () => void };
      const drawables: Drawable[] = [];

      // Fields: crop sprite by stage.
      world.fields.forEach((f, i) => {
        const cell = FIELD_CELLS[i] ?? FIELD_CELLS[FIELD_CELLS.length - 1];
        const depth = cell.col + cell.row;
        if (f.cropType && f.stage !== 'empty') {
          const key: AssetKey = f.stage === 'seedbed' || f.stage === 'sprout' ? 'sprout' : f.stage === 'growing' ? 'growing' : 'ripe';
          drawables.push({ depth, draw: () => drawSprite(key, cell.col, cell.row, 70) });
        }
      });

      // Starter (ancestral) huts - always visible, represent the original 50 villagers' homes.
      for (const cell of STARTER_HUT_CELLS) {
        drawables.push({ depth: cell.col + cell.row - 100, draw: () => drawSprite('hut', cell.col, cell.row, 120) });
      }

      // Real buildings, placed exactly where the player built them.
      const houseBuildings: Building[] = [];
      for (const b of world.buildings) {
        const spriteKey = BUILDING_SPRITE[b.type];
        if (b.type === 'house') houseBuildings.push(b);
        if (!spriteKey) continue;
        const displayW = b.type === 'house' ? (b.level >= 2 ? 150 : 120) : 140;
        drawables.push({ depth: b.col + b.row, draw: () => drawSprite(spriteKey, b.col, b.row, displayW) });
      }

      // The king's home starts as a hut too, same as everyone else's - no grand hall yet.
      drawables.push({
        depth: COURT_CELL.col + COURT_CELL.row,
        draw: () => drawSprite('hut', COURT_CELL.col, COURT_CELL.row, 140),
      });

      if (world.nation.hasDam) {
        drawables.push({ depth: -1, draw: () => drawSprite('fence', FIELD_CELLS[0].col, FIELD_CELLS[0].row - 1, 70) });
      }

      // Home slots: starter huts plus any player-built houses, so villagers spread across all of them.
      const homeSlots = [...STARTER_HUT_CELLS, ...houseBuildings.map((b) => ({ col: b.col, row: b.row }))].map((c) =>
        isoToScreen(c.col, c.row)
      );

      function anchorForNpc(npc: WorldState['npcs'][string]): { pos: { x: number; y: number }; radius: number } {
        if (npc.isKing || npc.job === 'minister' || npc.job === 'soldier') {
          return { pos: isoToScreen(COURT_CELL.col, COURT_CELL.row), radius: 90 };
        }
        if (npc.job === 'blacksmith') {
          return { pos: isoToScreen(FORGE_CELL.col, FORGE_CELL.row), radius: 40 };
        }
        if (npc.job === 'woodcutter') {
          return { pos: isoToScreen(FOREST_EDGE_CELL.col, FOREST_EDGE_CELL.row), radius: 90 };
        }
        if (npc.job === 'teacher' || npc.job === 'doctor' || npc.job === 'builder') {
          const building = world.buildings.find((b) => b.staffIds.includes(npc.id));
          if (building) {
            return { pos: isoToScreen(building.col, building.row), radius: 40 };
          }
        }
        const slot = homeSlots.length > 0 ? homeSlots[hashId(npc.id, homeSlots.length)] : isoToScreen(STARTER_HUT_CELLS[0].col, STARTER_HUT_CELLS[0].row);
        return { pos: slot, radius: 40 };
      }

      // Livestock near the pasture (if one exists).
      const pastureBuilding = world.buildings.find((b) => b.type === 'pasture');
      const pastureAnchor = pastureBuilding
        ? isoToScreen(pastureBuilding.col, pastureBuilding.row)
        : isoToScreen(COURT_CELL.col, COURT_CELL.row);
      const animals = Object.values(world.animals).filter((a) => a.alive);
      const animalGlyph = { cow: '🐄', sheep: '🐑' } as const;
      const seenAnimals = new Set<string>();
      for (const a of animals) {
        seenAnimals.add(a.id);
        const v = stepVisual(animalVisualsRef.current, a.id, pastureAnchor, 60, time, dt);
        drawables.push({
          depth: 1000 + v.y,
          draw: () => {
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(animalGlyph[a.species], v.x, v.y);
          },
        });
      }
      for (const id of Array.from(animalVisualsRef.current.keys())) {
        if (!seenAnimals.has(id)) animalVisualsRef.current.delete(id);
      }

      // Villagers, each with their own anchor so they spread across the village instead of stacking.
      const living = Object.values(world.npcs).filter((n) => n.alive);
      const seenNpcs = new Set<string>();
      for (const npc of living) {
        seenNpcs.add(npc.id);
        const { pos, radius } = anchorForNpc(npc);
        const v = stepVisual(npcVisualsRef.current, npc.id, pos, radius, time, dt);
        const face = faceForEmotions(npc.emotions.happiness, npc.emotions.anger, npc.emotions.fear);
        drawables.push({
          depth: 1000 + v.y,
          draw: () => {
            ctx.font = `${npc.isKing ? 24 : 15}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(face, v.x, v.y);
            if (npc.isKing) {
              ctx.font = '14px sans-serif';
              ctx.fillText('👑', v.x, v.y - 14);
            }
          },
        });
      }
      for (const id of Array.from(npcVisualsRef.current.keys())) {
        if (!seenNpcs.has(id)) npcVisualsRef.current.delete(id);
      }

      drawables.sort((a, b) => a.depth - b.depth);
      for (const d of drawables) d.draw();

      // Weather overlay.
      if (world.weather === 'rain' || world.weather === 'flood') {
        ctx.strokeStyle = world.weather === 'flood' ? 'rgba(60,110,200,0.8)' : 'rgba(120,160,220,0.5)';
        ctx.lineWidth = 1;
        for (const drop of rainRef.current) {
          drop.y += drop.speed;
          if (drop.y > HEIGHT) {
            drop.y = -10;
            drop.x = Math.random() * WIDTH;
          }
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 2, drop.y + 8);
          ctx.stroke();
        }
        if (world.weather === 'flood') {
          ctx.fillStyle = 'rgba(40,80,160,0.18)';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
        }
      } else if (world.weather === 'drought') {
        ctx.fillStyle = 'rgba(160,120,40,0.14)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [worldRef]);

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="village-canvas" />;
}
