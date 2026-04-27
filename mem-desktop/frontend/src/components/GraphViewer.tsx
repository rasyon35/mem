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
          {/* Global Presence Bar */}
          <div className="flex-shrink-0 border-b px-4 py-2 flex items-center justify-between bg-surface-2 border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {Object.entries(presence).map(([hub, data]: [string, any]) => (
                  <div 
                    key={hub} 
                    className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-semibold cursor-help group relative bg-surface-3 border-border-subtle text-text-primary"
                  >
                    {data.user.slice(0, 2).toUpperCase()}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-surface-3 text-text-primary border border-border-subtle text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-sm">
                      {data.user} is viewing <span className="text-accent">{hub}</span>
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                {Object.keys(presence).length > 0 ? 'Live Explorers' : 'Synced'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${Object.keys(presence).length > 0 ? 'bg-success' : 'bg-text-muted opacity-50'}`} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Hub Status: Online</span>
            </div>
          </div>
          {/* ══════════════════════════════════════════════════════ */}
          {/* ZONE A — HEADER (pinned, ~30% height)                  */}
          {/* ══════════════════════════════════════════════════════ */}
          <div className="flex-shrink-0 relative overflow-hidden bg-surface-1">
            {/* Header content */}
            <div className="relative z-10 p-6">
              {/* Close + type badge row */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold uppercase tracking-widest rounded-sm border px-2 py-1 text-[10px] bg-surface-2 border-border-subtle text-text-secondary">
                  {detailNode.type === 'ghost' ? 'Uncharted Topic' : isHubNode(detailNode) ? 'Knowledge Hub' : (detailNode.type || 'Concept')}
                </span>

                <button
                  onClick={closeDetail}
                  className="flex items-center justify-center rounded-sm hover:bg-surface-3 transition-colors text-text-muted hover:text-text-primary p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <h2 className="font-semibold leading-tight text-xl mb-6 text-text-primary">
                {(detailNode.name || detailNode.id).replace(/_/g, ' ')}
              </h2>

              {/* Stat pills — horizontal row, each pill has count stacked above label */}
              <div className="flex items-stretch gap-2">
                {[
                  { dot: '#8b5cf6', count: detailNode.degree || 0, label: 'Links' },
                  { dot: '#3b82f6', count: sources.length, label: 'Sources' },
                  ...(related.length > 0 ? [{ dot: '#10b981', count: related.length, label: 'Related' }] : []),
                ].map(({ dot, count, label }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center justify-center border rounded-md py-2 bg-surface-2 border-border-subtle"
                  >
                    <span className="text-sm font-semibold mb-0.5 text-text-primary">{count}</span>
                    <div className="flex items-center gap-1.5 opacity-80">
                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                      <span className="text-[9px] uppercase font-semibold tracking-widest text-text-muted">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ghost Node Action */}
              {detailNode.type === 'ghost' && (
                <div className="mt-6">
                  <button 
                    onClick={() => {
                       // Logic to instantiate page
                       alert('LLM will now generate a baseline for this topic...');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-surface-3 hover:bg-surface-2 border border-border-strong text-text-primary py-2 rounded-md font-semibold text-sm transition-colors group"
                  >
                    <span>Instantiate Knowledge</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pb-6">
              <div className="flex gap-1 rounded-md border p-1 bg-surface-2 border-border-subtle">
                {(['overview', 'chat'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-sm font-semibold uppercase transition-colors flex items-center justify-center gap-2 py-2 text-[10px] tracking-widest ${activeTab === tab ? 'bg-surface-3 text-text-primary border border-border-strong shadow-sm' : 'text-text-muted border border-transparent hover:text-text-secondary'}`}
                  >
                    {tab === 'chat' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    )}
                    {tab === 'overview' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                    {tab}
                  </button>
                ))}
              </div>
            </div>


          {/* ══════════════════════════════════════════════════════ */}
          {/* ZONE B — MAIN CONTENT (scrollable, flex-1)             */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">

              {/* Analysis Body */}
              <div style={{ padding: '36px 32px 28px' }}>
                {isHubNode(detailNode) && !hubSynthesis && (
                  <div className="mb-8 p-6 rounded-2xl border" style={{ background: 'var(--accent-glow)', borderColor: 'hsla(var(--accent-h), 85%, 55%, 0.2)' }}>
                    <h4 className="text-sm font-black text-accent uppercase tracking-widest mb-2">Automated Synthesis</h4>
                    <p className="text-[13px] text-secondary mb-4 leading-relaxed">
                      This node is a high-density Knowledge Hub. We can synthesize its connected pages to explain the underlying logic of this cluster.
                    </p>
                    <button 
                      onClick={handleSynthesizeHub}
                      disabled={synthesisLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest"
                    >
                      {synthesisLoading ? <Spinner /> : 'Synthesize Insights'}
                    </button>
                  </div>
                )}

                {(hubSynthesis || detailNode.summary) ? (
                  <div className="prose prose-invert prose-sm max-w-none text-secondary" style={{ lineHeight: 2.1, fontSize: '15px' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{hubSynthesis || detailNode.summary}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center" style={{ padding: '40px 0' }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border" style={{ marginBottom: '20px', background: 'var(--bg-600)', borderColor: 'var(--border)' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </div>
                    <p className="text-muted text-sm font-medium">No synthesis available yet.</p>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Switch to the Chat tab to ask the AI assistant.</p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ margin: '0 32px', borderTop: `1px solid var(--border)` }} />

              {/* Wiki link */}
              <div style={{ padding: '24px 32px' }}>
                <Link
                  href={`/dashboard/markdown?page=${encodeURIComponent(detailNode.id)}`}
                  className="flex items-center justify-between w-full rounded-2xl border transition-all group"
                  style={{ padding: '20px 24px', background: 'var(--bg-600)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-500)', borderColor: 'var(--border)' }}>
                      <WikiIcon size={18} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-bold group-hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>Open in Wiki</p>
                      <p className="text-[11px] text-muted mt-0.5">View full knowledge record</p>
                    </div>
                  </div>
                  <span className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-xl leading-none">→</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="mx-10 border-t" style={{ borderColor: 'var(--border)' }} />

              {/* ── Mentions ─────────────────────────────────────── */}
              {sources.length > 0 && (
                <div style={{ padding: '24px 32px' }}>
                  <button
                    onClick={() => setShowMentions(v => !v)}
                    className="w-full flex items-center justify-between group"
                    style={{ marginBottom: showMentions ? '20px' : '0' }}
                  >
                    <div className="flex items-center" style={{ gap: '12px' }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <span className="font-black uppercase text-muted group-hover:text-white transition-colors" style={{ fontSize: '11px', letterSpacing: '0.25em' }}>
                        Source Mentions
                      </span>
                      <span className="font-black rounded-lg border border-blue-400/30 text-blue-400 bg-blue-400/10" style={{ padding: '3px 10px', fontSize: '10px' }}>
                        {sources.length}
                      </span>
                    </div>
                    <span className="font-black uppercase text-muted group-hover:text-white transition-colors" style={{ fontSize: '10px', letterSpacing: '0.15em', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      {showMentions ? '↑ Hide' : '↓ Show'}
                    </span>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ maxHeight: showMentions ? `${sources.length * 90}px` : 0, opacity: showMentions ? 1 : 0 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                      {sources.map(s => (
                        <Link
                          key={s.title}
                          href={`/dashboard/markdown?page=${encodeURIComponent(s.title)}`}
                          className="flex items-center rounded-2xl border transition-all group"
                          style={{ gap: '16px', padding: '16px 20px', background: 'var(--bg-600)', borderColor: 'var(--border)' }}
                        >
                          <div className="rounded-xl border flex items-center justify-center flex-shrink-0" style={{ width: '40px', height: '40px', background: 'var(--bg-500)', borderColor: 'var(--border)' }}>
                            <WikiIcon size={16} className="text-muted group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold group-hover:text-white transition-colors truncate" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                              {s.title.replace(/_/g, ' ')}
                            </p>
                            {s.description && (
                              <p className="text-muted truncate" style={{ fontSize: '11px', marginTop: '3px' }}>{s.description}</p>
                            )}
                          </div>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              {sources.length > 0 && related.length > 0 && <div className="mx-10 border-t" style={{ borderColor: 'var(--border)' }} />}

              {/* ── Related nodes ─────────────────────────────────── */}
              {related.length > 0 && (
                <div style={{ padding: '24px 32px' }}>
                  <button
                    onClick={() => setShowRelated(v => !v)}
                    className="w-full flex items-center justify-between group"
                    style={{ marginBottom: showRelated ? '20px' : '0' }}
                  >
                    <div className="flex items-center" style={{ gap: '12px' }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="font-black uppercase text-muted group-hover:text-white transition-colors" style={{ fontSize: '11px', letterSpacing: '0.25em' }}>
                        Connected Nodes
                      </span>
                      <span className="font-black rounded-lg border border-emerald-400/30 text-emerald-400 bg-emerald-400/10" style={{ padding: '3px 10px', fontSize: '10px' }}>
                        {related.length}
                      </span>
                    </div>
                    <span className="font-black uppercase text-muted group-hover:text-white transition-colors" style={{ fontSize: '10px', letterSpacing: '0.15em', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      {showRelated ? '↑ Hide' : '↓ Show'}
                    </span>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ maxHeight: showRelated ? '600px' : 0, opacity: showRelated ? 1 : 0 }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
                      {related.map((r: any) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedNode(r.id);
                            setDetailNode(r);
                            setActiveTab('overview');
                            setShowMentions(false);
                            setShowRelated(false);
                            setHubSynthesis(null);
                            onNodeClick?.(r.id);
                          }}
                          className="rounded-xl border font-bold transition-all hover:scale-105 active:scale-95"
                          style={{ padding: '10px 18px', fontSize: '12px', background: 'var(--bg-600)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        >
                          {r.name.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom breathing room */}
              <div className="h-16" />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* CHAT TAB                                               */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {chatLog.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center" style={{ padding: '40px 24px' }}>
                    <div
                      className="rounded-3xl flex items-center justify-center border"
                      style={{ width: '72px', height: '72px', marginBottom: '28px', background: 'var(--accent-glow)', borderColor: 'var(--border)' }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <h4 className="font-black tracking-tight" style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                      Knowledge Assistant
                    </h4>
                    <p style={{ fontSize: '14px', maxWidth: '260px', marginBottom: '32px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      Ask deep questions about{' '}
                      <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>
                        {(detailNode.name || '').replace(/_/g, ' ')}
                      </span>{' '}
                      and its relationships across the knowledge graph.
                    </p>
                    {/* Starter prompts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '340px' }}>
                      {[
                        `Summarize ${(detailNode.name || '').replace(/_/g, ' ')}`,
                        'What are its key relationships?',
                        'How does this connect to other hubs?',
                      ].map(prompt => (
                        <button
                          key={prompt}
                          onClick={() => setQuestion(prompt)}
                          className="rounded-2xl border font-medium text-left transition-all"
                          style={{ padding: '14px 18px', fontSize: '13px', background: 'var(--bg-600)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}


                {chatLog.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'ai' && (
                      <div className="rounded-xl border flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px', marginRight: '12px', marginTop: '4px', background: 'var(--accent-glow)', borderColor: 'hsla(var(--accent-h), 85%, 55%, 0.3)' }}>
                        <span className="font-black text-accent" style={{ fontSize: '10px' }}>AI</span>
                      </div>
                    )}
                    <div
                      className="prose prose-invert prose-sm max-w-none"
                      style={{
                        maxWidth: '85%',
                        padding: '16px 20px',
                        fontSize: '13.5px',
                        lineHeight: 1.75,
                        ...(msg.role === 'user' ? {
                          background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))',
                          color: '#fff',
                          borderRadius: '20px 20px 6px 20px',
                          boxShadow: '0 8px 24px rgba(108,99,255,0.25)',
                        } : {
                          background: 'var(--bg-600)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          borderRadius: '20px 20px 20px 6px',
                        })
                      }}
                    >
                      {msg.role === 'ai' && (
                        <p style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--accent)', marginBottom: '10px', opacity: 0.8 }}>
                          Mem · Knowledge Engine
                        </p>
                      )}
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="rounded-xl border flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px', background: 'var(--accent-glow)', borderColor: 'hsla(var(--accent-h), 85%, 55%, 0.3)' }}>
                      <span className="font-black text-accent" style={{ fontSize: '10px' }}>AI</span>
                    </div>
                    <div className="border" style={{ padding: '16px 20px', borderRadius: '20px 20px 20px 6px', background: 'var(--bg-600)', borderColor: 'var(--border)' }}>
                      <div className="typing-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input bar — anchored to bottom */}
              <div className="flex-shrink-0 border-t" style={{ padding: '32px 36px 40px', borderColor: 'var(--border)' }}>
                <div
                  className="flex items-center rounded-2xl border transition-all focus-within:border-accent/50"
                  style={{ background: 'var(--bg-600)', padding: '8px 8px 8px 20px', gap: '8px', borderColor: 'var(--border)' }}
                >
                  <input
                    className="flex-1 bg-transparent outline-none font-medium"
                    style={{ fontSize: '14px', padding: '10px 0', color: 'var(--text-primary)' }}
                    placeholder="Ask a question…"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat(detailNode.id)}
                  />
                  <button
                    onClick={() => handleChat(detailNode.id)}
                    disabled={chatLoading || !question.trim()}
                    className="flex items-center gap-2 rounded-xl font-black uppercase text-white transition-all hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ padding: '12px 22px', fontSize: '11px', letterSpacing: '0.12em', background: 'linear-gradient(135deg,var(--accent),var(--accent-dark))', boxShadow: '0 6px 20px rgba(108,99,255,0.3)' }}
                  >
                    {chatLoading ? <Spinner /> : (
                      <>
                        Send
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </>
                    )}
                  </button>

                </div>
                <p className="text-center text-muted" style={{ fontSize: '10px', marginTop: '12px', letterSpacing: '0.08em' }}>Enter to send · Context: {(detailNode.name || '').replace(/_/g, ' ')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
