'use client';

import { useWiki } from '@/context/WikiContext';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Spinner, ChatIcon } from '@/components/Icons';
import axios from 'axios';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  GraphLayoutMode,
  GraphEdge,
  EdgeType,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from './GraphViewer/GraphTypes';
import { GraphCamera, findShortestPath } from './GraphViewer/GraphEngine';
import { semanticSearch, buildNeighborMap } from './GraphViewer/GraphSearch';
import GraphControls from './GraphViewer/GraphControls';
import GraphMinimap from './GraphViewer/GraphMinimap';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const EDGE_TYPE_LABELS: Record<string, string> = {
  wikilink: 'Wiki Link',
  tag_connection: 'Shared Tag',
  semantic_relation: 'Semantic Relation',
  subtopic_neighbor: 'Subtopic Neighbor',
  topic_member: 'Topic Membership',
  subtopic_member: 'Subtopic Membership',
  category_child: 'Category Child',
};

const EDGE_TYPE_DESCRIPTIONS: Record<string, string> = {
  wikilink: 'An explicit [[wikilink]] from one page to another. These are direct references authored in markdown content.',
  tag_connection: 'Two pages share one or more common tags. They belong to overlapping conceptual clusters.',
  semantic_relation: 'A semantically inferred connection — these pages discuss related concepts even without explicit links.',
  subtopic_neighbor: 'Pages within the same subtopic group. They cover different facets of a shared specialized area.',
  topic_member: 'Pages belonging to the same top-level topic category. They share a broad knowledge domain.',
  subtopic_member: 'Pages within the same subtopic hierarchy. They are organized under a shared specialized branch.',
  category_child: 'Structural hierarchy edge — connects a parent category or topic to its child node.',
};

const EDGE_TYPE_COLORS: Record<string, string> = {
  wikilink: 'rgba(99,179,237,0.8)',
  tag_connection: 'rgba(52,211,153,0.8)',
  semantic_relation: 'rgba(251,191,36,0.8)',
  subtopic_neighbor: 'rgba(167,139,250,0.8)',
  topic_member: 'rgba(128,128,128,0.6)',
  subtopic_member: 'rgba(128,128,128,0.6)',
  category_child: 'rgba(128,128,128,0.6)',
};

const BRANCH_COLORS = [
  '#6b7280', '#71717a', '#737373', '#78716c',
  '#52525b', '#525252', '#57534e', '#4b5563',
];

interface MindNode {
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
  state: string;
  heat: number;
  category?: string;
}

