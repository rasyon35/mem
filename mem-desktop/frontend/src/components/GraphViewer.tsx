'use client';

import { useWiki } from '@/context/WikiContext';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

import { Spinner, ChatIcon, WikiIcon } from '@/components/Icons';
import axios from 'axios';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = 'http://localhost:8000/api';
const HUB_THRESHOLD = 3;




export default function GraphViewer({ onNodeClick }: { onNodeClick?: (title: string) => void }) {
  const { graphData, fetchGraphData, wikiPages, presence, locks } = useWiki();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(true);

  /* ─── Panel state ─────────────────────────────────────────── */
  const [detailNode, setDetailNode] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [panelWidth, setPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [hubSynthesis, setHubSynthesis] = useState<string | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  
  // Chat state now comes from WikiContext
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

  /* ─── Graph data ──────────────────────────────────────────── */
  const hubIds = useMemo(() => {
    const s = new Set<string>();
    graphData.nodes.forEach((n: any) => { if ((n.degree || 0) >= HUB_THRESHOLD || n.is_hub) s.add(n.id); });
    return s;
  }, [graphData]);

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

  const filteredData = useMemo(() => {
    const visExp = new Set<string>();
    expandedHubs.forEach(h => { neighborMap.get(h)?.forEach(n => visExp.add(n)); });
    const nodes = graphData.nodes.filter((n: any) =>
      hubIds.has(n.id) || visExp.has(n.id) ||
      (searchTerm && n.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    let links = graphData.links.map((l: any) => ({ ...l })).filter((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });
    links.forEach((lnk: any) => {
      const s = typeof lnk.source === 'object' ? lnk.source.id : lnk.source;
      const t = typeof lnk.target === 'object' ? lnk.target.id : lnk.target;
      lnk.curvature = links.some((x: any) => {
        const xs = typeof x.source === 'object' ? x.source.id : x.source;
        const xt = typeof x.target === 'object' ? x.target.id : x.target;
        return xs === t && xt === s;
      }) ? 0.2 : 0;
    });
    return { nodes, links };
  }, [graphData, hubIds, expandedHubs, neighborMap, searchTerm]);

  const toggleHub = useCallback((id: string) => {
    setExpandedHubs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node.id);
    if (hubIds.has(node.id)) toggleHub(node.id);
    setDetailNode(node);
    setActiveTab('overview');
    setShowMentions(false);
    setShowRelated(false);
    setHubSynthesis(null); // Reset synthesis when switching nodes
    onNodeClick?.(node.id);

    // 3D fly-to-node logic
    if (is3D && graphRef.current && graphRef.current.cameraPosition) {
      const distance = 80;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, 
        node, 
        1500 
      );
    }
  }, [hubIds, toggleHub, onNodeClick, is3D]);


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

  const nodeColor = (node: any) => {
    if (selectedNode === node.id) return '#ffffff';
    if (hubIds.has(node.id)) return '#ef4444';
    if (node.is_orphan) return '#64748b';
    const t = (node.type || '').toLowerCase();
    if (t === 'ghost') return 'rgba(255,255,255,0.2)'; 
    if (t.includes('source')) return '#f59e0b';
    if (t.includes('entity')) return '#3b82f6';
    return '#10b981';
  };


  const canvasWidth = detailNode ? Math.max(dimensions.width - panelWidth - 6, 350) : dimensions.width;

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full overflow-hidden"
      style={{ minHeight: 600, background: 'radial-gradient(ellipse at 40% 50%,#12151c 0%,#0d0f14 100%)' }}
    >
      {/* ── Graph canvas ───────────────────────────────────────── */}
      <div className="relative" style={{ width: canvasWidth, flexShrink: 0 }}>
        {/* Floating toolbar */}
        <div className="absolute top-5 left-5 right-5 z-10 flex justify-between items-start gap-4 pointer-events-none">
          <div className="pointer-events-auto bg-white/5 backdrop-blur-2xl border border-white/8 rounded-2xl px-5 py-4 shadow-2xl">
            <p className="text-base font-black text-white tracking-tight">Knowledge Graph</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
              </span>
              <p className="text-[11px] text-muted uppercase tracking-widest font-bold">{filteredData.nodes.length} nodes · {filteredData.links.length} edges</p>
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-3 bg-white/5 backdrop-blur-2xl border border-white/8 rounded-2xl px-4 py-3 shadow-2xl">
            <button 
              onClick={() => setIs3D(!is3D)} 
              className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
              style={{ color: is3D ? '#a78bfa' : '#9ca3af' }}
              title="Toggle between 2D and 3D Visualization"
            >
              {is3D ? '3D Mode' : '2D Mode'}
            </button>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search nodes…"
              className="bg-transparent text-xs text-white placeholder:text-muted outline-none w-40 font-medium"
            />
            <button onClick={fetchGraphData} className="btn-primary text-[10px] py-1.5 px-3 rounded-lg font-black tracking-widest uppercase">Refresh</button>
          </div>
        </div>

        {is3D ? (
          <ForceGraph3D
            ref={graphRef}
            graphData={filteredData}
            width={canvasWidth}
            height={dimensions.height}
            nodeLabel={() => ''}
            nodeColor={nodeColor}
            nodeRelSize={6}
            linkColor={() => 'rgba(255,255,255,0.15)'}
            onNodeClick={handleNodeClick}
            nodeResolution={16}
            linkOpacity={0.3}
            backgroundColor="rgba(0,0,0,0)"
            onNodeHover={(node: any) => setHoveredNode(node ? node.id : null)}
          />
        ) : (
          <ForceGraph2D
          ref={graphRef}
          graphData={filteredData}
          width={canvasWidth}
          height={dimensions.height}
          nodeLabel={() => ''}
          nodeColor={nodeColor}
          nodeRelSize={6}
          linkColor={() => 'rgba(255,255,255,0.10)'}
          onNodeClick={handleNodeClick}
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node: any, ctx, gs) => {
            const isHub = hubIds.has(node.id);
            const isGhost = node.type === 'ghost';
            
            // Draw ghost ring
            if (isGhost) {
              ctx.beginPath();
              ctx.setLineDash([2, 2]);
              ctx.arc(node.x, node.y, (node.val || 5) + 2, 0, 2 * Math.PI, false);
              ctx.strokeStyle = 'rgba(255,255,255,0.3)';
              ctx.stroke();
              ctx.setLineDash([]);
            }

            if (!isHub && selectedNode !== node.id && hoveredNode !== node.id && gs < 1.5) return;

            const label = (node.name || node.id).replace(/_/g, ' ');
            const fs = (isHub ? 13 : 11) / gs;
            ctx.font = `${isHub ? 700 : 400} ${fs}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            const y = node.y + (node.val || 5) + 9 / gs;
            ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillText(label, node.x, y + 1);
            ctx.fillStyle = isHub ? '#fff' : 'rgba(255,255,255,0.75)'; ctx.fillText(label, node.x, y);
          }}
        />
        )}
      </div>

      {/* ── Resize handle ──────────────────────────────────────── */}
      {detailNode && (
        <div
          onMouseDown={startResizing}
          className="w-1.5 flex-shrink-0 cursor-col-resize z-30 flex items-center justify-center group"
          style={{ background: isResizing ? 'rgba(108,99,255,0.4)' : 'transparent' }}
        >
          <div className="w-0.5 h-12 rounded-full bg-white/10 group-hover:bg-accent/60 transition-colors" />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* SIDE PANEL                                                  */}
      {/* ─────────────────────────────────────────────────────────── */}
      {detailNode && (
        <div
          className="flex-shrink-0 flex flex-col bg-bg-900 border-l border-white/5 z-20"
          style={{ width: panelWidth, height: dimensions.height, boxShadow: '-32px 0 80px rgba(0,0,0,0.7)' }}
        >
          {/* Global Presence Bar */}
          <div className="flex-shrink-0 border-b border-white/5 bg-black/10 px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {Object.entries(presence).map(([hub, data]: [string, any]) => (
                  <div 
                    key={hub} 
                    className="w-6 h-6 rounded-full bg-accent/20 border border-[#111111] flex items-center justify-center text-[9px] font-black text-accent cursor-help group relative"
                  >
                    {data.user.slice(0, 2).toUpperCase()}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/95 text-white rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-2xl">
                      {data.user} is viewing <span className="text-accent">{hub}</span>
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40">
                {Object.keys(presence).length > 0 ? 'Live Explorers' : 'Synced'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${Object.keys(presence).length > 0 ? 'bg-green-500 animate-pulse' : 'bg-white/10'}`} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Hub Status: Online</span>
            </div>
          </div>
          {/* ══════════════════════════════════════════════════════ */}
          {/* ZONE A — HEADER (pinned, ~30% height)                  */}
          {/* ══════════════════════════════════════════════════════ */}
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, rgba(108,99,255,0.08) 0%, rgba(13,15,20,0.0) 100%)' }}
          >
            {/* Ambient glow */}
            <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(108,99,255,0.06)' }} />

            {/* Header content */}
            <div className="relative z-10" style={{ padding: '40px 36px 32px' }}>
              {/* Close + type badge row */}
              <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                <span
                  className="font-black uppercase tracking-[0.35em] rounded-full border border-white/10"
                  style={{
                    padding: '6px 16px',
                    fontSize: '10px',
                    background: detailNode.type === 'ghost' ? 'rgba(255,255,255,0.05)' : hubIds.has(detailNode.id) ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                    color: detailNode.type === 'ghost' ? '#94a3b8' : hubIds.has(detailNode.id) ? '#f87171' : '#34d399'
                  }}
                >
                  {detailNode.type === 'ghost' ? 'Uncharted Topic' : hubIds.has(detailNode.id) ? 'Knowledge Hub' : (detailNode.type || 'Concept')}
                </span>

                <button
                  onClick={closeDetail}
                  className="flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/8 text-muted hover:text-white transition-all"
                  style={{ width: '40px', height: '40px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <h2
                className="font-black text-white leading-tight"
                style={{ fontSize: '28px', letterSpacing: '-0.02em', marginBottom: '28px' }}
              >
                {(detailNode.name || detailNode.id).replace(/_/g, ' ')}
              </h2>

              {/* Stat pills — horizontal row, each pill has count stacked above label */}
              <div className="flex items-stretch" style={{ gap: '12px' }}>
                {[
                  { dot: '#818cf8', count: detailNode.degree || 0, label: 'Links' },
                  { dot: '#60a5fa', count: sources.length, label: 'Sources' },
                  ...(related.length > 0 ? [{ dot: '#34d399', count: related.length, label: 'Related' }] : []),
                ].map(({ dot, count, label }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center justify-center bg-white/5 border border-white/8 rounded-2xl py-3"
                  >
                    <span className="text-xl font-black text-white mb-0.5">{count}</span>
                    <div className="flex items-center gap-1.5 opacity-60">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
                      <span className="text-[9px] uppercase font-bold tracking-wider">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ghost Node Action */}
              {detailNode.type === 'ghost' && (
                <div className="mt-8">
                  <button 
                    onClick={() => {
                       // Logic to instantiate page
                       alert('LLM will now generate a baseline for this topic...');
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-accent hover:bg-accent-light text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-accent/20 group"
                  >
                    <span>Instantiate Knowledge</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-1 transition-transform">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '0 32px 32px' }}>

              <div className="flex gap-2 rounded-2xl border border-white/8" style={{ padding: '8px', background: 'rgba(255,255,255,0.04)' }}>
                {(['overview', 'chat'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 rounded-xl font-black uppercase transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                      padding: '16px 12px',
                      fontSize: '11px',
                      letterSpacing: '0.2em',
                      ...(activeTab === tab ? {
                        background: tab === 'overview'
                          ? 'linear-gradient(135deg,rgba(16,185,129,0.3),rgba(16,185,129,0.15))'
                          : 'linear-gradient(135deg,rgba(108,99,255,0.4),rgba(108,99,255,0.2))',
                        color: tab === 'overview' ? '#6ee7b7' : '#c4b5fd',
                        boxShadow: tab === 'overview'
                          ? '0 8px 24px rgba(16,185,129,0.2)'
                          : '0 8px 24px rgba(108,99,255,0.25)',
                        border: `1px solid ${tab === 'overview' ? 'rgba(16,185,129,0.3)' : 'rgba(108,99,255,0.35)'}`,
                      } : { color: 'var(--text-muted)', border: '1px solid transparent' })
                    }}
                  >
                    {tab === 'chat' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    )}
                    {tab === 'overview' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                {hubIds.has(detailNode.id) && !hubSynthesis && (
                  <div className="mb-8 p-6 rounded-2xl bg-accent/5 border border-accent/20">
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
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto border border-white/8" style={{ marginBottom: '20px' }}>
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
              <div style={{ margin: '0 32px', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

              {/* Wiki link */}
              <div style={{ padding: '24px 32px' }}>
                <Link
                  href={`/dashboard/wiki?page=${encodeURIComponent(detailNode.id)}`}
                  className="flex items-center justify-between w-full rounded-2xl bg-white/3 hover:bg-white/6 border border-white/8 hover:border-accent/40 transition-all group"
                  style={{ padding: '20px 24px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center group-hover:bg-accent/10 transition-colors flex-shrink-0">
                      <WikiIcon size={18} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-secondary group-hover:text-white transition-colors">Open in Wiki</p>
                      <p className="text-[11px] text-muted mt-0.5">View full knowledge record</p>
                    </div>
                  </div>
                  <span className="text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-xl leading-none">→</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="mx-10 border-t border-white/5" />

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
                    <span className="font-black uppercase text-muted group-hover:text-white transition-colors" style={{ fontSize: '10px', letterSpacing: '0.15em', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
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
                          href={`/dashboard/wiki?page=${s.title}`}
                          className="flex items-center rounded-2xl bg-white/3 hover:bg-blue-500/10 border border-white/5 hover:border-blue-400/40 transition-all group"
                          style={{ gap: '16px', padding: '16px 20px' }}
                        >
                          <div className="rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors" style={{ width: '40px', height: '40px' }}>
                            <WikiIcon size={16} className="text-muted group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-secondary group-hover:text-white transition-colors truncate" style={{ fontSize: '13px' }}>
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
              {sources.length > 0 && related.length > 0 && <div className="mx-10 border-t border-white/5" />}

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
                    <span className="font-black uppercase text-muted group-hover:text-white transition-colors" style={{ fontSize: '10px', letterSpacing: '0.15em', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
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
                          onClick={() => handleNodeClick(r)}
                          className="rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/8 hover:border-emerald-400/50 font-bold text-secondary hover:text-white transition-all hover:scale-105 active:scale-95"
                          style={{ padding: '10px 18px', fontSize: '12px' }}
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
                      className="rounded-3xl flex items-center justify-center border border-white/8"
                      style={{ width: '72px', height: '72px', marginBottom: '28px', background: 'linear-gradient(135deg,rgba(108,99,255,0.15),rgba(108,99,255,0.05))' }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-white tracking-tight" style={{ fontSize: '18px', marginBottom: '12px' }}>
                      Knowledge Assistant
                    </h4>
                    <p className="text-secondary leading-relaxed" style={{ fontSize: '14px', maxWidth: '260px', marginBottom: '32px' }}>
                      Ask deep questions about{' '}
                      <span className="text-white font-bold underline decoration-accent/50 underline-offset-2">
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
                          className="rounded-2xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-accent/40 text-secondary hover:text-white font-medium text-left transition-all"
                          style={{ padding: '14px 18px', fontSize: '13px' }}
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
                      <div className="rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px', marginRight: '12px', marginTop: '4px' }}>
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
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
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
                    <div className="rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                      <span className="font-black text-accent" style={{ fontSize: '10px' }}>AI</span>
                    </div>
                    <div className="bg-white/4 border border-white/8" style={{ padding: '16px 20px', borderRadius: '20px 20px 20px 6px' }}>
                      <div className="typing-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input bar — anchored to bottom */}
              <div className="flex-shrink-0 border-t border-white/5" style={{ padding: '32px 36px 40px' }}>
                <div
                  className="flex items-center rounded-2xl border border-white/10 transition-all focus-within:border-accent/50"
                  style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 8px 8px 20px', gap: '8px' }}
                >
                  <input
                    className="flex-1 bg-transparent text-white placeholder:text-muted outline-none font-medium"
                    style={{ fontSize: '14px', padding: '10px 0' }}
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
