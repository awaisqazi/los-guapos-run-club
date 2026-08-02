import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Build a faceted mirror ball: an inner dark core wrapped in hundreds of
 * tiny mirrored tiles laid out on a fibonacci sphere.
 */
export function createDiscoBall({ radius = 1, facets = 700, tileScale = 1 } = {}) {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.96, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x111118, metalness: 0.9, roughness: 0.4 })
  );
  group.add(core);

  // Tile size derived from how much sphere surface each facet must cover.
  const tileSize = Math.sqrt((4 * Math.PI * radius * radius) / facets) * 0.72 * tileScale;
  const tileGeo = new THREE.PlaneGeometry(tileSize, tileSize);
  const tileMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 1.6,
    side: THREE.DoubleSide,
  });

  const tiles = new THREE.InstancedMesh(tileGeo, tileMat, facets);
  const dummy = new THREE.Object3D();
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < facets; i++) {
    const y = 1 - (i / (facets - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const pos = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);

    dummy.position.copy(pos).multiplyScalar(radius);
    dummy.lookAt(pos.clone().multiplyScalar(radius * 2));
    // tiny random tilt so tiles catch light unevenly, like a real ball
    dummy.rotateZ(Math.random() * Math.PI);
    dummy.rotateX((Math.random() - 0.5) * 0.12);
    dummy.updateMatrix();
    tiles.setMatrixAt(i, dummy.matrix);
  }
  tiles.instanceMatrix.needsUpdate = true;
  group.add(tiles);

  return group;
}

/**
 * Renderer + scene + PMREM environment so the mirrors have something to reflect.
 * Throws if WebGL is unavailable; callers must handle that. The PMREM generator
 * and room scene are disposed immediately; call dispose() on teardown/HMR.
 */
export function createDiscoScene(canvas, { alpha = true, fov = 40 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  // 0.04 stays inside PMREM's blur sample budget (0.05 clips).
  const envTex = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTex;
  room.traverse((o) => {
    o.geometry?.dispose?.();
    o.material?.dispose?.();
  });
  pmrem.dispose();

  return {
    renderer,
    scene,
    camera,
    dispose() {
      envTex.dispose();
      renderer.dispose();
    },
  };
}

/** Framerate-independent smoothing clock without the deprecated THREE.Clock. */
export function createTicker() {
  let last = performance.now();
  return {
    /** Seconds since last call, clamped. */
    delta() {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      return dt;
    },
    /** Seconds since creation. */
    start: last / 1000,
  };
}

export { THREE };
