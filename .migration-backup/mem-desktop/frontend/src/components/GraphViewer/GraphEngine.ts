import {
  CameraState,
  GraphNode,
  GraphEdge,
  GraphData,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  ZOOM_SENSITIVITY,
  PAN_INERTIA,
  NODE_BASE_RADIUS,
  NODE_HUB_RADIUS,
  NODE_DEGREE_THRESHOLDS,
} from './GraphTypes';

export class GraphCamera {
  x: number = 0;
  y: number = 0;
  zoom: number = DEFAULT_ZOOM;
  
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = DEFAULT_ZOOM;
  private isAnimating: boolean = false;
  
  zoomAt(cursorX: number, cursorY: number, delta: number): void {
    const worldX = (cursorX - window.innerWidth / 2 - this.x) / this.zoom;
    const worldY = (cursorY - window.innerHeight / 2 - this.y) / this.zoom;
    
    const zoomFactor = 1 - delta * ZOOM_SENSITIVITY;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * zoomFactor));
    const zoomRatio = newZoom / this.zoom;
    
    this.x = cursorX - window.innerWidth / 2 - worldX * newZoom;
    this.y = cursorY - window.innerHeight / 2 - worldY * newZoom;
    this.zoom = newZoom;
  }
  
  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }
  
  focus(node: GraphNode, canvasWidth: number, canvasHeight: number): void {
    this.targetX = -(node.x * this.zoom) + canvasWidth / 2;
    this.targetY = -(node.y * this.zoom) + canvasHeight / 2;
    this.targetZoom = 1.5;
    this.isAnimating = true;
  }
  
  focusInstant(node: GraphNode, canvasWidth: number, canvasHeight: number): void {
    this.x = -(node.x * this.zoom) + canvasWidth / 2;
    this.y = -(node.y * this.zoom) + canvasHeight / 2;
    this.isAnimating = false;
  }
  
  update(): void {
    if (!this.isAnimating) return;
    
    const lerp = 0.08;
    this.x += (this.targetX - this.x) * lerp;
    this.y += (this.targetY - this.y) * lerp;
    this.zoom += (this.targetZoom - this.zoom) * lerp;
    
    if (
      Math.abs(this.x - this.targetX) < 0.5 &&
      Math.abs(this.y - this.targetY) < 0.5 &&
      Math.abs(this.zoom - this.targetZoom) < 0.005
    ) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.zoom = this.targetZoom;
      this.isAnimating = false;
    }
  }
  
  getState(): CameraState {
    return { x: this.x, y: this.y, zoom: this.zoom };
  }
  
  isFocusAnimating(): boolean {
    return this.isAnimating;
  }
}

export class GraphRenderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private themeColors: any;
  
  constructor(
    private canvas: HTMLCanvasElement,
    private width: number,
    private height: number
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.updateSize(width, height);
    this.updateTheme();
  }
  
  updateSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }
  
  updateTheme(): void {
    const cs = getComputedStyle(document.documentElement);
    this.themeColors = {
      surface1: cs.getPropertyValue('--surface-1').trim() || '#1b1b1f',
      surface2: cs.getPropertyValue('--surface-2').trim() || '#25252b',
      textPrimary: cs.getPropertyValue('--text-primary').trim() || '#e2e8f0',
      textMuted: cs.getPropertyValue('--text-muted').trim() || '#94a3b8',
      border: cs.getPropertyValue('--border').trim() || '#334155',
      accent: cs.getPropertyValue('--accent').trim() || '#6366f1',
      bg900: cs.getPropertyValue('--bg-900').trim() || '#0d0f14',
      bg800: cs.getPropertyValue('--bg-800').trim() || '#1b1b1f',
    };
  }
  
  clear(): void {
    this.ctx.fillStyle = this.themeColors.surface1;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  worldToScreen(x: number, y: number, camera: CameraState): [number, number] {
    return [
      x * camera.zoom + camera.x + this.width / 2,
      y * camera.zoom + camera.y + this.height / 2,
    ];
  }
  
  screenToWorld(sx: number, sy: number, camera: CameraState): [number, number] {
    return [
      (sx - camera.x - this.width / 2) / camera.zoom,
      (sy - camera.y - this.height / 2) / camera.zoom,
    ];
  }
  
  isNodeVisible(node: GraphNode, camera: CameraState, padding: number = 100): boolean {
    const [sx, sy] = this.worldToScreen(node.x, node.y, camera);
    return (
      sx > -padding &&
      sx < this.width + padding &&
      sy > -padding &&
      sy < this.height + padding
    );
  }
  
  getNodeRadius(node: GraphNode): number {
    if (node.is_hub) return NODE_HUB_RADIUS;
    for (const threshold of NODE_DEGREE_THRESHOLDS) {
      if (node.degree >= threshold.min) return threshold.radius;
    }
    return NODE_BASE_RADIUS;
  }
}

export function calculateNodeHeat(node: GraphNode, metadata?: any): number {
  let heat = 0;
  heat += (node.degree || 0) * 10;
  if (node.is_hub) heat += 50;
  if (metadata?.mentions) heat += metadata.mentions * 5;
  if (metadata?.chatFrequency) heat += metadata.chatFrequency * 3;
  if (metadata?.synthesisUsage) heat += metadata.synthesisUsage * 7;
  return Math.min(heat, 100);
}

export function findShortestPath(
  startId: string,
  endId: string,
  edges: GraphEdge[]
): string[] {
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
    if (!adj.has(e.fromId)) adj.set(e.fromId, []);
    if (!adj.has(e.toId)) adj.set(e.toId, []);
    adj.get(e.fromId)!.push(e.toId);
    adj.get(e.toId)!.push(e.fromId);
  });
  
  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const parent = new Map<string, string>();
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endId) {
      const path: string[] = [];
      let node: string | undefined = endId;
      while (node) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }
    
    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  
  return [];
}
