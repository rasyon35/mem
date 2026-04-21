'use client';

import React, { useState, useEffect } from 'react';
import { useWiki } from '@/context/WikiContext';
import { ConflictIcon, WikiIcon, Spinner } from '@/components/Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ContradictionsPage() {
  const { contradictions, fetchContradictions } = useWiki();
  const [loading, setLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState('pending');

  const handleAction = async (id: number, action: string) => {
    setLoading(id);
    try {
      const resp = await fetch(`http://localhost:8000/api/contradictions/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      if (resp.ok) {
        await fetchContradictions();
      } else {
        const err = await resp.json();
        alert(`Error: ${err.error || 'Failed to resolve'}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="h-screen w-full p-4">
      <div className="flex flex-col h-full bg-bg-950/50 border border-white/5 rounded-3xl overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-10 py-10 border-b border-white/5 bg-white/[0.01] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ConflictIcon className="text-accent" size={24} />
            <h1 className="text-3xl font-black text-white tracking-tight">Contradiction Resolver</h1>
          </div>
          <p className="text-muted text-sm font-medium">Reconcile conflicting information detected during knowledge ingestion.</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/8">
          {['pending', 'accepted', 'dismissed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
        <div className="max-w-7xl mx-auto space-y-10">
          {contradictions.filter(c => c.status === filter).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <ConflictIcon className="text-muted opacity-40" size={32} />
               </div>
               <p className="text-muted font-bold">No contradictions found in the "{filter}" bin.</p>
            </div>
          ) : (
            contradictions.filter(c => c.status === filter).map(c => (
              <div 
                key={c.id} 
                className="group relative bg-white/[0.03] border border-white/8 rounded-3xl overflow-hidden hover:bg-white/[0.05] transition-all duration-500"
              >
                {/* ID & Stats Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.01]">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                         <WikiIcon className="text-accent" size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg">{c.page.replace(/_/g, ' ')}</h3>
                        <p className="text-[11px] text-muted-dark font-bold uppercase tracking-widest mt-0.5">Source: {c.source_name}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="text-[10px] text-muted uppercase tracking-widest font-black">Confidence</p>
                         <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${c.confidence === 'high' ? 'bg-emerald-400' : c.confidence === 'medium' ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <span className="text-xs font-black text-white uppercase">{c.confidence}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Comparison Grid */}
                <div className="grid grid-cols-2 gap-1 px-8 py-8">
                   {/* Existing */}
                   <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-6">
                         <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Existing Wiki State</span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-secondary leading-relaxed flex-1">
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.existing}</ReactMarkdown>
                      </div>
                   </div>

                   {/* New */}
                   <div className="p-8 rounded-3xl bg-accent/[0.04] border border-accent/10 flex flex-col h-full relative">
                      <div className="flex items-center gap-2 mb-6">
                         <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">New Claim from Ingest</span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-white leading-relaxed flex-1">
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.new}</ReactMarkdown>
                      </div>
                      {/* Interaction Overlay if action taken? Not needed yet */}
                   </div>
                </div>

                {/* Footer Actions */}
                {filter === 'pending' && (
                  <div className="px-8 py-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                    <p className="text-[11px] text-muted-dark italic max-w-md">
                      How would you like to handle this conflict? You can keep the existing truth, favor the new information, or use AI to synthesize both.
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleAction(c.id, 'dismiss')}
                        disabled={loading === c.id}
                        className="px-6 py-4 rounded-2xl border border-white/10 text-muted hover:text-white hover:bg-white/5 transition-all font-black text-xs uppercase tracking-widest"
                      >
                        Keep Existing
                      </button>
                      <button 
                        onClick={() => handleAction(c.id, 'accept')}
                        disabled={loading === c.id}
                        className="px-6 py-4 rounded-2xl border border-white/10 text-white hover:bg-white/5 transition-all font-black text-xs uppercase tracking-widest"
                      >
                        Accept New
                      </button>
                      <button 
                        onClick={() => handleAction(c.id, 'merge')}
                        disabled={loading === c.id}
                        className="px-8 py-4 rounded-2xl bg-accent hover:bg-accent-light text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
                      >
                        {loading === c.id ? <Spinner /> : (
                          <>
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M12 2v20M2 12h20" />
                             </svg>
                             Reconcile with AI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
