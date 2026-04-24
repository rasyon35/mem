'use client';

import { useEffect } from 'react';
import { useWiki } from '@/context/WikiContext';
import { Spinner, SynthesisIcon } from '@/components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

export default function EvolutionPage() {
  const { 
    openClawProposals, fetchOpenClawProposals, handleOpenClawProposal, 
    triggerEvolution, evolutionLoading, loading 
  } = useWiki();

  useEffect(() => {
    fetchOpenClawProposals();
  }, []);

  return (
    <section className="panel" id="panel-evolution">
      <header className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="panel-title flex items-center gap-3">
              <span className="p-2 bg-accent/10 rounded-lg text-accent">
                <SynthesisIcon />
              </span>
              OpenClaw Evolution
            </h1>
            <p className="panel-sub">The reasoning layer analyzing and improving your knowledge base.</p>
          </div>
          <button 
            className={`btn-primary flex items-center gap-2 ${evolutionLoading ? 'opacity-70 pointer-events-none' : ''}`} 
            onClick={triggerEvolution}
            disabled={evolutionLoading}
          >
            {evolutionLoading ? <Spinner /> : <SynthesisIcon />}
            {evolutionLoading ? 'Evolving...' : 'Run Evolution Cycle'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 mt-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted flex items-center gap-2">
            Pending Proposals
            <span className="px-2 py-0.5 bg-bg-700 rounded-full text-[10px]">{openClawProposals.length}</span>
          </h2>

          <AnimatePresence mode="popLayout">
            {openClawProposals.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card flex flex-col items-center justify-center py-20 text-center border-dashed"
              >
                <div className="w-16 h-16 bg-bg-800 rounded-full flex items-center justify-center mb-4 text-muted">
                  <SynthesisIcon />
                </div>
                <h3 className="text-lg font-bold text-primary">No proposals yet</h3>
                <p className="text-sm text-muted max-w-xs mx-auto">
                  Run an evolution cycle to let OpenClaw analyze your wiki for gaps and redundancies.
                </p>
              </motion.div>
            ) : (
              openClawProposals.map((proposal) => (
                <motion.div
                  key={proposal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card group hover:border-accent/30 transition-all duration-300"
                >
                  <div className="flex justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                          proposal.type === 'merge' ? 'bg-danger/20 text-danger' : 
                          proposal.type === 'gap' ? 'bg-success/20 text-success' : 
                          'bg-accent/20 text-accent'
                        }`}>
                          {proposal.type}
                        </span>
                        <span className="text-xs text-muted">{new Date(proposal.timestamp).toLocaleString()}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-accent transition-colors">{proposal.title}</h3>
                      <p className="text-sm text-muted mb-4">{proposal.description}</p>
                      
                      {proposal.type === 'merge' && (
                        <div className="flex items-center gap-2 mb-4 p-2 bg-bg-800 rounded-lg border border-border/50">
                          <span className="text-[10px] font-bold text-muted uppercase px-2">Merging:</span>
                          <span className="tag tag-concept text-[11px] font-bold">[[{proposal.data.page_a}]]</span>
                          <span className="text-muted text-xs">+</span>
                          <span className="tag tag-concept text-[11px] font-bold">[[{proposal.data.page_b}]]</span>
                        </div>
                      )}

                      {proposal.type === 'gap' && (
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-muted uppercase mb-1 block">Referenced by:</span>
                          <div className="flex flex-wrap gap-2">
                            {proposal.data.referenced_by?.map((ref: string) => (
                              <span key={ref} className="text-[11px] font-bold text-accent-light">[[{ref}]]</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button 
                        className="btn-success btn-sm w-full"
                        onClick={() => handleOpenClawProposal(proposal.id, 'apply')}
                        disabled={loading}
                      >
                        {loading ? <Spinner /> : 'Approve & Apply'}
                      </button>
                      <button 
                        className="btn-ghost btn-sm w-full"
                        onClick={() => handleOpenClawProposal(proposal.id, 'dismiss')}
                        disabled={loading}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  
                  {/* Proposed Content Preview */}
                  <div className="mt-4 p-4 bg-bg-900 rounded-lg border border-border overflow-hidden relative max-h-40 group-hover:max-h-96 transition-all duration-500">
                    <div className="absolute top-0 right-0 p-2 text-[10px] font-black uppercase text-muted bg-bg-900/80 backdrop-blur border-l border-b border-border">Preview</div>
                    <pre className="text-xs font-mono text-muted whitespace-pre-wrap">
                      {proposal.data.proposed_content}
                    </pre>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-bg-900 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity" />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx>{`
        .panel {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .panel-title {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .panel-sub {
          color: var(--text-muted);
          font-size: 1rem;
        }
        .card {
          background: hsla(var(--bg-card-h), var(--bg-card-s), var(--bg-card-l), 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 1.5rem;
        }
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--bg-600);
          border-radius: 10px;
        }
      `}</style>
    </section>
  );
}
