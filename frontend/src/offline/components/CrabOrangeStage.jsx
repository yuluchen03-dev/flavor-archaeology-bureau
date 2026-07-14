// 蟹酿橙 3D 证据舞台：Canvas 承载 Three.js 程序化模型，叠加固定位置热点按钮与控件。
// 三个证据热点对应原文短摘（运行时数据来自 crabOrangeEvidence.hotspots，不在组件内重复维护）：
//   橙壳 → 以橙为器
//   蟹馅 → 以蟹膏肉实其内
//   蒸制结构 → 覆橙顶，入甑蒸熟
// WebGL 初始化失败或上下文丢失时切换到 CrabOrangeFallback 分层 2.5D 视图。

import { useEffect, useRef, useState } from 'react';
import { createCrabOrangeScene } from '../lib/createCrabOrangeScene.js';
import { crabOrangeEvidence } from '../data/offlineMuseumData.js';
import CrabOrangeFallback from './CrabOrangeFallback.jsx';

export default function CrabOrangeStage({ progress = 1, onHotspotSelect }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);

  // 线框模式为手动探查：开启时强制线框(0)，关闭时回归复原旅程证据进度驱动的材质过渡。
  const effectiveProgress = wireframeMode ? 0 : progress;

  // 创建/销毁场景：构造抛出或上下文丢失则切换降级视图。
  useEffect(() => {
    if (failed) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let scene;
    try {
      scene = createCrabOrangeScene(canvas, {
        onContextLoss: () => setFailed(true),
      });
    } catch {
      queueMicrotask(() => setFailed(true));
      return undefined;
    }
    sceneRef.current = scene;
    scene.resize(canvas.clientWidth || 320, canvas.clientHeight || 320);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [failed]);

  // 复原旅程证据进度驱动 setProgress：线框到材质过渡。线框探查开启时覆盖为 0。
  useEffect(() => {
    sceneRef.current?.setProgress(effectiveProgress);
  }, [effectiveProgress]);

  // 响应式：监听容器尺寸变化同步相机与渲染器。
  useEffect(() => {
    if (failed) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ro = new ResizeObserver((entries) => {
      const scene = sceneRef.current;
      if (!scene) return;
      for (const entry of entries) {
        const cr = entry.contentRect;
        scene.resize(cr.width, cr.height);
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [failed]);

  if (failed) {
    return <CrabOrangeFallback onHotspotSelect={onHotspotSelect} />;
  }

  const handleReset = () => sceneRef.current?.resetView();
  const handleExplode = () => {
    const next = !exploded;
    setExploded(next);
    sceneRef.current?.setExploded(next);
  };
  const handleWireframe = () => setWireframeMode((prev) => !prev);
  const handleHotspot = (hotspot) => {
    sceneRef.current?.focusHotspot(hotspot.id);
    if (onHotspotSelect) onHotspotSelect(hotspot);
  };

  return (
    <div className="crab-orange-stage">
      <div className="crab-orange-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="crab-orange-canvas"
          aria-label="蟹酿橙 3D 复原模型，可拖拽旋转与滚轮缩放"
          role="img"
        />
        <div className="crab-orange-hotspots" role="group" aria-label="证据热点">
          {crabOrangeEvidence.hotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              type="button"
              className={`crab-orange-hotspot crab-orange-hotspot-${hotspot.id}`}
              onClick={() => handleHotspot(hotspot)}
              title={`${hotspot.label} · ${hotspot.quote}`}
            >
              <span className="crab-orange-hotspot-label">{hotspot.label}</span>
              <span className="crab-orange-hotspot-quote">{hotspot.quote}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="crab-orange-controls" role="toolbar" aria-label="3D 舞台控件">
        <button type="button" className="crab-orange-control" onClick={handleReset} title="恢复初始视角">
          恢复视角
        </button>
        <button
          type="button"
          className={`crab-orange-control${exploded ? ' is-active' : ''}`}
          onClick={handleExplode}
          title="拆解结构分层"
          aria-pressed={exploded}
        >
          拆解结构
        </button>
        <button
          type="button"
          className={`crab-orange-control${wireframeMode ? ' is-active' : ''}`}
          onClick={handleWireframe}
          title="切换线框/材质显示"
          aria-pressed={wireframeMode}
        >
          {wireframeMode ? '线框' : '材质'}
        </button>
      </div>
    </div>
  );
}
