import { GraphData, GraphNode, GraphEdge, GraphLayoutMode, LayoutOptions, ForceLayoutOptions } from './GraphTypes';

const DEFAULT_FORCE_OPTIONS: Required<ForceLayoutOptions> = {
  repulsion: 3000,
  springLength: 100,
  springStrength: 0.01,
  gravity: 0.1,
  damping: 0.9,
  maxIterations: 200,
};

export function applyLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: GraphLayoutMode,
  options: LayoutOptions,
  forceOptions?: ForceLayoutOptions
): GraphData {
  switch (mode) {
    case 'radial':
      return radialLayout(nodes, edges, options);
    case 'force':
      return forceLayout(nodes, edges, options, forceOptions);
    case 'cluster':
      return clusterLayout(nodes, edges, options);
    case 'hierarchy':
      return hierarchyLayout(nodes, edges, options);
    default:
      return { nodes, edges, nodeMap: buildNodeMap(nodes), categories: [] };
  }
}

function radialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions
): GraphData {
  const { width, height, centerX = 0, centerY = 0 } = options;
  const nodeMap = buildNodeMap(nodes);
  const categories = groupByCategory(nodes);
  const sortedCats = Array.from(categories.entries()).sort((a, b) => b[1].length - a[1].length);
  
  const CATEGORY_RADIUS = 200;
  const LEAF_RADIUS = 170;
  
  const rootNode = nodes.find(n => n.type === 'root');
  if (rootNode) {
    rootNode.x = centerX;
    rootNode.y = centerY;
  }
  
  sortedCats.forEach(([cat, catNodes], idx) => {
    const angle = (idx / sortedCats.length) * Math.PI * 2 - Math.PI / 2;
    const catColor = catNodes[0]?.color || '#666';
    const isExpanded = catNodes[0]?.isExpanded || false;
    
    const catNode = catNodes.find(n => n.isCategory);
    if (catNode) {
      catNode.x = centerX + Math.cos(angle) * CATEGORY_RADIUS;
      catNode.y = centerY + Math.sin(angle) * CATEGORY_RADIUS;
    }
    
    if (isExpanded && catNode) {
      const leaves = catNodes.filter(n => !n.isCategory);
      const arcSpread = Math.min(Math.PI * 0.8, leaves.length * 0.18);
      const startAngle = angle - arcSpread / 2;
      
      leaves.forEach((leaf, li) => {
        const leafAngle = leaves.length === 1 ? angle : startAngle + (li / (leaves.length - 1)) * arcSpread;
        leaf.x = catNode.x + Math.cos(leafAngle) * LEAF_RADIUS;
        leaf.y = catNode.y + Math.sin(leafAngle) * LEAF_RADIUS;
      });
    }
  });
  
  return { nodes, edges, nodeMap, categories: sortedCats.map(([c]) => c) };
}

function forceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions,
  forceOptions?: ForceLayoutOptions
): GraphData {
  const opts = { ...DEFAULT_FORCE_OPTIONS, ...forceOptions };
  const { width, height, centerX = 0, centerY = 0 } = options;
  
  const velocities = new Map<string, { vx: number; vy: number }>();
  nodes.forEach(n => {
    velocities.set(n.id, { vx: 0, vy: 0 });
    if (n.x === 0 && n.y === 0) {
      n.x = (Math.random() - 0.5) * 100;
      n.y = (Math.random() - 0.5) * 100;
    }
  });
  
  for (let iter = 0; iter < opts.maxIterations; iter++) {
    nodes.forEach(n => {
      const vel = velocities.get(n.id)!;
      
      // Repulsion
      nodes.forEach(other => {
        if (n.id === other.id) return;
        const dx = n.x - other.x;
        const dy = n.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = opts.repulsion / (dist * dist);
        vel.vx += (dx / dist) * force;
        vel.vy += (dy / dist) * force;
      });
      
      // Gravity to center
      vel.vx += (centerX - n.x) * opts.gravity;
      vel.vy += (centerY - n.y) * opts.gravity;
    });
    
    // Spring (edges)
    edges.forEach(e => {
      const from = nodes.find(n => n.id === e.fromId);
      const to = nodes.find(n => n.id === e.toId);
      if (!from || !to) return;
      
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = (dist - opts.springLength) * opts.springStrength;
      
      const fx = (dx / dist) * displacement;
      const fy = (dy / dist) * displacement;
      
      const fromVel = velocities.get(from.id)!;
      const toVel = velocities.get(to.id)!;
      
      fromVel.vx += fx;
      fromVel.vy += fy;
      toVel.vx -= fx;
      toVel.vy -= fy;
    });
    
    // Update positions
    nodes.forEach(n => {
      const vel = velocities.get(n.id)!;
      vel.vx *= opts.damping;
      vel.vy *= opts.damping;
      n.x += vel.vx;
      n.y += vel.vy;
    });
  }
  
  return { nodes, edges, nodeMap: buildNodeMap(nodes), categories: [] };
}

function clusterLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions
): GraphData {
  const categories = groupByCategory(nodes);
  const { width, height, centerX = 0, centerY = 0 } = options;
  
  const catEntries = Array.from(categories.entries());
  const cols = Math.ceil(Math.sqrt(catEntries.length));
  const spacing = 300;
  
  catEntries.forEach(([cat, catNodes], idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = centerX + (col - cols / 2) * spacing;
    const cy = centerY + (row - Math.floor(catEntries.length / cols) / 2) * spacing;
    
    catNodes.forEach((n, i) => {
      const angle = (i / catNodes.length) * Math.PI * 2;
      n.x = cx + Math.cos(angle) * 80;
      n.y = cy + Math.sin(angle) * 80;
    });
  });
  
  return { nodes, edges, nodeMap: buildNodeMap(nodes), categories: catEntries.map(([c]) => c) };
}

function hierarchyLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions
): GraphData {
  const { centerX = 0, centerY = 0 } = options;
  const nodeMap = buildNodeMap(nodes);
  
  const root = nodes.find(n => n.type === 'root');
  if (!root) return { nodes, edges, nodeMap, categories: [] };
  
  root.x = centerX;
  root.y = centerY;
  
  const levels = new Map<string, number>();
  const queue: [string, number][] = [[root.id, 0]];
  levels.set(root.id, 0);
  
  while (queue.length > 0) {
    const [currentId, level] = queue.shift()!;
    const current = nodeMap.get(currentId);
    if (!current) continue;
    
    const children = edges
      .filter(e => e.fromId === currentId || e.toId === currentId)
      .map(e => (e.fromId === currentId ? e.toId : e.fromId))
      .map(id => nodeMap.get(id))
      .filter(Boolean) as GraphNode[];
    
    const unvisited = children.filter(c => !levels.has(c.id));
    const angleStep = (Math.PI * 2) / Math.max(unvisited.length, 1);
    const radius = 150 * (level + 1);
    
    unvisited.forEach((child, i) => {
      levels.set(child.id, level + 1);
      const angle = angleStep * i;
      child.x = current.x + Math.cos(angle) * radius;
      child.y = current.y + Math.sin(angle) * radius;
      queue.push([child.id, level + 1]);
    });
  }
  
  return { nodes, edges, nodeMap, categories: [] };
}

function buildNodeMap(nodes: GraphNode[]): Map<string, GraphNode> {
  const map = new Map<string, GraphNode>();
  nodes.forEach(n => map.set(n.id, n));
  return map;
}

function groupByCategory(nodes: GraphNode[]): Map<string, GraphNode[]> {
  const groups = new Map<string, GraphNode[]>();
  nodes.forEach(n => {
    const cat = n.category || 'Miscellaneous';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(n);
  });
  return groups;
}