export default function GraphViewer({ onNodeClick }: { onNodeClick?: (title: string) => void }) {
  const { graphData, fetchGraphData, wikiPages, chatLog, chatLoading, chatEndRef, handleChat, question, setQuestion } = useWiki();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const cameraRef = useRef(new GraphCamera());
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>('radial');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [heatMapMode, setHeatMapMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pathNodes, setPathNodes] = useState<string[]>([]);
  const [pathEdges, setPathEdges] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [branchDepths, setBranchDepths] = useState<Map<string, number>>(new Map<string, number>());
  const [pathfindingMode, setPathfindingMode] = useState(false);
  const [pathfindingStart, setPathfindingStart] = useState<string | null>(null);

  const [detailNode, setDetailNode] = useState<any>(null);
  const [detailEdge, setDetailEdge] = useState<GraphEdge | null>(null);
  const [panelWidth, setPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [hubSynthesis, setHubSynthesis] = useState<string | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);

  // Inertia pan state
  const panVelocity = useRef({ vx: 0, vy: 0 });
  const isPanning = useRef(false);
  const spaceHeld = useRef(false);
  const lastPanTime = useRef(0);

  // Multi-select state
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // AI suggestions state
  const [missingLinks, setMissingLinks] = useState<any[]>([]);
  const [bridgeSuggestion, setBridgeSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 50);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setFocusedNode(null);
        setSelectedNodes([]);
        setPathNodes([]);
        setPathEdges([]);
        setPathfindingMode(false);
        setPathfindingStart(null);
        setDetailEdge(null);
        setMultiSelectMode(false);
        cameraRef.current.x = 0;
        cameraRef.current.y = 0;
        cameraRef.current.zoom = DEFAULT_ZOOM;
      } else if (e.key === 'm' || e.key === 'M') {
        setMinimapVisible(v => !v);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'f' || e.key === 'F') {
        // Focus search
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Search topics..."]');
        input?.focus();
      } else if (e.key === 'l' || e.key === 'L') {
        // Cycle layout mode
        const modes: GraphLayoutMode[] = ['radial', 'force', 'cluster', 'hierarchy'];
        setLayoutMode(prev => {
          const idx = modes.indexOf(prev);
          return modes[(idx + 1) % modes.length];
        });
      } else if (e.key === 'h' || e.key === 'H') {
        // Toggle heat map
        setHeatMapMode(v => !v);
      } else if (e.key === ' ') {
        // Space = pan mode
        e.preventDefault();
        spaceHeld.current = true;
      } else if (e.key === 'Shift') {
        setMultiSelectMode(true);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cameraRef.current.pan(0, 40);
        setDimensions(d => ({ ...d }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        cameraRef.current.pan(0, -40);
        setDimensions(d => ({ ...d }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cameraRef.current.pan(40, 0);
        setDimensions(d => ({ ...d }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cameraRef.current.pan(-40, 0);
        setDimensions(d => ({ ...d }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceHeld.current = false;
      if (e.key === 'Shift') setMultiSelectMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const neighborMap = useMemo(() => buildNeighborMap(graphData.links), [graphData]);

  const mindMap = useMemo(() => {
    // Filter out chat-generated analysis pages (page_type=analysis or slug starting with analysis-)
    const isAnalysisNode = (n: any) =>
      n.type === 'analysis' ||
      n.page_type === 'analysis' ||
      (n.id && n.id.startsWith('analysis-'));
    const analysisNodes = graphData.nodes.filter(isAnalysisNode);
    if (analysisNodes.length > 0) {
      console.warn('[GraphViewer] Filtering out analysis nodes:', analysisNodes.map((n: any) => ({ id: n.id, type: n.type, name: n.name })));
    }
    const filteredNodes = graphData.nodes.filter((n: any) => !isAnalysisNode(n));
    const analysisIds = new Set(analysisNodes.map((n: any) => n.id));
    const filteredLinks = graphData.links.filter((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return !analysisIds.has(s) && !analysisIds.has(t);
    });

    const catGroups = new Map<string, any[]>();
    filteredNodes.forEach((n: any) => {
      const cat = n.topic || n.category || 'Miscellaneous';
      if (!catGroups.has(cat)) catGroups.set(cat, []);
      catGroups.get(cat)!.push(n);
    });

    const sortedCats = Array.from(catGroups.entries()).sort((a, b) => b[1].length - a[1].length);

    const nodeCategory = new Map<string, string>();
    filteredNodes.forEach((n: any) => {
      nodeCategory.set(n.id, n.topic || n.category || 'Miscellaneous');
    });

    const CATEGORY_RADIUS = 200;
    const LEAF_RADIUS = 170;
    const nodes: MindNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, MindNode>();

    const root: MindNode = {
      id: '__root__', name: 'Knowledge Base', type: 'root',
      x: 0, y: 0, radius: 40, color: BRANCH_COLORS[0],
      isCategory: false, isExpanded: true, degree: 0, childIds: [], state: 'default', heat: 0,
    };
    nodes.push(root);
    nodeMap.set(root.id, root);

    const numCats = sortedCats.length;
    sortedCats.forEach(([cat, catNodes], idx) => {
      const angle = (idx / numCats) * Math.PI * 2 - Math.PI / 2;
      const catColor = BRANCH_COLORS[idx % BRANCH_COLORS.length];
      const isExpanded = expandedBranches.has(cat);

      const catNode: MindNode = {
        id: `__cat__${cat}`, name: cat, type: 'category',
        x: Math.cos(angle) * CATEGORY_RADIUS,
        y: Math.sin(angle) * CATEGORY_RADIUS,
        radius: 22, color: catColor,
        isCategory: true, isExpanded, degree: catNodes.length, childIds: [], state: 'default', heat: catNodes.length * 5,
        category: cat,
      };
      nodes.push(catNode);
      nodeMap.set(catNode.id, catNode);
      root.childIds.push(catNode.id);
      edges.push({ fromId: root.id, toId: catNode.id, color: catColor, isCrossBranch: false, edgeType: 'category_child' });

      if (isExpanded) {
        const leafCount = catNodes.length;
        const arcSpread = Math.min(Math.PI * 0.8, leafCount * 0.18);
        const startAngle = angle - arcSpread / 2;
        catNodes.forEach((n, li) => {
          const leafAngle = leafCount === 1 ? angle : startAngle + (li / (leafCount - 1)) * arcSpread;
          const heat = (n.degree || 0) * 5 + (n.is_hub ? 50 : 0);
          const leafNode: MindNode = {
            id: n.id, name: n.name || n.id.replace(/_/g, ' '), type: n.type || 'concept',
            x: catNode.x + Math.cos(leafAngle) * LEAF_RADIUS,
            y: catNode.y + Math.sin(leafAngle) * LEAF_RADIUS,
            radius: n.is_hub ? 14 : (n.degree || 0) > 10 ? 10 : (n.degree || 0) > 5 ? 8 : 6,
            color: catColor,
            isCategory: false, isExpanded: false,
            degree: n.degree || 0, is_hub: n.is_hub, summary: n.summary, childIds: [], state: 'default', heat,
            category: cat,
          };
          nodes.push(leafNode);
          nodeMap.set(leafNode.id, leafNode);
          catNode.childIds.push(leafNode.id);
          edges.push({ fromId: catNode.id, toId: leafNode.id, color: catColor, isCrossBranch: false, edgeType: 'category_child' });
        });
      }
    });

    // Process semantic links from backend — propagate edge type for visual distinction
    filteredLinks.forEach((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      const sCat = nodeCategory.get(s);
      const tCat = nodeCategory.get(t);
      const isCross = sCat && tCat && sCat !== tCat;
      const edgeType = (l.type || 'wikilink') as EdgeType;

      if (!nodeMap.has(s) || !nodeMap.has(t)) return;

      // Color by edge type for semantic distinction
      let edgeColor: string;
      switch (edgeType) {
        case 'wikilink': edgeColor = isCross ? 'rgba(99,179,237,0.4)' : 'rgba(99,179,237,0.6)'; break;
        case 'tag_connection': edgeColor = isCross ? 'rgba(52,211,153,0.35)' : 'rgba(52,211,153,0.5)'; break;
        case 'semantic_relation': edgeColor = isCross ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.45)'; break;
        case 'subtopic_neighbor': edgeColor = isCross ? 'rgba(167,139,250,0.35)' : 'rgba(167,139,250,0.5)'; break;
        case 'topic_member': edgeColor = 'rgba(128,128,128,0.2)'; break;
        case 'subtopic_member': edgeColor = 'rgba(128,128,128,0.15)'; break;
        default: edgeColor = isCross ? 'rgba(128,128,128,0.3)' : 'rgba(128,128,128,0.5)'; break;
      }

      edges.push({ fromId: s, toId: t, color: edgeColor, isCrossBranch: !!isCross, edgeType });
    });

    return { nodes, edges, nodeMap, categories: sortedCats.map(([c]) => c) };
  }, [graphData, wikiPages, expandedBranches]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const results = semanticSearch(searchTerm, mindMap.nodes as any, mindMap.edges as any, neighborMap);
    setSearchResults(results);
  }, [searchTerm, mindMap, neighborMap]);

  const toggleBranch = useCallback((cat: string) => {
    setExpandedBranches(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });
  }, []);

  // Depth-limited branch expansion: expand branch to N levels of neighbors
  const expandBranchDepth = useCallback((cat: string, depth: number) => {
    setExpandedBranches(prev => {
      const n = new Set(prev);
      n.add(cat);
      return n;
    });
    setBranchDepths(prev => {
      const n = new Map(prev);
      n.set(cat, depth);
      return n;
    });
  }, []);

  const handleNodeClick = useCallback((node: MindNode) => {
    if (pathfindingMode) {
      if (!pathfindingStart) {
        setPathfindingStart(node.id);
      } else if (pathfindingStart !== node.id) {
        const path = findShortestPath(pathfindingStart, node.id, mindMap.edges);
        setPathNodes(path);
        const pathE = [];
        for (let i = 0; i < path.length - 1; i++) {
          pathE.push(`${path[i]}-${path[i + 1]}`);
          pathE.push(`${path[i + 1]}-${path[i]}`);
        }
        setPathEdges(pathE);
        setPathfindingMode(false);
        setPathfindingStart(null);
      }
      return;
    }

    if (node.isCategory) {
      const catName = node.id.replace('__cat__', '');
      // Right-click or depth expansion: expand with depth 2
      expandBranchDepth(catName, 2);
    } else if (multiSelectMode) {
      // Multi-select: add/remove from selection
      setSelectedNodes(prev => {
        if (prev.includes(node.id)) return prev.filter(id => id !== node.id);
        return [...prev, node.id];
      });
      setDetailNode(node);
      setFocusedNode(node.id);
      setHubSynthesis(null);
      onNodeClick?.(node.id);
    } else {
      setSelectedNodes([node.id]);
      setDetailNode(node);
      setFocusedNode(node.id);
      setHubSynthesis(null);
      onNodeClick?.(node.id);
      cameraRef.current.focus(node as any, dimensions.width, dimensions.height);
    }
  }, [pathfindingMode, pathfindingStart, mindMap.edges, expandBranchDepth, multiSelectMode, onNodeClick, dimensions]);

  // Edge click handler — show relation detail popover
  const handleEdgeClick = useCallback((edge: GraphEdge) => {
    setDetailEdge(edge);
  }, []);

  const handleNodeHover = useCallback((nodeId: string | null) => setHoveredNode(nodeId), []);

  const handlePan = useCallback((dx: number, dy: number) => {
    cameraRef.current.pan(dx, dy);
    panVelocity.current = { vx: dx, vy: dy };
    isPanning.current = true;
    lastPanTime.current = Date.now();
    setDimensions(d => ({ ...d }));
  }, []);

  // Inertia pan animation
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (!isPanning.current) {
        const { vx, vy } = panVelocity.current;
        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          cameraRef.current.pan(vx * 0.85, vy * 0.85);
          panVelocity.current = { vx: vx * 0.85, vy: vy * 0.85 };
          setDimensions(d => ({ ...d }));
        } else {
          panVelocity.current = { vx: 0, vy: 0 };
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleZoom = useCallback((cursorX: number, cursorY: number, delta: number) => {
    cameraRef.current.zoomAt(cursorX, cursorY, delta);
    setDimensions(d => ({ ...d }));
  }, []);

  const handleZoomIn = useCallback(() => {
    cameraRef.current.zoomAt(dimensions.width / 2, dimensions.height / 2, -100);
    setDimensions(d => ({ ...d }));
  }, [dimensions]);

  const handleZoomOut = useCallback(() => {
    cameraRef.current.zoomAt(dimensions.width / 2, dimensions.height / 2, 100);
    setDimensions(d => ({ ...d }));
  }, [dimensions]);

  const handleResetView = useCallback(() => {
    cameraRef.current.x = 0;
    cameraRef.current.y = 0;
    cameraRef.current.zoom = DEFAULT_ZOOM;
    setFocusedNode(null);
    setSelectedNodes([]);
    setPathNodes([]);
    setPathEdges([]);
    setDimensions(d => ({ ...d }));
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedBranches(new Set(mindMap.categories));
    const depths = new Map<string, number>();
    mindMap.categories.forEach(c => depths.set(c, 3));
    setBranchDepths(depths);
  }, [mindMap.categories]);
  const handleCollapseAll = useCallback(() => {
    setExpandedBranches(new Set());
    setBranchDepths(new Map<string, number>());
  }, []);
  const handleLayoutChange = useCallback((mode: GraphLayoutMode) => setLayoutMode(mode), []);
  const handleToggleMinimap = useCallback(() => setMinimapVisible(v => !v), []);
  const handleToggleHeatMap = useCallback(() => setHeatMapMode(v => !v), []);
  const handleFindPath = useCallback(() => { setPathfindingMode(true); setPathfindingStart(null); setPathNodes([]); setPathEdges([]); }, []);

  const handleMinimapNavigate = useCallback((x: number, y: number) => {
    cameraRef.current.x = x;
    cameraRef.current.y = y;
    setDimensions(d => ({ ...d }));
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const w = window.innerWidth - e.clientX;
    if (w > 400 && w < 1000) setPanelWidth(w);
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stopResizing); };
  }, [resize, stopResizing]);

  useEffect(() => { fetchGraphData(); }, []);

  const sources = useMemo(() => {
    if (!detailNode) return [];
    const name = (detailNode.name || detailNode.id).toLowerCase();
    return wikiPages.filter(p => p.title.toLowerCase().includes(name) || (p.description && p.description.toLowerCase().includes(name))).slice(0, 12);
  }, [detailNode, wikiPages]);

  const related = useMemo(() => {
    if (!detailNode) return [];
    const neighbors = neighborMap.get(detailNode.id);
    if (!neighbors) return [];
    return Array.from(neighbors).map(id => {
      const node = graphData.nodes.find((n: any) => n.id === id);
      if (!node) return null;
      // Find the edge type connecting this node to the detail node
      const edge = mindMap.edges.find(e =>
        (e.fromId === detailNode.id && e.toId === id) || (e.toId === detailNode.id && e.fromId === id)
      );
      return { ...node, relationType: edge?.edgeType || 'category_child' };
    }).filter(Boolean).slice(0, 16);
  }, [detailNode, neighborMap, graphData, mindMap.edges]);

  const isHubNode = useCallback((node: any) => (node.degree || 0) >= 3 || node.is_hub, []);

  const handleSynthesizeHub = async () => {
    if (!detailNode) return;
    setSynthesisLoading(true);
    try {
      const res = await axios.get(`${API}/synthesize_hub?hub=${encodeURIComponent(detailNode.id)}`);
      setHubSynthesis(res.data.synthesis);
    } catch { setHubSynthesis('Failed to synthesize hub relationships.'); }
    finally { setSynthesisLoading(false); }
  };

  const handleFetchMissingLinks = async () => {
    if (!detailNode) return;
    setAiLoading(true);
    try {
      const neighborIds = Array.from(neighborMap.get(detailNode.id) || []);
      const res = await axios.post(`${API}/suggest_links`, { node: detailNode.id, related: neighborIds });
      setMissingLinks(res.data.suggestions || []);
    } catch { setMissingLinks([]); }
    finally { setAiLoading(false); }
  };

  const handleFetchBridgeSuggestion = async (nodeA: string, nodeB: string) => {
    setAiLoading(true);
    try {
      const res = await axios.get(`${API}/bridge_suggestion`, { params: { from: nodeA, to: nodeB } });
      setBridgeSuggestion(res.data.suggestion || 'No bridge suggestion available.');
    } catch { setBridgeSuggestion('Failed to generate bridge suggestion.'); }
    finally { setAiLoading(false); }
  };

  const canvasWidth = detailNode ? Math.max(dimensions.width - panelWidth - 6, 350) : dimensions.width;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full overflow-hidden"
      style={{ minHeight: 600, background: `radial-gradient(ellipse at 40% 50%, var(--bg-800) 0%, var(--bg-900) 100%)` }}
    >
      <GraphControls
        layoutMode={layoutMode}
        onLayoutChange={handleLayoutChange}
        minimapVisible={minimapVisible}
        onToggleMinimap={handleToggleMinimap}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        heatMapMode={heatMapMode}
        onToggleHeatMap={handleToggleHeatMap}
        onFindPath={handleFindPath}
      />

      <div className="relative flex-1">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-surface-2 rounded-md px-3 py-2 border border-border-subtle shadow-sm pointer-events-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none w-48 text-text-primary placeholder:text-text-muted"
            placeholder="Search topics..."
          />
          {pathfindingMode && <span className="text-[10px] text-amber-400 animate-pulse">{pathfindingStart ? 'Select end node...' : 'Select start node...'}</span>}
        </div>

        <div className="absolute top-4 right-4 z-10 bg-surface-2 rounded-md px-4 py-3 border border-border-subtle shadow-sm pointer-events-auto">
          <p className="text-sm font-semibold text-text-primary">Knowledge Map</p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5"><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-text-muted" /></span>
            <p className="text-[10px] uppercase tracking-widest font-medium text-text-muted">{mindMap.categories.length} topics · {mindMap.nodes.length - 1} nodes</p>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto bg-surface-2 rounded-md px-3 py-2 border border-border-subtle shadow-sm max-w-[200px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-text-muted">Topics</p>
          <div className="flex flex-col gap-1.5">
            {mindMap.categories.map((cat, idx) => {
              const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
              const isExpanded = expandedBranches.has(cat);
              const depth = branchDepths.get(cat) || 0;
              return (
                <div key={cat} className="flex items-center gap-1">
                  <button onClick={() => toggleBranch(cat)} className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, opacity: isExpanded ? 1 : 0.4 }} />
                    <span className="text-[10px] font-semibold truncate" style={{ color: isExpanded ? color : 'var(--text-muted)' }}>{cat}</span>
                    <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>{isExpanded ? '−' : '+'}</span>
                  </button>
                  {isExpanded && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {[1, 2, 3].map(d => (
                        <button
                          key={d}
                          onClick={() => expandBranchDepth(cat, d)}
                          className="text-[8px] px-1 py-0.5 rounded transition-colors"
                          style={{
                            background: depth >= d ? color + '30' : 'transparent',
                            color: depth >= d ? color : 'var(--text-muted)',
                            border: `1px solid ${depth >= d ? color + '40' : 'transparent'}`,
                          }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Edge type legend */}
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5 text-text-muted">Relations</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="rgba(99,179,237,0.7)" strokeWidth="2" /></svg>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Wiki Link</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" strokeDasharray="3 4" /></svg>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Shared Tag</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="rgba(251,191,36,0.45)" strokeWidth="1.5" strokeDasharray="6 4" /></svg>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Semantic</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="rgba(167,139,250,0.5)" strokeWidth="1.2" strokeDasharray="4 2 2 2" /></svg>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Subtopic</span>
              </div>
            </div>
          </div>
          <p className="text-[8px] mt-2 pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>Click topic ± depth · Shift+click multi-select · Space+drag pan · F search · L layout · H heat</p>
        </div>

        {/* Edge detail popover */}
        {detailEdge && (
          <div
            className="absolute z-30 bg-surface-2 rounded-lg px-4 py-3 border border-border-subtle shadow-lg pointer-events-auto"
            style={{
              left: Math.min((() => {
                const from = mindMap.nodeMap.get(detailEdge.fromId);
                const to = mindMap.nodeMap.get(detailEdge.toId);
                if (!from || !to) return 100;
                const cam = cameraRef.current.getState();
                const mx = ((from.x + to.x) / 2) * cam.zoom + cam.x + canvasWidth / 2;
                return Math.max(10, Math.min(mx - 120, canvasWidth - 260));
              })(), canvasWidth - 260),
              top: Math.min((() => {
                const from = mindMap.nodeMap.get(detailEdge.fromId);
                const to = mindMap.nodeMap.get(detailEdge.toId);
                if (!from || !to) return 100;
                const cam = cameraRef.current.getState();
                const my = ((from.y + to.y) / 2) * cam.zoom + cam.y + dimensions.height / 2;
                return Math.max(10, Math.min(my - 60, dimensions.height - 160));
              })(), dimensions.height - 160),
              maxWidth: 240,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {EDGE_TYPE_LABELS[detailEdge.edgeType || 'wikilink'] || detailEdge.edgeType}
              </p>
              <button onClick={() => setDetailEdge(null)} className="text-[10px] hover:opacity-80" style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {EDGE_TYPE_DESCRIPTIONS[detailEdge.edgeType || 'wikilink'] || 'Connection between knowledge nodes'}
            </p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {mindMap.nodeMap.get(detailEdge.fromId)?.name?.replace(/_/g, ' ') || detailEdge.fromId}
              </span>
              <span className="text-[9px]" style={{ color: EDGE_TYPE_COLORS[detailEdge.edgeType || 'wikilink'] }}>→</span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {mindMap.nodeMap.get(detailEdge.toId)?.name?.replace(/_/g, ' ') || detailEdge.toId}
              </span>
            </div>
            {detailEdge.isCrossBranch && (
              <p className="text-[9px] px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'var(--accent)' + '15', color: 'var(--accent)' }}>
                Cross-topic
              </p>
            )}
          </div>
        )}

        <CanvasRenderer
          nodes={mindMap.nodes}
          edges={mindMap.edges}
          dimensions={{ width: canvasWidth, height: dimensions.height }}
          camera={cameraRef.current}
          layoutMode={layoutMode}
          selectedNodes={selectedNodes}
          hoveredNode={hoveredNode}
          focusedNode={focusedNode}
          searchResults={searchResults}
          pathNodes={pathNodes}
          pathEdges={pathEdges}
          heatMapMode={heatMapMode}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onEdgeClick={handleEdgeClick}
          onPan={handlePan}
          onZoom={handleZoom}
        />

        {minimapVisible && (
          <GraphMinimap
            nodes={mindMap.nodes}
            edges={mindMap.edges}
            camera={cameraRef.current.getState()}
            canvasWidth={canvasWidth}
            canvasHeight={dimensions.height}
            onNavigate={handleMinimapNavigate}
            visible={minimapVisible}
          />
        )}
      </div>

      {detailNode && (
        <div onMouseDown={startResizing} className="w-1.5 flex-shrink-0 cursor-col-resize z-30 flex items-center justify-center group" style={{ background: isResizing ? 'var(--accent-glow)' : 'transparent' }}>
          <div className="w-0.5 h-12 rounded-full transition-colors" style={{ background: 'var(--border)' }} />
        </div>
      )}

      {detailNode && (
        <div className="flex-shrink-0 flex flex-col border-l z-20 bg-surface-1 border-border-subtle" style={{ width: panelWidth, height: dimensions.height }}>
          <div className="graph-chat">
            <div className="graph-chat-header">
              <div className="graph-chat-context">
                <div className="graph-chat-avatar">{(detailNode.name || detailNode.id || 'N').replace(/_/g, ' ').slice(0, 2).toUpperCase()}</div>
                <div className="graph-chat-context-text">
                  <div className="graph-chat-subtitle">{detailNode.type === 'ghost' ? 'Uncharted Topic' : isHubNode(detailNode) ? 'Knowledge Hub' : 'Knowledge Node'}</div>
                  <div className="graph-chat-title">{(detailNode.name || detailNode.id).replace(/_/g, ' ')}</div>
                </div>
              </div>
              <button onClick={() => { setDetailNode(null); setSelectedNodes([]); }} className="graph-message-action" aria-label="Close">✕</button>
            </div>

            <div className="graph-chat-messages">
              <div className="graph-message-row ai">
                <div className="graph-message ai">
                  <h3>Knowledge Surface</h3>
                  {(hubSynthesis || detailNode.summary) ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{hubSynthesis || detailNode.summary}</ReactMarkdown>
                  ) : (
                    <p>This node currently has no synthesized summary. Ask questions below to explore its meaning, connected concepts, or generate deeper context.</p>
                  )}
                  <div className="graph-chips">
                    <Link href={`/dashboard/markdown?page=${encodeURIComponent(detailNode.id)}`} className="graph-chip">Open Wiki Note</Link>
                    {isHubNode(detailNode) && !hubSynthesis && <button className="graph-chip" onClick={handleSynthesizeHub} disabled={synthesisLoading}>{synthesisLoading ? 'Synthesizing...' : 'Synthesize Knowledge'}</button>}
                    <button className="graph-chip" onClick={handleFetchMissingLinks} disabled={aiLoading}>{aiLoading ? 'Analyzing...' : 'Suggest Links'}</button>
                  </div>
                </div>
              </div>

              {/* Connected Concepts — semantic relation map */}
              {related.length > 0 && (
                <div className="graph-message-row ai">
                  <div className="graph-message ai">
                    <h3>Connected Concepts</h3>
                    <div className="flex flex-col gap-1.5 mt-1">
                      {related.map((r: any) => {
                        const relLabel: Record<string, string> = {
                          wikilink: 'Wiki Link',
                          tag_connection: 'Shared Tag',
                          semantic_relation: 'Semantic',
                          subtopic_neighbor: 'Same Subtopic',
                          topic_member: 'Same Topic',
                          subtopic_member: 'Subtopic',
                          category_child: 'Category',
                        };
                        const relColor: Record<string, string> = {
                          wikilink: 'rgba(99,179,237,0.8)',
                          tag_connection: 'rgba(52,211,153,0.8)',
                          semantic_relation: 'rgba(251,191,36,0.8)',
                          subtopic_neighbor: 'rgba(167,139,250,0.8)',
                          topic_member: 'rgba(128,128,128,0.6)',
                          subtopic_member: 'rgba(128,128,128,0.6)',
                          category_child: 'rgba(128,128,128,0.6)',
                        };
                        const rt = r.relationType || 'category_child';
                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              const node = mindMap.nodeMap.get(r.id);
                              if (node) handleNodeClick(node);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              // Show edge detail on right-click
                              const edge = mindMap.edges.find(ed =>
                                (ed.fromId === detailNode.id && ed.toId === r.id) || (ed.toId === detailNode.id && ed.fromId === r.id)
                              );
                              if (edge) handleEdgeClick(edge);
                            }}
                            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity rounded px-2 py-1"
                            style={{ borderLeft: `2px solid ${relColor[rt] || 'rgba(128,128,128,0.4)'}` }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {(r.name || r.id).replace(/_/g, ' ')}
                              </p>
                              <p className="text-[9px]" style={{ color: relColor[rt] || 'var(--text-muted)' }}>
                                {relLabel[rt] || rt}
                              </p>
                            </div>
                            {r.is_hub && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)' + '15', color: 'var(--accent)' }}>Hub</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* AI: Missing Link Suggestions */}
              {missingLinks.length > 0 && (
                <div className="graph-message-row ai">
                  <div className="graph-message ai">
                    <h3>Suggested Links</h3>
                    <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Weakly connected topics that could benefit from a bridge page.</p>
                    <div className="flex flex-col gap-1.5">
                      {missingLinks.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 rounded px-2 py-1" style={{ borderLeft: '2px solid rgba(251,191,36,0.6)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {s.fromNode?.replace(/_/g, ' ') || '?'} ↔ {s.toNode?.replace(/_/g, ' ') || '?'}
                            </p>
                            <p className="text-[9px]" style={{ color: 'rgba(251,191,36,0.8)' }}>{s.reason || 'Potential connection'}</p>
                          </div>
                          <button
                            className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--accent)' + '15', color: 'var(--accent)' }}
                            onClick={() => handleFetchBridgeSuggestion(s.fromNode, s.toNode)}
                          >
                            Bridge
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI: Bridge Suggestion */}
              {bridgeSuggestion && (
                <div className="graph-message-row ai">
                  <div className="graph-message ai">
                    <h3>Bridge Insight</h3>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{bridgeSuggestion}</ReactMarkdown>
                    <button className="graph-chip mt-1" onClick={() => setBridgeSuggestion(null)}>Dismiss</button>
                  </div>
                </div>
              )}

              {chatLog.length === 0 && (
                <div className="graph-chat-empty">
                  <div className="graph-chat-empty-icon"><ChatIcon size={30} className="text-accent" /></div>
                  <div className="graph-chat-empty-title">Ask This Node Anything</div>
                  <div className="graph-chat-empty-text">Explore summaries, relationships, dependencies, reasoning chains, and connected knowledge.</div>
                  <div className="graph-chips" style={{ marginTop: 20 }}>
                    {[`Summarize ${(detailNode.name || '').replace(/_/g, ' ')}`, 'Explain this deeply', 'What does this connect to?'].map(prompt => (
                      <button key={prompt} className="graph-chip" onClick={() => setQuestion(prompt)}>{prompt}</button>
                    ))}
                  </div>
                </div>
              )}

              {chatLog.map((msg, i) => (
                <div key={i} className={`graph-message-row ${msg.role}`}>
                  <div className={`graph-message ${msg.role}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown></div>
                </div>
              ))}

              {chatLoading && (
                <div className="graph-message-row ai">
                  <div className="graph-message ai"><div className="graph-typing"><span></span><span></span><span></span></div></div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="graph-chat-input-container">
              <div className="graph-chat-input-box">
                <textarea
                  className="graph-chat-input"
                  placeholder={`Ask about ${(detailNode.name || detailNode.id).replace(/_/g, ' ')}...`}
                  value={question}
                  rows={1}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(detailNode.id); } }}
                />
                <button className="graph-chat-send" onClick={() => handleChat(detailNode.id)} disabled={chatLoading || !question.trim()}>
                  {chatLoading ? <Spinner /> : <><span>Ask</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></>}
                </button>
              </div>
              <div className="graph-chat-breadcrumb">Wiki Node → {(detailNode.name || detailNode.id).replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CanvasRenderer({
  nodes,
  edges,
  dimensions,
  camera,
  layoutMode,
  selectedNodes,
  hoveredNode,
  focusedNode,
  searchResults,
  pathNodes,
  pathEdges,
  heatMapMode,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  onPan,
  onZoom,
}: {
  nodes: MindNode[];
  edges: GraphEdge[];
  dimensions: { width: number; height: number };
  camera: GraphCamera;
  layoutMode: GraphLayoutMode;
  selectedNodes: string[];
  hoveredNode: string | null;
  focusedNode: string | null;
  searchResults: any[];
  pathNodes: string[];
  pathEdges: string[];
  heatMapMode: boolean;
  onNodeClick: (node: MindNode) => void;
  onNodeHover: (nodeId: string | null) => void;
  onEdgeClick: (edge: GraphEdge) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (cx: number, cy: number, delta: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    setCtx(context);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    context.scale(dpr, dpr);
  }, [dimensions.width, dimensions.height]);

  const render = useCallback(() => {
    if (!ctx) return;
    camera.update();
    const cs = getComputedStyle(document.documentElement);
    const camState = camera.getState();

    const bgColor = cs.getPropertyValue('--surface-1').trim() || '#1b1b1f';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const textPrimary = cs.getPropertyValue('--text-primary').trim() || '#e2e8f0';

    const searchSet = new Set(searchResults.map((r: any) => r.nodeId));
    const pathNodeSet = new Set(pathNodes);
    const pathEdgeSet = new Set(pathEdges);
    const selectedSet = new Set(selectedNodes);
    const nm = buildNeighborMap(edges);

    edges.forEach(edge => {
      const from = nodes.find(n => n.id === edge.fromId);
      const to = nodes.find(n => n.id === edge.toId);
      if (!from || !to) return;

      const fx = from.x * camState.zoom + camState.x + dimensions.width / 2;
      const fy = from.y * camState.zoom + camState.y + dimensions.height / 2;
      const tx = to.x * camState.zoom + camState.x + dimensions.width / 2;
      const ty = to.y * camState.zoom + camState.y + dimensions.height / 2;

      if ((fx < -100 && tx < -100) || (fx > dimensions.width + 100 && tx > dimensions.width + 100) ||
          (fy < -100 && ty < -100) || (fy > dimensions.height + 100 && ty > dimensions.height + 100)) return;

      const isPath = pathEdgeSet.has(`${edge.fromId}-${edge.toId}`) || pathEdgeSet.has(`${edge.toId}-${edge.fromId}`);

      ctx.beginPath();
      if (isPath) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * camState.zoom;
      } else if (edge.edgeType === 'wikilink') {
        // Wikilinks: solid blue lines
        ctx.setLineDash([]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 2 * camState.zoom;
        ctx.globalAlpha = 0.7;
      } else if (edge.edgeType === 'tag_connection') {
        // Tag connections: dotted green lines
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1.5 * camState.zoom;
        ctx.globalAlpha = 0.5;
      } else if (edge.edgeType === 'semantic_relation') {
        // Semantic relations: dashed amber lines
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1.5 * camState.zoom;
        ctx.globalAlpha = 0.45;
      } else if (edge.edgeType === 'subtopic_neighbor') {
        // Subtopic neighbors: dash-dot purple lines
        ctx.setLineDash([4, 2, 2, 2]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1.2 * camState.zoom;
        ctx.globalAlpha = 0.45;
      } else if (edge.edgeType === 'topic_member' || edge.edgeType === 'subtopic_member') {
        // Topic/subtopic membership: very faint thin lines
        ctx.setLineDash([2, 6]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 0.8 * camState.zoom;
        ctx.globalAlpha = 0.25;
      } else if (edge.isCrossBranch) {
        // Fallback cross-branch
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1 * camState.zoom;
        ctx.globalAlpha = 0.5;
      } else {
        // Default category edges
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = (from.isCategory ? 3 : 2) * camState.zoom;
        ctx.globalAlpha = 0.6;
      }

      if (layoutMode === 'radial' && (edge.edgeType === 'wikilink' || edge.edgeType === 'tag_connection' || edge.edgeType === 'semantic_relation' || edge.edgeType === 'subtopic_neighbor')) {
        // Semantic edges: curved lines for visual clarity
        const mx = (fx + tx) / 2, my = (fy + ty) / 2;
        const dx = tx - fx, dy = ty - fy;
        const curvature = edge.isCrossBranch ? 0.15 : 0.08;
        const cpx = mx - dy * curvature, cpy = my + dx * curvature;
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      } else if (layoutMode === 'radial' && !edge.isCrossBranch) {
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

    nodes.forEach(node => {
      const nx = node.x * camState.zoom + camState.x + dimensions.width / 2;
      const ny = node.y * camState.zoom + camState.y + dimensions.height / 2;
      const r = node.radius * camState.zoom;

      if (nx < -100 || nx > dimensions.width + 100 || ny < -100 || ny > dimensions.height + 100) return;

      const isSelected = selectedSet.has(node.id);
      const isHovered = hoveredNode === node.id;
      const isSearched = searchSet.has(node.id);
      const isPath = pathNodeSet.has(node.id);
      const isFocused = focusedNode === node.id;

      let fillColor = node.color;
      let strokeColor = node.color;
      let lineWidth = 1.5 * camState.zoom;
      let globalAlpha = 1;

      if (isFocused) { strokeColor = '#f59e0b'; lineWidth = 3 * camState.zoom; }
      else if (isSelected) { fillColor = '#fff'; strokeColor = node.color; lineWidth = 2.5 * camState.zoom; }
      else if (isHovered) { strokeColor = node.color; lineWidth = 2.5 * camState.zoom; }

      if (focusedNode && focusedNode !== node.id && !nm.get(focusedNode)?.has(node.id)) globalAlpha = 0.2;
      if (heatMapMode) { const intensity = (node.heat || 0) / 100; fillColor = `rgba(239, 68, 68, ${intensity})`; }

      if (isSearched) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 10 * camState.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * camState.zoom;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = globalAlpha;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      if (isPath) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 6 * camState.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 * camState.zoom;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      if (camState.zoom > 0.6 || isSelected || isHovered || isFocused) {
        const label = node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name;
        ctx.font = `${(isSelected || node.is_hub) ? 'bold' : 'normal'} ${10 * camState.zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected ? '#fff' : textPrimary;
        ctx.globalAlpha = globalAlpha;
        ctx.fillText(label, nx, ny - r - 6 * camState.zoom);
      }

      ctx.globalAlpha = 1;
    });

    if (camera.isFocusAnimating()) { animFrameRef.current = requestAnimationFrame(render); }
  }, [ctx, camera, dimensions, nodes, edges, layoutMode, selectedNodes, hoveredNode, focusedNode, searchResults, pathNodes, pathEdges, heatMapMode]);

  useEffect(() => {
    if (camera.isFocusAnimating()) { animFrameRef.current = requestAnimationFrame(render); }
    else { render(); }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [render]);

  const findNodeAt = useCallback((mx: number, my: number): MindNode | null => {
    const camState = camera.getState();
    const wx = (mx - camState.x - dimensions.width / 2) / camState.zoom;
    const wy = (my - camState.y - dimensions.height / 2) / camState.zoom;
    let found: MindNode | null = null;
    let minDist = 30;
    nodes.forEach(n => {
      if (n.type === 'root') return;
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d < minDist) { minDist = d; found = n; }
    });
    return found;
  }, [camera, dimensions, nodes]);

  // Find edge near a screen point (within 8px tolerance)
  const findEdgeAt = useCallback((sx: number, sy: number): GraphEdge | null => {
    const camState = camera.getState();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const TOLERANCE = 8;
    for (const edge of edges) {
      const from = nodeMap.get(edge.fromId);
      const to = nodeMap.get(edge.toId);
      if (!from || !to) continue;
      const fx = from.x * camState.zoom + camState.x + dimensions.width / 2;
      const fy = from.y * camState.zoom + camState.y + dimensions.height / 2;
      const tx = to.x * camState.zoom + camState.x + dimensions.width / 2;
      const ty = to.y * camState.zoom + camState.y + dimensions.height / 2;
      // Point-to-line-segment distance
      const dx = tx - fx, dy = ty - fy;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let t = ((sx - fx) * dx + (sy - fy) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = fx + t * dx, py = fy + t * dy;
      const dist = Math.sqrt((sx - px) ** 2 + (sy - py) ** 2);
      if (dist < TOLERANCE) return edge;
    }
    return null;
  }, [camera, dimensions, nodes, edges]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Middle mouse or space+left = pan mode
    if (e.button === 1 || (e.button === 0 && (e.nativeEvent as any).spaceHeld)) {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const clicked = findNodeAt(mx, my);
    if (!clicked) { isDragging.current = true; dragStart.current = { x: e.clientX, y: e.clientY }; }
  }, [findNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) { onPan(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y); dragStart.current = { x: e.clientX, y: e.clientY }; return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hovered = findNodeAt(mx, my);
    onNodeHover(hovered?.id || null);
    // Show pointer cursor when hovering over an edge too
    const hoveredEdge = !hovered ? findEdgeAt(mx, my) : null;
    if (canvas) canvas.style.cursor = hovered ? 'pointer' : hoveredEdge ? 'crosshair' : 'grab';
  }, [findNodeAt, findEdgeAt, onNodeHover, onPan]);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const clicked = findNodeAt(mx, my);
    if (clicked) {
      onNodeClick(clicked);
    } else {
      // Check if clicked on an edge
      const edge = findEdgeAt(mx, my);
      if (edge) onEdgeClick(edge);
    }
  }, [findNodeAt, findEdgeAt, onNodeClick, onEdgeClick]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Trackpad pinch: ctrlKey + wheel
    const delta = e.deltaY;
    onZoom(e.clientX - rect.left, e.clientY - rect.top, delta);
  }, [onZoom]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: dimensions.width, height: dimensions.height, display: 'block' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
    />
  );
}