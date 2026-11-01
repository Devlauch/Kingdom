import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import type { WorldState, NPC, Building } from '../../sim/types';
import { COURT_CELL, FORGE_CELL, STARTER_HUT_CELLS, FOREST_EDGE_CELL } from '../../sim/layout';
import { toonify } from './toon';
import { toWorld } from './Scene';

const CHAR_PATHS = ['a', 'b', 'c', 'd', 'e'].map((l) => `/assets/models/characters/character-${l}.glb`);

function hashId(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

function anchorFor(npc: NPC, world: WorldState, homeSlots: [number, number, number][]): { pos: [number, number, number]; radius: number } {
  if (npc.isKing || npc.job === 'minister' || npc.job === 'soldier') {
    return { pos: toWorld(COURT_CELL.col, COURT_CELL.row), radius: 2.2 };
  }
  if (npc.job === 'blacksmith') return { pos: toWorld(FORGE_CELL.col, FORGE_CELL.row), radius: 1 };
  if (npc.job === 'woodcutter') return { pos: toWorld(FOREST_EDGE_CELL.col, FOREST_EDGE_CELL.row), radius: 2.5 };
  if (npc.job === 'teacher' || npc.job === 'doctor' || npc.job === 'builder') {
    const building = world.buildings.find((b) => b.staffIds.includes(npc.id));
    if (building) return { pos: toWorld(building.col, building.row), radius: 1 };
  }
  const slot = homeSlots.length > 0 ? homeSlots[hashId(npc.id, homeSlots.length)] : toWorld(STARTER_HUT_CELLS[0].col, STARTER_HUT_CELLS[0].row);
  return { pos: slot, radius: 1 };
}

function VillagerMesh({ npc, world, homeSlots }: { npc: NPC; world: WorldState; homeSlots: [number, number, number][] }) {
  const path = CHAR_PATHS[hashId(npc.id, CHAR_PATHS.length)];
  const { scene, animations } = useGLTF(path);
  const clonedScene = useMemo(() => toonify(cloneSkeleton(scene)), [scene]);
  const { actions } = useAnimations(animations, clonedScene);
  const groupRef = useRef<THREE.Group>(null);
  const state = useRef({
    x: 0,
    z: 0,
    tx: 0,
    tz: 0,
    nextRetarget: 0,
    initialized: false,
  });

  useEffect(() => {
    const names = Object.keys(actions);
    const name = names.find((n) => /walk/i.test(n)) ?? names[0];
    if (name) actions[name]?.reset().fadeIn(0.3).play();
    return () => {
      if (name) actions[name]?.fadeOut(0.3);
    };
  }, [actions]);

  useFrame((frameState, delta) => {
    const { pos, radius } = anchorFor(npc, world, homeSlots);
    const s = state.current;
    if (!s.initialized) {
      s.x = pos[0];
      s.z = pos[2];
      s.tx = pos[0];
      s.tz = pos[2];
      s.initialized = true;
    }
    const time = frameState.clock.elapsedTime;
    if (time > s.nextRetarget) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      s.tx = pos[0] + Math.cos(angle) * r;
      s.tz = pos[2] + Math.sin(angle) * r;
      s.nextRetarget = time + 3 + Math.random() * 4;
    }
    const dx = s.tx - s.x;
    const dz = s.tz - s.z;
    const dist = Math.hypot(dx, dz);
    const speed = 0.6;
    if (dist > 0.05) {
      s.x += (dx / dist) * Math.min(dist, speed * delta);
      s.z += (dz / dist) * Math.min(dist, speed * delta);
      if (groupRef.current) groupRef.current.rotation.y = Math.atan2(dx, dz);
    }
    if (groupRef.current) {
      groupRef.current.position.set(s.x, 0, s.z);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} scale={0.55} />
    </group>
  );
}

export default function Villagers({ world, buildings }: { world: WorldState; buildings: Building[] }) {
  const living = Object.values(world.npcs).filter((n) => n.alive);
  const homeSlots = useMemo<[number, number, number][]>(
    () => [...STARTER_HUT_CELLS, ...buildings.filter((b) => b.type === 'house').map((b) => ({ col: b.col, row: b.row }))].map((c) => toWorld(c.col, c.row)),
    [buildings]
  );

  return (
    <group>
      {living.map((npc) => (
        <VillagerMesh key={npc.id} npc={npc} world={world} homeSlots={homeSlots} />
      ))}
    </group>
  );
}

CHAR_PATHS.forEach((p) => useGLTF.preload(p));
