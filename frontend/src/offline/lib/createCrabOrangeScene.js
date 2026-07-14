// 蟹酿橙 3D 证据展台场景：全部资源程序化生成，不引入 CDN、在线模型或外部贴图。
// 使用 SphereGeometry 等基元拼出蒸盏、橙壳、蟹馅与顶盖四个分层，配合 OrbitControls 旋转缩放。
// WebGL 初始化失败或上下文丢失时由调用方切换到 CrabOrangeFallback 分层 2.5D 视图。

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createCrabOrangeScene(canvas, options = {}) {
  const reducedMotion = prefersReducedMotion();
  const onContextLoss = typeof options.onContextLoss === 'function' ? options.onContextLoss : null;

  // 透明渲染器：限制 device pixel ratio，避免高 DPI 设备过度绘制。
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.4, 6.2);

  // 暖色主光 + 冷色补光 + 环境光，营造展台聚光感。
  const keyLight = new THREE.DirectionalLight(0xffd9a0, 1.15);
  keyLight.position.set(3.5, 5.5, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x9ab4c4, 0.45);
  fillLight.position.set(-4, 2, -2.5);
  scene.add(fillLight);

  const ambient = new THREE.AmbientLight(0x4a4036, 0.5);
  scene.add(ambient);

  // OrbitControls：支持鼠标拖拽与触控旋转、缩放，禁用平移避免迷失视角。
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 9.5;
  controls.target.set(0, 0.55, 0);
  controls.update();

  const group = new THREE.Group();
  scene.add(group);

  const geometries = [];
  const materials = [];
  const meshes = [];

  function register(mesh, role, basePosition) {
    mesh.userData.role = role;
    mesh.userData.basePosition = basePosition.clone();
    geometries.push(mesh.geometry);
    materials.push(mesh.material);
    meshes.push(mesh);
    group.add(mesh);
    return mesh;
  }

  // 蒸盏：浅碗形，使用球体裁剪出下半部分。
  const bowlGeo = new THREE.SphereGeometry(1.65, 48, 32, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.28);
  const bowlMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a55,
    roughness: 0.65,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.set(0, 0, 0);
  register(bowl, 'bowl', bowl.position);

  // 橙壳：球体裁剪出带开口的容器形态。
  const shellGeo = new THREE.SphereGeometry(1.12, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.78);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xd4842a,
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.position.set(0, 0.4, 0);
  register(shell, 'shell', shell.position);

  // 蟹馅：内部较小球体，代表蟹膏蟹肉填馅。
  const fillingGeo = new THREE.SphereGeometry(0.86, 32, 24);
  const fillingMat = new THREE.MeshStandardMaterial({
    color: 0xe8d28a,
    roughness: 0.8,
    metalness: 0.0,
    transparent: true,
    opacity: 0.95,
  });
  const filling = new THREE.Mesh(fillingGeo, fillingMat);
  filling.position.set(0, 0.35, 0);
  register(filling, 'filling', filling.position);

  // 顶盖：小圆盖，对应"覆橙顶"结构。
  const lidGeo = new THREE.SphereGeometry(1.08, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.32);
  const lidMat = new THREE.MeshStandardMaterial({
    color: 0xc06a1a,
    roughness: 0.5,
    metalness: 0.05,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.set(0, 1.05, 0);
  register(lid, 'lid', lid.position);

  // 拆解时各分层的偏移量。
  const explodeOffsets = {
    bowl: new THREE.Vector3(0, -1.5, 0),
    shell: new THREE.Vector3(0, 0.2, 0),
    filling: new THREE.Vector3(-2.4, 0.4, 0),
    lid: new THREE.Vector3(0, 2.1, 0),
  };

  let targetProgress = 0;
  let currentProgress = 0;
  let exploded = false;
  let focusedHotspot = null;
  let animationId = null;
  let disposed = false;

  function renderMaterialState(p) {
    const wireframe = p < 0.5;
    const opacity = 0.22 + 0.72 * p;
    const roughness = 0.82 - 0.32 * p;
    for (const mat of materials) {
      mat.wireframe = wireframe;
      mat.opacity = opacity;
      mat.roughness = roughness;
      mat.needsUpdate = true;
    }
  }

  function applyExploded(value) {
    exploded = Boolean(value);
    for (const mesh of meshes) {
      const base = mesh.userData.basePosition;
      const offset = explodeOffsets[mesh.userData.role];
      if (exploded && offset) {
        mesh.position.copy(base).add(offset);
      } else {
        mesh.position.copy(base);
      }
    }
  }

  function applyHotspotFocus(id) {
    focusedHotspot = id || null;
    const highlight = new THREE.Color(0x6a3a1a);
    const idle = new THREE.Color(0x000000);
    for (const mesh of meshes) {
      const role = mesh.userData.role;
      let active = false;
      if (focusedHotspot === 'hotspot_shell' && role === 'shell') active = true;
      else if (focusedHotspot === 'hotspot_filling' && role === 'filling') active = true;
      else if (focusedHotspot === 'hotspot_steam' && (role === 'lid' || role === 'bowl')) active = true;
      const mat = mesh.material;
      if (active) {
        mat.emissive = highlight;
        mat.emissiveIntensity = 0.45;
      } else {
        mat.emissive = idle;
        mat.emissiveIntensity = 0;
      }
      mat.needsUpdate = true;
    }
  }

  function resetView() {
    controls.target.set(0, 0.55, 0);
    camera.position.set(0, 2.4, 6.2);
    controls.update();
  }

  function resize(width, height) {
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function syncSize() {
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 320;
    resize(w, h);
  }
  syncSize();

  // WebGL 上下文丢失：阻止默认行为并通知调用方切换降级视图。
  const onContextLost = (event) => {
    event.preventDefault();
    if (onContextLoss) onContextLoss();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  function animate() {
    if (disposed) return;
    animationId = requestAnimationFrame(animate);
    if (!reducedMotion) {
      if (currentProgress !== targetProgress) {
        const delta = targetProgress - currentProgress;
        currentProgress += delta * 0.12;
        if (Math.abs(delta) < 0.001) currentProgress = targetProgress;
        renderMaterialState(currentProgress);
      }
      group.rotation.y += 0.0025;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  renderMaterialState(currentProgress);
  animate();

  return {
    setProgress(value) {
      const clamped = Math.max(0, Math.min(1, value));
      if (reducedMotion) {
        currentProgress = clamped;
        targetProgress = clamped;
        renderMaterialState(currentProgress);
      } else {
        targetProgress = clamped;
      }
    },
    setExploded(value) {
      applyExploded(value);
    },
    focusHotspot(id) {
      applyHotspotFocus(id);
    },
    resetView,
    resize,
    dispose() {
      disposed = true;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
      renderer.dispose();
    },
  };
}
