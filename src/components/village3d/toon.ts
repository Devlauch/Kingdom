import * as THREE from 'three';

let gradientMap: THREE.DataTexture | null = null;

// A small 4-step gradient texture is what gives MeshToonMaterial its banded, cel-shaded look.
export function getToonGradientMap(): THREE.DataTexture {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([80, 130, 190, 255]);
  const texture = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  gradientMap = texture;
  return texture;
}

const convertedCache = new WeakSet<THREE.Object3D>();

// Kenney's kits ship flat MeshStandardMaterial with a shared color-palette texture.
// Swapping in MeshToonMaterial (keeping the same map/color) gives the warm cel-shaded look
// the brief asked for, without needing different source art.
export function toonify(root: THREE.Object3D) {
  if (convertedCache.has(root)) return root;
  convertedCache.add(root);

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const applyToon = (mat: THREE.Material) => {
      if (mat instanceof THREE.MeshToonMaterial) return mat;
      const standard = mat as THREE.MeshStandardMaterial;
      return new THREE.MeshToonMaterial({
        map: standard.map ?? null,
        color: standard.color ?? new THREE.Color('white'),
        gradientMap: getToonGradientMap(),
        transparent: standard.transparent,
        opacity: standard.opacity,
        alphaTest: standard.alphaTest,
      });
    };

    child.material = Array.isArray(child.material) ? child.material.map(applyToon) : applyToon(child.material);
  });

  return root;
}
