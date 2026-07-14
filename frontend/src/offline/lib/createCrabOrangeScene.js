import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function roughenGeometry(geometry, amount = 0.025) {
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    const offset = (seed - Math.floor(seed) - 0.5) * amount;
    vertex.multiplyScalar(1 + offset);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function createCrabOrangeScene(canvas, options = {}) {
  const reducedMotion = prefersReducedMotion();
  const onContextLoss = typeof options.onContextLoss === 'function' ? options.onContextLoss : null;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b0e0d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 2.3, 6.4);

  const keyLight = new THREE.DirectionalLight(0xffd9a0, 1.65);
  keyLight.position.set(3.5, 5.5, 4);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x99b9b0, 0.75);
  fillLight.position.set(-4, 2, -2.5);
  scene.add(fillLight);
  scene.add(new THREE.AmbientLight(0x5f5548, 0.82));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 9.5;
  controls.target.set(0, 0.55, 0);
  controls.update();

  const root = new THREE.Group();
  scene.add(root);
  const meshes = [];
  const materials = [];

  function makeMaterial(color, optionsForMaterial = {}) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.68,
      metalness: 0,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      ...optionsForMaterial,
    });
    materials.push(material);
    return material;
  }

  function register(mesh, role, basePosition = mesh.position) {
    mesh.userData.role = role;
    mesh.userData.basePosition = basePosition.clone();
    meshes.push(mesh);
    root.add(mesh);
    return mesh;
  }

  const steamerMaterial = makeMaterial(0x6f593d, { roughness: 0.82 });
  const steamer = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.13, 12, 64), steamerMaterial);
  steamer.rotation.x = Math.PI / 2;
  steamer.position.set(0, -0.45, 0);
  register(steamer, 'steamer');

  const bowlMaterial = makeMaterial(0x384b47, { roughness: 0.78, opacity: 0.94 });
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.62, 48, 32, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.28),
    bowlMaterial,
  );
  bowl.position.set(0, -0.05, 0);
  register(bowl, 'bowl');

  const servingBaseMaterial = makeMaterial(0xd9d0be, { roughness: 0.55, opacity: 0.96 });
  const servingBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.82, 0.16, 64), servingBaseMaterial);
  servingBase.position.set(0, -0.76, 0);
  register(servingBase, 'serving-base');

  const shellMaterial = makeMaterial(0xd9822b, { roughness: 0.72, opacity: 0.9 });
  const shell = new THREE.Mesh(
    roughenGeometry(new THREE.SphereGeometry(1.13, 56, 36, 0, Math.PI * 2, 0, Math.PI * 0.78)),
    shellMaterial,
  );
  shell.position.set(0, 0.42, 0);
  register(shell, 'shell');

  const pithMaterial = makeMaterial(0xf0d9a5, { roughness: 0.9, opacity: 0.64, side: THREE.BackSide });
  const innerShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, 48, 30, 0, Math.PI * 2, 0, Math.PI * 0.77),
    pithMaterial,
  );
  innerShell.position.set(0, 0.42, 0);
  register(innerShell, 'shell-inner');

  const crabMeatMaterial = makeMaterial(0xf0ddad, { roughness: 0.86 });
  crabMeatMaterial.userData.historicalColor = new THREE.Color(0xf0ddad);
  crabMeatMaterial.userData.modernColor = new THREE.Color(0xffe0a1);
  const crabRoeMaterial = makeMaterial(0xc95732, { roughness: 0.72 });
  crabRoeMaterial.userData.historicalColor = new THREE.Color(0xc95732);
  crabRoeMaterial.userData.modernColor = new THREE.Color(0xe56337);

  for (let index = 0; index < 11; index += 1) {
    const angle = index * 2.399963;
    const radius = index < 3 ? 0.2 : 0.25 + (index % 4) * 0.12;
    const piece = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2 + (index % 3) * 0.035, 1),
      index % 4 === 0 ? crabRoeMaterial : crabMeatMaterial,
    );
    piece.position.set(
      Math.cos(angle) * radius,
      0.49 + (index % 3) * 0.12,
      Math.sin(angle) * radius * 0.72,
    );
    piece.rotation.set(angle * 0.2, angle * 0.4, angle * 0.1);
    register(piece, 'filling');
  }

  const lidMaterial = makeMaterial(0xc76c1c, { roughness: 0.7, opacity: 0.96 });
  const lid = new THREE.Mesh(
    roughenGeometry(new THREE.SphereGeometry(1.09, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.32), 0.022),
    lidMaterial,
  );
  lid.position.set(0, 1.08, 0);
  register(lid, 'lid');

  const stemMaterial = makeMaterial(0x526b45, { roughness: 0.88 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.42, 12), stemMaterial);
  stem.rotation.z = -0.16;
  stem.position.set(0.04, 1.72, 0);
  register(stem, 'lid');

  const explodeOffsets = {
    bowl: new THREE.Vector3(0, -1.15, 0),
    steamer: new THREE.Vector3(0, -1.7, 0),
    'serving-base': new THREE.Vector3(0, -1.5, 0),
    shell: new THREE.Vector3(0, 0.1, 0),
    'shell-inner': new THREE.Vector3(0, 0.1, 0),
    filling: new THREE.Vector3(-2.05, 0.35, 0),
    lid: new THREE.Vector3(0, 1.8, 0),
  };

  let targetProgress = 0;
  let currentProgress = 0;
  let modelMode = 'historical';
  let animationId = null;
  let disposed = false;

  function renderMaterialState(progress) {
    const wireframe = progress < 0.42;
    const opacity = 0.26 + 0.72 * progress;
    for (const material of materials) {
      material.wireframe = wireframe;
      material.opacity = Math.min(material.userData.baseOpacity || 1, opacity);
      material.needsUpdate = true;
    }
  }

  function applyExploded(value) {
    for (const mesh of meshes) {
      const offset = explodeOffsets[mesh.userData.role];
      mesh.position.copy(mesh.userData.basePosition);
      if (value && offset) mesh.position.add(offset);
    }
  }

  function applyModelMode() {
    const historical = modelMode === 'historical';
    steamer.visible = historical;
    bowl.visible = historical;
    servingBase.visible = !historical;
    for (const material of [crabMeatMaterial, crabRoeMaterial]) {
      const targetColor = historical
        ? material.userData.historicalColor
        : material.userData.modernColor;
      material.color.copy(targetColor);
      material.needsUpdate = true;
    }
  }

  function applyHotspotFocus(id) {
    const highlight = new THREE.Color(0x8f321f);
    const idle = new THREE.Color(0x000000);
    for (const mesh of meshes) {
      const role = mesh.userData.role;
      const active = (id === 'hotspot_shell' && role.startsWith('shell'))
        || (id === 'hotspot_filling' && role === 'filling')
        || (id === 'hotspot_steam' && ['lid', 'bowl', 'steamer'].includes(role));
      const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materialList) {
        if (!material.emissive) continue;
        material.emissive.copy(active ? highlight : idle);
        material.emissiveIntensity = active ? 0.42 : 0;
        material.needsUpdate = true;
      }
    }
  }

  function resetView() {
    controls.target.set(0, 0.55, 0);
    camera.position.set(0, 2.3, 6.4);
    root.rotation.set(0, 0, 0);
    controls.update();
  }

  function resize(width, height) {
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  resize(canvas.clientWidth || 320, canvas.clientHeight || 320);

  const onContextLost = (event) => {
    event.preventDefault();
    if (onContextLoss) onContextLoss();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  function animate() {
    if (disposed) return;
    animationId = requestAnimationFrame(animate);
    if (currentProgress !== targetProgress) {
      const delta = targetProgress - currentProgress;
      currentProgress = reducedMotion || Math.abs(delta) < 0.001
        ? targetProgress
        : currentProgress + delta * 0.12;
      renderMaterialState(currentProgress);
    }
    if (!reducedMotion) root.rotation.y += 0.0022;
    controls.update();
    renderer.render(scene, camera);
  }

  applyModelMode();
  renderMaterialState(currentProgress);
  animate();

  return {
    setProgress(value) {
      targetProgress = Math.max(0, Math.min(1, value));
      if (reducedMotion) {
        currentProgress = targetProgress;
        renderMaterialState(currentProgress);
      }
    },
    setExploded(value) {
      applyExploded(Boolean(value));
    },
    setMode(mode) {
      modelMode = mode === 'modern' ? 'modern' : 'historical';
      applyModelMode();
    },
    focusHotspot(id) {
      applyHotspotFocus(id);
    },
    resetView,
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      const geometries = new Set();
      const disposableMaterials = new Set();
      root.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of objectMaterials) {
          if (material) disposableMaterials.add(material);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of disposableMaterials) material.dispose();
      renderer.dispose();
    },
  };
}
