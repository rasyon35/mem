import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GraphNode, GraphEdge, GraphLayoutMode, MIN_ZOOM, MAX_ZOOM } from './GraphTypes';
import { GraphCamera, GraphRenderer, findShortestPath } from './GraphEngine';
import { buildNeighborMap } from './GraphSearch';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layoutMode: GraphLayoutMode;
  width: number;
  height: number;
  camera: GraphCamera;
  selectedNodes: string[];
  hoveredNode: string | null;
  focusedNode: string | null;
  searchResults: { nodeId: string; score: number; matchType: any }[];
  pathNodes: string[];
  pathEdges: string[];
  heatMapMode: boolean;
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (nodeId: string | null) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (cursorX: number, cursorY: number, delta: number) => void;
}

export default function GraphCanvas({
  nodes,
  edges,
  layoutMode,
  width,
  height,
  camera,
  selectedNodes,
  hoveredNode,
  focusedNode,
  searchResults,
  pathNodes,
  pathEdges,
  heatMapMode,
  onNodeClick,
  onNodeHover,
  onPan,
  onZoom,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rendererRef.current = new GraphRenderer(canvas, width, height);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [width, height]);

  // Update theme on change
  useEffect(() => {
    const observer = new MutationObserver(() => {
      rendererRef.current?.updateTheme();
      const cs = getComputedStyle(document.documentElement);
      const themeVal = cs.getPropertyValue('data-theme') || 'dark';
      setTheme(themeVal as 'light' | 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Build neighbor map for highlighting
  const neighborMap = buildNeighborMap(edges);

  // Search result set
  const searchSet = new Set(searchResults.map(r => r.nodeId));
  const pathNodeSet = new Set(pathNodes);
  const pathEdgeSet = new Set(pathEdges);
  const selectedSet = new Set(selectedNodes);

  // Render loop
  const render = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    camera.update();
    const camState = camera.getState();
    renderer.clear();

    const cs = getComputedStyle(document.documentElement);
    const ctx = renderer['ctx']; // Access the context

    // Draw edges first
    edges.forEach(edge => {
      const from = nodes.find(n => n.id === edge.fromId);
      const to = nodes.find(n => n.id === edge.toId);
      if (!from || !to) return;

      const [fx, fy] = renderer.worldToScreen(from.x, from.y, camState);
      const [tx, ty] = renderer.worldToScreen(to.x, to.y, camState);

      // Skip if both nodes off screen
      if (!renderer.isNodeVisible(from, camState) && !renderer.isNodeVisible(to, camState)) return;

      ctx.beginPath();
      if (pathEdgeSet.has(`${edge.fromId}-${edge.toId}`) || pathEdgeSet.has(`${edge.toId}-${edge.fromId}`)) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * camState.zoom;
        ctx.globalAlpha = 1;
      } else if (edge.isCrossBranch) {
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(128,128,128,0.3)';
        ctx.lineWidth = 1 * camState.zoom;
        ctx.globalAlpha = 0.6;
      } else {
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = (from.isCategory ? 3 : 2) * camState.zoom;
        ctx.globalAlpha = 0.6;
      }

      if (layoutMode === 'radial' && !edge.isCrossBranch) {
        const mx = (fx + tx) / 2, my = (fy + ty) / 2;
        const dx = tx - fx, dy = ty - fy;
        const cpx = mx - dy * 0.08, cpy = my + dx * 0.08;
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      } else {
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
      }

      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    nodes.forEach(node => {
      if (!renderer.isNodeVisible(node, camState)) return;

      const [nx, ny] = renderer.worldToScreen(node.x, node.y, camState);
      const r = renderer.getNodeRadius(node) * camState.zoom;
      const isSelected = selectedSet.has(node.id);
      const isHovered = hoveredNode === node.id;
      const isSearched = searchSet.has(node.id);
      const isPath = pathNodeSet.has(node.id);
      const isFocused = focusedNode === node.id;

      // Determine node state styling
      let fillColor = node.color;
      let strokeColor = node.color;
      let lineWidth = 1.5 * camState.zoom;
      let globalAlpha = 1;

      if (isFocused) {
        strokeColor = '#f59e0b';
        lineWidth = 3 * camState.zoom;
      } else if (isSelected) {
        fillColor = '#fff';
        strokeColor = node.color;
        lineWidth = 2.5 * camState.zoom;
      } else if (isHovered) {
        strokeColor = node.color;
        lineWidth = 2.5 * camState.zoom;
      }

      // Fade non-related nodes when focused
      if (focusedNode && focusedNode !== node.id && !neighborMap.get(focusedNode)?.has(node.id)) {
        globalAlpha = 0.2;
      }

      // Search highlight
      if (isSearched) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 10 * camState.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * camState.zoom;
        ctx.stroke();
      }

      // Heat map mode
      if (heatMapMode) {
        const heat = node.heat || 0;
        const intensity = heat / 100;
        fillColor = `rgba(239, 68, 68, ${intensity})`;
      }

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = globalAlpha;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Path highlight
      if (isPath) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 6 * camState.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * camState.zoom;
        ctx.stroke();
      }

      // Labels (LOD)
      if (camState.zoom > 0.6 || isSelected || isHovered || isFocused) {
        const label = node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name;
        ctx.font = `${(isSelected || node.is_hub) ? 'bold' : 'normal'} ${10 * camState.zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected ? '#fff' : cs.getPropertyValue('--text-primary').trim() || '#e2e8f0';
        ctx.globalAlpha = globalAlpha;
        ctx.fillText(label, nx, ny - r - 6 * camState.zoom);
      }

      ctx.globalAlpha = 1;
    });

    // Continue animation loop if camera is animating
    if (camera.isFocusAnimating()) {
      animFrameRef.current = requestAnimationFrame(render);
    }
  }, [camera, nodes, edges, hoveredNode, selectedNodes, focusedNode, searchResults, pathNodes, pathEdges, heatMapMode, layoutMode]);

  // Start/stop render loop
  useEffect(() => {
    if (camera.isFocusAnimating()) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      render(); // Single render when not animating
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render, camera]);

  // Mouse handlers
  const getMouseWorld = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, sx: 0, sy: 0 };
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const camState = camera.getState();
      const [wx, wy] = rendererRef.current?.screenToWorld(sx, sy, camState) || [0, 0];
      return { x: wx, y: wy, sx, sy };
    },
    [camera]
  );

  const findNodeAt = useCallback(
    (worldX: number, worldY: number): GraphNode | null => {
      let found: GraphNode | null = null;
      let minDist = 30;
      nodes.forEach(n => {
        if (n.type === 'root') return;
        const d = Math.hypot(n.x - worldX, n.y - worldY);
        if (d < minDist) {
          minDist = d;
          found = n;
        }
      });
      return found;
    },
    [nodes]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y, sx, sy } = getMouseWorld(e);
      const clicked = findNodeAt(x, y);
      if (!clicked) {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    },
    [getMouseWorld, findNodeAt]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) {
        onPan(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
        dragStart.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const { x, y } = getMouseWorld(e);
      const hovered = findNodeAt(x, y);
      onNodeHover(hovered?.id || null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovered ? 'pointer' : 'grab';
      }
    },
    [isDragging, getMouseWorld, findNodeAt, onPan, onNodeHover]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) return;
      const { x } = getMouseWorld(e);
      const { y } = getMouseWorld(e);
      const clicked = findNodeAt(x, y);
      if (clicked) onNodeClick(clicked);
    },
    [getMouseWorld, findNodeAt, onNodeClick]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      onZoom(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
    },
    [onZoom]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', cursor: 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
    />
  );
}
