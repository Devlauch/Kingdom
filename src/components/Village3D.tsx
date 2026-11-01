import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { WorldState, Season } from '../sim/types';
import Scene from './village3d/Scene';
import Villagers from './village3d/Villagers';

const SEASON_LIGHT: Record<Season, { sky: string; ground: string; fog: string; sun: string }> = {
  spring: { sky: '#bfe3ff', ground: '#6b9a4a', fog: '#cfe8c8', sun: '#fff3d6' },
  summer: { sky: '#aee0ff', ground: '#4a8a3a', fog: '#d8ecc8', sun: '#fff0c8' },
  autumn: { sky: '#ffd9a0', ground: '#8a6a3a', fog: '#f0d7ae', sun: '#ffdca0' },
  winter: { sky: '#dfe9ef', ground: '#8a9a9a', fog: '#e8eef0', sun: '#eef4ff' },
};

function SceneContents({ world }: { world: WorldState }) {
  const season = world.calendar.season;
  const palette = SEASON_LIGHT[season];
  const buildings = world.buildings;

  const fogColor = useMemo(() => new THREE.Color(palette.fog), [palette.fog]);

  return (
    <>
      <fog attach="fog" args={[fogColor, 18, 65]} />
      <hemisphereLight args={[palette.sky, palette.ground, 0.9]} />
      <directionalLight
        position={[12, 18, 8]}
        intensity={1.4}
        color={palette.sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <Scene world={world} buildings={buildings} />
      <Villagers world={world} buildings={buildings} />
    </>
  );
}

export default function Village3D({ worldRef }: { worldRef: React.RefObject<WorldState> }) {
  const world = worldRef.current;

  return (
    <div className="village-3d-wrapper">
      <Canvas shadows camera={{ position: [16, 15, 16], fov: 42 }}>
        <Suspense fallback={null}>
          <SceneContents world={world} />
        </Suspense>
        <OrbitControls
          target={[0, 0.5, 0]}
          enablePan={false}
          minDistance={10}
          maxDistance={34}
          maxPolarAngle={Math.PI / 2.3}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
}
