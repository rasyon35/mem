'use client';

import { useWiki } from '@/context/WikiContext';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import { Spinner, ChatIcon, WikiIcon } from '@/components/Icons';
import axios from 'axios';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = 'http://localhost:8000/api';

/* ─── Branch Colors (Muted) ──────────────────────── */
const BRANCH_COLORS = [
  '#6b7280', '#71717a', '#737373', '#78716c',
  '#52525b', '#525252', '#57534e', '#4b5563',
];

type MindNode = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  radius: number;       // hit radius for click detection
  color: string;
  isCategory: boolean;
  isExpanded: boolean;
  degree: number;
  is_hub?: boolean;
  summary?: string;
  childIds: string[];
};

type MindEdge = {
  fromId: string;
  toId: string;
  color: string;
  isCrossBranch: boolean;
};




export default function GraphViewer({ onNodeClick }: { onNodeClick?: (title: string) => void }) {
  const { graphData, fetchGraphData, wikiPages, presence, locks } = useWiki();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  /* ─── Panel state ─────────────────────────────────────────── */
  const [detailNode, setDetailNode] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [panelWidth, setPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [hubSynthesis, setHubSynthesis] = useState<string | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  
  const { 
    chatLog, chatLoading, chatEndRef, 
    handleChat, question, setQuestion 
  } = useWiki();


  /* ─── Lifecycle ───────────────────────────────────────────── */
  useEffect(() => {
    fetchGraphData();
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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, chatEndRef]);


  /* ─── Resizable panel ─────────────────────────────────────── */
  const startResizing = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsResizing(true); }, []);
  const stopResizing  = useCallback(() => setIsResizing(false), []);
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

  /* ─── Neighbor map (for detail panel) ──────────────────────── */
  const neighborMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    graphData.links.forEach((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (!m.has(s)) m.set(s, new Set()); if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t); m.get(t)!.add(s);
    });
    return m;
  }, [graphData]);

  /* ─── Radial Mind Map Layout ──────────────────────────────── */
  const mindMap = useMemo(() => {
    const catMap = new Map<string, string>();
    wikiPages.forEach(p => { catMap.set(p.title, p.category || 'Miscellaneous'); });

    const catGroups = new Map<string, any[]>();
    graphData.nodes.forEach((n: any) => {
      const cat = catMap.get(n.id) || 'Miscellaneous';
      if (!catGroups.has(cat)) catGroups.set(cat, []);
      catGroups.get(cat)!.push(n);
    });

    const sortedCats = Array.from(catGroups.entries())
      .sort((a, b) => b[1].length - a[1].length);

    const nodeCategory = new Map<string, string>();
    graphData.nodes.forEach((n: any) => {
      nodeCategory.set(n.id, catMap.get(n.id) || 'Miscellaneous');
    });

    const CATEGORY_RADIUS = 200;
    const LEAF_RADIUS = 170;
    const nodes: MindNode[] = [];
    const edges: MindEdge[] = [];
    const nodeMap = new Map<string, MindNode>();

    // Root node
    const root: MindNode = {
      id: '__root__', name: 'Knowledge Base', type: 'root',
      x: 0, y: 0, radius: 40, color: BRANCH_COLORS[0],
      isCategory: false, isExpanded: true, degree: 0, childIds: [],
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
        isCategory: true, isExpanded, degree: catNodes.length, childIds: [],
      };
      nodes.push(catNode);
      nodeMap.set(catNode.id, catNode);
      root.childIds.push(catNode.id);
      edges.push({ fromId: root.id, toId: catNode.id, color: catColor, isCrossBranch: false });

      if (isExpanded) {
        const leafCount = catNodes.length;
        const arcSpread = Math.min(Math.PI * 0.8, leafCount * 0.18);
        const startAngle = angle - arcSpread / 2;
        catNodes.forEach((n, li) => {
          const leafAngle = leafCount === 1 ? angle : startAngle + (li / (leafCount - 1)) * arcSpread;
          const leafNode: MindNode = {
            id: n.id, name: n.name || n.id.replace(/_/g, ' '), type: n.type || 'concept',
            x: catNode.x + Math.cos(leafAngle) * LEAF_RADIUS,
            y: catNode.y + Math.sin(leafAngle) * LEAF_RADIUS,
            radius: n.is_hub ? 9 : 6, color: catColor,
            isCategory: false, isExpanded: false,
            degree: n.degree || 0, is_hub: n.is_hub, summary: n.summary, childIds: [],
          };
          nodes.push(leafNode);
          nodeMap.set(leafNode.id, leafNode);
          catNode.childIds.push(leafNode.id);
          edges.push({ fromId: catNode.id, toId: leafNode.id, color: catColor, isCrossBranch: false });
        });
      }
    });

    // Cross-branch edges
    graphData.links.forEach((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      const sCat = nodeCategory.get(s);
      const tCat = nodeCategory.get(t);
      if (sCat && tCat && sCat !== tCat && nodeMap.has(s) && nodeMap.has(t)) {
        edges.push({ fromId: s, toId: t, color: 'rgba(128,128,128,0.3)', isCrossBranch: true });
      }
    });

    return { nodes, edges, nodeMap, categories: sortedCats.map(([c]) => c) };
  }, [graphData, wikiPages, expandedBranches]);

  const toggleBranch = useCallback((cat: string) => {
    setExpandedBranches(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  }, []);

  /* ─── Canvas Rendering ────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const cs = getComputedStyle(document.documentElement);
    const bgColor = cs.getPropertyValue('--surface-1').trim() || '#1b1b1f';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const ox = scrollOffset.x + dimensions.width / 2;
    const oy = scrollOffset.y + dimensions.height / 2;

    // Draw edges
    mindMap.edges.forEach(edge => {
      const from = mindMap.nodeMap.get(edge.fromId);
      const to = mindMap.nodeMap.get(edge.toId);
      if (!from || !to) return;
      const fx = from.x + ox, fy = from.y + oy;
      const tx = to.x + ox, ty = to.y + oy;

      ctx.beginPath();
      if (edge.isCrossBranch) {
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 1;
        ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Smooth bezier
        const mx = (fx + tx) / 2, my = (fy + ty) / 2;
        const dx = tx - fx, dy = ty - fy;
        const cpx = mx - dy * 0.08, cpy = my + dx * 0.08;
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(cpx, cpy, tx, ty);
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = from.isCategory ? 3 : 2;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });

    // Draw nodes
    mindMap.nodes.forEach(node => {
      const nx = node.x + ox, ny = node.y + oy;
      if (nx < -100 || nx > dimensions.width + 100 || ny < -100 || ny > dimensions.height + 100) return;

      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const isSearchMatch = searchTerm && node.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (node.type === 'root') {
        // Root: large circle with gradient
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, node.radius);
        grad.addColorStop(0, BRANCH_COLORS[0]);
        grad.addColorStop(1, 'rgba(99,102,241,0.3)');
        ctx.beginPath();
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = BRANCH_COLORS[0];
        ctx.lineWidth = 2;
        ctx.stroke();

        // Root label
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = cs.getPropertyValue('--text-primary').trim() || '#e2e8f0';
        ctx.fillText('Knowledge', nx, ny - 3);
        ctx.fillText('Base', nx, ny + 11);
        return;
      }

      if (node.isCategory) {
        // Category: pill shape
        const label = node.name.length > 16 ? node.name.slice(0, 14) + '…' : node.name;
        ctx.font = 'bold 11px Inter, sans-serif';
        const tw = ctx.measureText(label).width;
        const pw = tw + 28;
        const ph = 28;
        const px = nx - pw / 2;
        const py = ny - ph / 2;

        // Pill background
        ctx.beginPath();
        const r = ph / 2;
        ctx.moveTo(px + r, py);
        ctx.lineTo(px + pw - r, py);
        ctx.quadraticCurveTo(px + pw, py, px + pw, py + r);
        ctx.lineTo(px + pw, py + ph - r);
        ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
        ctx.lineTo(px + r, py + ph);
        ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
        ctx.lineTo(px, py + r);
        ctx.quadraticCurveTo(px, py, px + r, py);
        ctx.closePath();

        ctx.fillStyle = node.isExpanded ? node.color + '22' : (cs.getPropertyValue('--bg-600').trim() || '#1e1e2e');
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Expand/collapse indicator
        const indicatorX = px + pw - 14;
        const indicatorY = ny;
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = node.color;
        ctx.fillText(node.isExpanded ? '−' : '+', indicatorX, indicatorY + 4);

        // Label
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = node.color;
        ctx.fillText(label, nx - 4, ny + 4);

        // Count badge
        if (node.degree > 0) {
          const badgeX = nx + pw / 2 + 6;
          const badgeY = ny - ph / 2 + 2;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY + 6, 8, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
          ctx.font = 'bold 8px Inter, sans-serif';
          ctx.fillStyle = '#fff';
          ctx.fillText(String(node.degree), badgeX, badgeY + 9);
        }

        // Hover/select glow
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(nx, ny, pw / 2 + 8, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        return;
      }

      // Leaf node: circle
      const r = node.radius;
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#fff' : node.color;
      ctx.fill();

      if (node.type === 'ghost') {
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.arc(nx, ny, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(128,128,128,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hover/select glow
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Search highlight
      if (isSearchMatch) {
        ctx.beginPath();
        ctx.arc(nx, ny, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label (always show for leaf nodes when branch is expanded)
      const label = node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name;
      ctx.font = `${isSelected || node.is_hub ? 'bold' : 'normal'} 10px Inter, sans-serif`;
      ctx.textAlign = 'center';
      const labelY = ny - r - 6;
      ctx.fillStyle = cs.getPropertyValue('--bg-900').trim() || '#0d0f14';
      ctx.fillText(label, nx + 1, labelY + 1);
      ctx.fillStyle = isSelected ? '#fff' : (cs.getPropertyValue('--text-primary').trim() || '#e2e8f0');
      ctx.fillText(label, nx, labelY);
    });

  }, [dimensions, scrollOffset, mindMap, selectedNode, hoveredNode, searchTerm]);

  /* ─── Canvas Interaction ───────────────────────────────────── */
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - scrollOffset.x - dimensions.width / 2;
    const my = e.clientY - rect.top - scrollOffset.y - dimensions.height / 2;

    let clicked: MindNode | null = null;
    let minDist = 30;
    for (const n of mindMap.nodes) {
      if (n.type === 'root') continue;
      const d = Math.hypot(n.x - mx, n.y - my);
      if (d < minDist) { minDist = d; clicked = n; }
    }

    if (clicked) {
      if (clicked.isCategory) {
        const catName = clicked.id.replace('__cat__', '');
        toggleBranch(catName);
      } else {
        const node = graphData.nodes.find((n: any) => n.id === clicked.id);
        if (node) {
          setSelectedNode(node.id);
          setDetailNode(node);
          setActiveTab('overview');
          setShowMentions(false);
          setShowRelated(false);
          setHubSynthesis(null);
          onNodeClick?.(node.id);
        }
      }
    } else {
      setSelectedNode(null);
      setDetailNode(null);
    }
  }, [scrollOffset, dimensions, mindMap, graphData, onNodeClick, toggleBranch]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setScrollOffset(prev => ({
        x: prev.x + e.clientX - dragStart.x,
        y: prev.y + e.clientY - dragStart.y,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - scrollOffset.x - dimensions.width / 2;
    const my = e.clientY - rect.top - scrollOffset.y - dimensions.height / 2;

    let found: string | null = null;
    let minDist = 30;
    mindMap.nodes.forEach(n => {
      if (n.type === 'root') return;
      const d = Math.hypot(n.x - mx, n.y - my);
      if (d < minDist) { minDist = d; found = n.id; }
    });
    setHoveredNode(found);
    if (canvas) canvas.style.cursor = found ? 'pointer' : 'grab';
  }, [isDragging, dragStart, scrollOffset, dimensions, mindMap]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - scrollOffset.x - dimensions.width / 2;
    const my = e.clientY - rect.top - scrollOffset.y - dimensions.height / 2;
    let onNode = false;
    mindMap.nodes.forEach(n => {
      if (Math.hypot(n.x - mx, n.y - my) < 30) onNode = true;
    });
    if (!onNode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [scrollOffset, dimensions, mindMap]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScrollOffset(prev => ({
      x: prev.x - e.deltaX * 0.5,
      y: prev.y - e.deltaY * 0.5,
    }));
  }, []);


  const closeDetail = () => { 
    setDetailNode(null); 
    setSelectedNode(null); 
  };

  const handleGraphChat = async () => {
    if (!question.trim() || !detailNode) return;
    await handleChat(detailNode.id);
  };

  const handleSynthesizeHub = async () => {
    if (!detailNode) return;
    setSynthesisLoading(true);
    try {
      const res = await axios.get(`${API}/synthesize_hub?hub=${encodeURIComponent(detailNode.id)}`);
      setHubSynthesis(res.data.synthesis);
    } catch {
      setHubSynthesis('Failed to synthesize hub relationships.');
    } finally {
      setSynthesisLoading(false);
    }
  };


  /* ─── Derived data ────────────────────────────────────────── */
  const sources = useMemo(() => {
    if (!detailNode) return [];
    const name = (detailNode.name || detailNode.id).toLowerCase();
    return wikiPages.filter(p => p.title.toLowerCase().includes(name) || (p.description && p.description.toLowerCase().includes(name))).slice(0, 12);
  }, [detailNode, wikiPages]);

  const related = useMemo(() => {
    if (!detailNode) return [];
    const neighbors = neighborMap.get(detailNode.id);
    if (!neighbors) return [];
    return Array.from(neighbors).map(id => graphData.nodes.find((n: any) => n.id === id)).filter(Boolean).slice(0, 16);
  }, [detailNode, neighborMap, graphData]);

  const isHubNode = useCallback((node: any) => (node.degree || 0) >= 3 || node.is_hub, []);


  const canvasWidth = detailNode ? Math.max(dimensions.width - panelWidth - 6, 350) : dimensions.width;

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full overflow-hidden"
      style={{ minHeight: 600, background: `radial-gradient(ellipse at 40% 50%, var(--bg-800) 0%, var(--bg-900) 100%)` }}
    >
      {/* ── Mind Map Canvas ───────────────────────────────────────── */}
      <div
        className="relative"
        style={{ width: canvasWidth, flexShrink: 0 }}
      >
        {/* Floating toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start gap-4 pointer-events-none">
          <div className="pointer-events-auto bg-surface-2 rounded-md px-4 py-3 border border-border-subtle shadow-sm flex flex-col gap-1">
            <p className="text-sm font-semibold text-text-primary">Knowledge Map</p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-text-muted" />
              </span>
              <p className="text-[10px] uppercase tracking-widest font-medium text-text-muted">{mindMap.categories.length} topics · {graphData.nodes.length} nodes</p>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-2 bg-surface-2 rounded-md px-3 py-2 border border-border-subtle shadow-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs outline-none w-40 text-text-primary placeholder:text-text-muted"
              placeholder="Search topics…"
            />
            <button onClick={() => fetchGraphData()} className="text-[10px] py-1 px-2 rounded font-medium bg-surface-3 text-text-secondary hover:text-text-primary transition-colors border border-border-subtle">Refresh</button>
          </div>
        </div>

        {/* Branch Legend */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto bg-surface-2 rounded-md px-3 py-2 border border-border-subtle shadow-sm max-w-[200px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-text-muted">Topics</p>
          <div className="flex flex-col gap-1.5">
            {mindMap.categories.map((cat, idx) => {
              const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
              const isExpanded = expandedBranches.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleBranch(cat)}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color, opacity: isExpanded ? 1 : 0.4 }} />
                  <span className="text-[10px] font-semibold truncate" style={{ color: isExpanded ? color : 'var(--text-muted)' }}>{cat}</span>
                  <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>{isExpanded ? '−' : '+'}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[8px] mt-2 pt-2" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>Click a topic to expand · Drag to pan</p>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth, height: dimensions.height, display: 'block' }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
        />
      </div>

      {/* ── Resize handle ──────────────────────────────────────── */}
      {detailNode && (
        <div
          onMouseDown={startResizing}
          className="w-1.5 flex-shrink-0 cursor-col-resize z-30 flex items-center justify-center group"
          style={{ background: isResizing ? 'var(--accent-glow)' : 'transparent' }}
        >
          <div className="w-0.5 h-12 rounded-full transition-colors" style={{ background: 'var(--border)' }} />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SIDE PANEL                                                  */}
      {/* ─────────────────────────────────────────────────────────── */}
      {detailNode && (
        <div
          className="flex-shrink-0 flex flex-col border-l z-20 bg-surface-1 border-border-subtle"
          style={{ width: panelWidth, height: dimensions.height }}
        >

          {/* ══════════════════════════════════════════════════════ */}
          {/* ZONE B — CHAT CONTENT (scrollable, flex-1)             */}
          {/* ══════════════════════════════════════════════════════ */}
            {/* HEADER / CLEAN KNOWLEDGE BAR                  */}
            {/* Removed:                                      */}
            {/* - Stats pills (Links / Sources / Related)     */}
            {/* - Overview / Chat toggle buttons              */}
            {/* - Extra dashboard complexity                  */}
            {/* Keeps only: title + node type + close         */}
            {/* ───────────────────────────────────────────── */}

            <div className="graph-chat">

              {/* HEADER */}
              <div className="graph-chat-header">

                <div className="graph-chat-context">
                  <div className="graph-chat-avatar">
                    {(detailNode.name || detailNode.id || 'N')
                      .replace(/_/g, ' ')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="graph-chat-context-text">

                    {/* Node Type */}
                    <div className="graph-chat-subtitle">
                      {detailNode.type === 'ghost'
                        ? 'Uncharted Topic'
                        : isHubNode(detailNode)
                        ? 'Knowledge Hub'
                        : 'Knowledge Node'}
                    </div>

                    {/* Node Title */}
                    <div className="graph-chat-title">
                      {(detailNode.name || detailNode.id).replace(/_/g, ' ')}
                    </div>

                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={closeDetail}
                  className="graph-message-action"
                  aria-label="Close"
                >
                  ✕
                </button>

              </div>


              {/* ───────────────────────────────────────────── */}
              {/* MAIN KNOWLEDGE + CHAT SURFACE                */}
              {/* ───────────────────────────────────────────── */}
              <div className="graph-chat-messages">

                {/* NODE SUMMARY */}
                <div className="graph-message-row ai">
                  <div className="graph-message ai">

                    <h3>Knowledge Surface</h3>

                    {(hubSynthesis || detailNode.summary) ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {hubSynthesis || detailNode.summary}
                      </ReactMarkdown>
                    ) : (
                      <p>
                        This node currently has no synthesized summary.
                        Ask questions below to explore its meaning,
                        connected concepts, or generate deeper context.
                      </p>
                    )}

                    {/* Actions */}
                    <div className="graph-chips">

                      <Link
                        href={`/dashboard/markdown?page=${encodeURIComponent(detailNode.id)}`}
                        className="graph-chip"
                      >
                        Open Wiki Note
                      </Link>

                      {isHubNode(detailNode) && !hubSynthesis && (
                        <button
                          className="graph-chip"
                          onClick={handleSynthesizeHub}
                          disabled={synthesisLoading}
                        >
                          {synthesisLoading ? 'Synthesizing...' : 'Synthesize Knowledge'}
                        </button>
                      )}

                    </div>

                  </div>
                </div>


                {/* EMPTY STATE */}
                {chatLog.length === 0 && (
                  <div className="graph-chat-empty">

                    <div className="graph-chat-empty-icon">
                      <ChatIcon size={30} className="text-accent" />
                    </div>

                    <div className="graph-chat-empty-title">
                      Ask This Node Anything
                    </div>

                    <div className="graph-chat-empty-text">
                      Explore summaries, relationships, dependencies,
                      reasoning chains, and connected knowledge.
                    </div>

                    {/* Starter prompts */}
                    <div className="graph-chips" style={{ marginTop: 20 }}>
                      {[
                        `Summarize ${(detailNode.name || '').replace(/_/g, ' ')}`,
                        'Explain this deeply',
                        'What does this connect to?',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          className="graph-chip"
                          onClick={() => setQuestion(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                  </div>
                )}


                {/* CHAT HISTORY */}
                {chatLog.map((msg, i) => (
                  <div
                    key={i}
                    className={`graph-message-row ${msg.role}`}
                  >
                    <div className={`graph-message ${msg.role}`}>

                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>

                    </div>
                  </div>
                ))}


                {/* AI LOADING */}
                {chatLoading && (
                  <div className="graph-message-row ai">
                    <div className="graph-message ai">
                      <div className="graph-typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />

              </div>


              {/* ───────────────────────────────────────────── */}
              {/* INPUT BAR                                     */}
              {/* ───────────────────────────────────────────── */}
              <div className="graph-chat-input-container">

                <div className="graph-chat-input-box">

                  <textarea
                    className="graph-chat-input"
                    placeholder={`Ask about ${(detailNode.name || detailNode.id).replace(/_/g, ' ')}...`}
                    value={question}
                    rows={1}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChat(detailNode.id);
                      }
                    }}
                  />

                  <button
                    className="graph-chat-send"
                    onClick={() => handleChat(detailNode.id)}
                    disabled={chatLoading || !question.trim()}
                  >
                    {chatLoading ? (
                      <Spinner />
                    ) : (
                      <>
                        Ask
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </>
                    )}
                  </button>

                </div>

                <div className="graph-chat-breadcrumb">
                  Wiki Node → {(detailNode.name || detailNode.id).replace(/_/g, ' ')}
                </div>

              </div>

            </div>
        </div>
      )}
    </div>
  );
}
