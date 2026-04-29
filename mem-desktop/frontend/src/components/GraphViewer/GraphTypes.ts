export type GraphLayoutMode = 'radial' | 'force' | 'cluster' | 'hierarchy';

export type NodeState = 'default' | 'hovered' | 'selected' | 'related' | 'searched' | 'ghost' | 'locked' | 'editing' | 'hub';

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  isCategory: boolean;
  isExpanded: boolean;
  degree: number;
  is_hub?: boolean;
  summary?: string;
  childIds: string[];
  state: NodeState;
  heat: number;
  category?: string;
}

export type EdgeType = 'wikilink' | 'topic_member' | 'subtopic_member' | 'subtopic_neighbor' | 'tag_connection' | 'semantic_relation' | 'category_child';

export interface GraphEdge {
  fromId: string;
  toId: string;
  color: string;
  isCrossBranch: boolean;
  isHighlighted?: boolean;
  edgeType?: EdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  categories: string[];
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface SearchResult {
  nodeId: string;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'category' | 'connected' | 'mention' | 'backlink';
}

export interface GraphState {
  camera: CameraState;
  layoutMode: GraphLayoutMode;
  focusedNode: string | null;
  selectedNodes: string[];
  minimapVisible: boolean;
  graphDepth: number;
  showGhosts: boolean;
  heatMapMode: boolean;
  semanticMode: boolean;
  searchTerm: string;
  searchResults: SearchResult[];
  pathNodes: string[];
  pathEdges: string[];
  hoveredNode: string | null;
  expandedBranches: Set<string>;
}

export interface LayoutOptions {
  width: number;
  height: number;
  centerX?: number;
  centerY?: number;
  padding?: number;
}

export interface ForceLayoutOptions {
  repulsion?: number;
  springLength?: number;
  springStrength?: number;
  gravity?: number;
  damping?: number;
  maxIterations?: number;
}

export interface ThemeColors {
  surface1: string;
  surface2: string;
  surface3: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  accent: string;
  accentGlow: string;
  bg600: string;
  bg800: string;
  bg900: string;
}

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 3.5;
export const DEFAULT_ZOOM = 1;
export const ZOOM_SENSITIVITY = 0.001;
export const PAN_INERTIA = 0.85;
export const NODE_BASE_RADIUS = 6;
export const NODE_HUB_RADIUS = 14;
export const NODE_DEGREE_THRESHOLDS = [
  { min: 10, radius: 10 },
  { min: 5, radius: 8 },
  { min: 0, radius: 6 },
];
