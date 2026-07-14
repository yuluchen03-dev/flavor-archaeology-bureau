import { useEffect, useRef, useState } from 'react';
import { ChefHat, History, Layers3, RotateCcw } from 'lucide-react';
import { createCrabOrangeScene } from '../lib/createCrabOrangeScene.js';
import { crabOrangeEvidence } from '../data/offlineMuseumData.js';
import CrabOrangeFallback from './CrabOrangeFallback.jsx';

export default function CrabOrangeStage({
  progress = 1,
  selectedEvidenceId = null,
  modelMode = 'historical',
  exploded = false,
  onEvidenceSelect,
  onModelModeChange,
  onExplodedChange,
  onHotspotSelect,
  variant = 'workbench',
}) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [failed, setFailed] = useState(false);

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

  useEffect(() => {
    sceneRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    sceneRef.current?.setExploded(exploded);
  }, [exploded]);

  useEffect(() => {
    sceneRef.current?.setMode(modelMode);
  }, [modelMode]);

  useEffect(() => {
    sceneRef.current?.focusHotspot(selectedEvidenceId);
  }, [selectedEvidenceId]);

  useEffect(() => {
    if (failed) return undefined;
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        sceneRef.current?.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [failed]);

  const selectEvidence = (hotspot) => {
    sceneRef.current?.focusHotspot(hotspot.id);
    onEvidenceSelect?.(hotspot);
    onHotspotSelect?.(hotspot);
  };

  if (failed) {
    return (
      <CrabOrangeFallback
        selectedEvidenceId={selectedEvidenceId}
        modelMode={modelMode}
        exploded={exploded}
        onEvidenceSelect={selectEvidence}
        onModelModeChange={onModelModeChange}
        onExplodedChange={onExplodedChange}
      />
    );
  }

  return (
    <div className={`crab-orange-stage crab-orange-stage-${variant}`}>
      <div className="crab-orange-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="crab-orange-canvas"
          aria-label="蟹酿橙 3D 复原模型，可拖拽旋转与滚轮缩放"
          role="img"
        />
        <div className="crab-orange-hotspots" role="group" aria-label="证据热点">
          {crabOrangeEvidence.hotspots.map((hotspot, index) => (
            <button
              key={hotspot.id}
              type="button"
              className={`evidence-annotation evidence-annotation-${hotspot.id}`}
              onClick={() => selectEvidence(hotspot)}
              title={`${hotspot.label} · ${hotspot.quote}`}
              aria-label={`${hotspot.label}：${hotspot.quote}`}
              aria-pressed={selectedEvidenceId === hotspot.id}
            >
              <span className="evidence-annotation-index">{String(index + 1).padStart(2, '0')}</span>
              <span>{hotspot.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="crab-orange-controls" role="toolbar" aria-label="藏品模型控件">
        <button
          type="button"
          className="crab-orange-control"
          onClick={() => sceneRef.current?.resetView()}
          title="恢复初始视角"
          aria-label="恢复视角"
        >
          <RotateCcw aria-hidden="true" size={18} />
          <span>恢复视角</span>
        </button>
        <button
          type="button"
          className={`crab-orange-control${exploded ? ' is-active' : ''}`}
          onClick={() => onExplodedChange?.(!exploded)}
          title="拆解或合拢结构"
          aria-pressed={exploded}
        >
          <Layers3 aria-hidden="true" size={18} />
          <span>拆解结构</span>
        </button>
        <button
          type="button"
          className={`crab-orange-control${modelMode === 'historical' ? ' is-active' : ''}`}
          onClick={() => onModelModeChange?.('historical')}
          title="查看文献所述蒸制结构"
          aria-pressed={modelMode === 'historical'}
        >
          <History aria-hidden="true" size={18} />
          <span>历史结构</span>
        </button>
        <button
          type="button"
          className={`crab-orange-control${modelMode === 'modern' ? ' is-active' : ''}`}
          onClick={() => onModelModeChange?.('modern')}
          title="查看现代厨房转译成品"
          aria-pressed={modelMode === 'modern'}
        >
          <ChefHat aria-hidden="true" size={18} />
          <span>现代成品</span>
        </button>
      </div>
    </div>
  );
}
