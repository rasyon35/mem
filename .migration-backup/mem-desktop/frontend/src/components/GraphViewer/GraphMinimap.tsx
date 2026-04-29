import React, { useRef, useEffect, useCallback } from 'react';

interface GraphMinimapProps {
  nodes: any[];
  edges: any[];
  camera: { x: number; y: number; zoom: number };
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (x: number, y: number) => void;
  visible: boolean;
}

const MINIMAP_SIZE = 180;
const MINIMAP_PADDING = 10;

export default function GraphMinimap({
  nodes,
  edges,
  camera,
  canvasWidth,
  canvasHeight,
  onNavigate,
  visible,
}: GraphMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  const getBounds = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });
    const padding = 50;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [nodes]);

  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_SIZE * dpr;
    canvas.height = MINIMAP_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = 'var(--surface-2, #25252b)';
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const bounds = getBounds();
    const graphWidth = bounds.maxX - bounds.minX;
    const graphHeight = bounds.maxY - bounds.minY;
    const scale = Math.min(
      (MINIMAP_SIZE - MINIMAP_PADDING * 2) / graphWidth,
      (MINIMAP_SIZE - MINIMAP_PADDING * 2) / graphHeight
    );

    const offsetX = (MINIMAP_SIZE - graphWidth * scale) / 2 - bounds.minX * scale;
    const offsetY = (MINIMAP_SIZE - graphHeight * scale) / 2 - bounds.minY * scale;

    // Draw edges
    edges.forEach(e => {
      const from = nodes.find(n => n.id === e.fromId);
      const to = nodes.find(n => n.id === e.toId);
      if (!from || !to) return;
      ctx.beginPath();
      ctx.moveTo(from.x * scale + offsetX, from.y * scale + offsetY);
      ctx.lineTo(to.x * scale + offsetX, to.y * scale + offsetY);
      ctx.strokeStyle = 'rgba(128,128,128,0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x * scale + offsetX, n.y * scale + offsetY, Math.max(1, n.radius * scale * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = n.isCategory ? n.color + '80' : n.color;
      ctx.fill();
    });

    // Draw viewport rectangle
    const viewX = (-camera.x / camera.zoom) * scale + offsetX;
    const viewY = (-camera.y / camera.zoom) * scale + offsetY;
    const viewW = (canvasWidth / camera.zoom) * scale;
    const viewH = (canvasHeight / camera.zoom) * scale;

    ctx.strokeStyle = 'var(--accent, #6366f1)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(viewX, viewY, viewW, viewH);

    ctx.fillStyle = 'var(--accent, #6366f1) + 20';
    ctx.fillRect(viewX, viewY, viewW, viewH);
  }, [nodes, edges, camera, canvasWidth, canvasHeight, visible, getBounds]);

  useEffect(() => {
    renderMinimap();
  }, [renderMinimap]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const bounds = getBounds();
      const scale = Math.min(
        (MINIMAP_SIZE - MINIMAP_PADDING * 2) / (bounds.maxX - bounds.minX),
        (MINIMAP_SIZE - MINIMAP_PADDING * 2) / (bounds.maxY - bounds.minY)
      );
      const worldX = (mx - MINIMAP_SIZE / 2 + (bounds.minX + (bounds.maxX - bounds.minX) / 2) * scale) / scale;
      const worldY = (my - MINIMAP_SIZE / 2 + (bounds.minY + (bounds.maxY - bounds.minY) / 2) * scale) / scale;
      onNavigate(-worldX * camera.zoom + canvasWidth / 2, -worldY * camera.zoom + canvasHeight / 2);
    },
    [camera.zoom, canvasWidth, canvasHeight, getBounds, onNavigate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      handleMouseDown(e);
    },
    [handleMouseDown]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!visible) return null;

  return (
    <div
      className="absolute bottom-4 right-4 z-20 rounded-md border border-border-subtle shadow-lg overflow-hidden"
      style={{ background: 'var(--surface-2, #25252b)' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE, display: 'block', cursor: 'pointer' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
