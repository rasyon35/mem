'use client';

import { useState } from 'react';
import { useWiki } from '@/context/WikiContext';
import { Spinner, SynthesisIcon } from '@/components/Icons';
import axios from 'axios';

const API = 'http://localhost:8000/api';

type PreviewItem = {
  title: string;
  current_category: string;
  proposed_category: string;
  selected?: boolean;
};

export default function OrganizePage() {
  const { fetchWikiPages } = useWiki();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[]>([]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/reorganize_categories`);
      const data = res.data.preview.map((item: any) => ({
        ...item,
        selected: item.current_category !== item.proposed_category
      }));
      setPreview(data);
    } catch {
      alert('Failed to fetch reorganization preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const assignments = preview
      .filter(item => item.selected)
      .map(item => ({ title: item.title, category: item.proposed_category }));

    if (assignments.length === 0) {
      alert('No changes selected to apply.');
      return;
    }

    setApplying(true);
    try {
      await axios.post(`${API}/apply_categories`, { assignments });
      alert(`Successfully updated ${assignments.length} pages.`);
      setPreview([]);
      fetchWikiPages();
    } catch {
      alert('Failed to apply category changes.');
    } finally {
      setApplying(false);
    }
  };

  const toggleSelection = (index: number) => {
    const next = [...preview];
    next[index].selected = !next[index].selected;
    setPreview(next);
  };

  return (
    <section className="panel" id="panel-organize">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="panel-title flex items-center gap-3">
            <SynthesisIcon size={28} className="text-accent" />
            Structural Intelligence
          </h1>
          <p className="panel-sub">Use AI to semantically reorganize your knowledge base categories.</p>
        </div>
        
        {!preview.length ? (
          <button 
            className="btn-primary" 
            onClick={fetchPreview} 
            disabled={loading}
          >
            {loading ? <><Spinner /> Analyzing Wiki...</> : 'Start Re-organization'}
          </button>
        ) : (
          <div className="flex gap-3">
            <button className="btn-ghost" onClick={() => setPreview([])}>Cancel</button>
            <button 
              className="btn-primary" 
              onClick={handleApply} 
              disabled={applying}
            >
              {applying ? <><Spinner /> Applying...</> : `Apply ${preview.filter(p => p.selected).length} Changes`}
            </button>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-muted">
            <div className="col-span-1">Apply</div>
            <div className="col-span-4">Page Title</div>
            <div className="col-span-3">Current Category</div>
            <div className="col-span-4">Proposed Category</div>
          </div>

          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {preview.map((item, idx) => (
              <div 
                key={item.title} 
                className={`grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/5 items-center transition-colors ${item.selected ? 'bg-accent/5' : 'hover:bg-white/2'}`}
              >
                <div className="col-span-1">
                  <input 
                    type="checkbox" 
                    checked={item.selected} 
                    onChange={() => toggleSelection(idx)}
                    className="w-4 h-4 rounded border-white/20 bg-transparent text-accent focus:ring-accent"
                  />
                </div>
                <div className="col-span-4">
                  <p className="text-sm font-bold text-white">{item.title.replace(/_/g, ' ')}</p>
                </div>
                <div className="col-span-3">
                  <span className="text-[11px] text-muted">{item.current_category}</span>
                </div>
                <div className="col-span-4 flex items-center gap-2">
                  <span className={`text-[11px] font-black px-2 py-1 rounded border ${
                    item.current_category !== item.proposed_category 
                    ? 'bg-accent/10 border-accent/30 text-accent' 
                    : 'bg-white/5 border-white/10 text-muted'
                  }`}>
                    {item.proposed_category}
                  </span>
                  {item.current_category !== item.proposed_category && (
                    <span className="text-[10px] text-accent font-black">NEW</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!preview.length && !loading && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-muted">
            <SynthesisIcon size={40} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Wiki Re-organization</h3>
          <p className="text-sm text-muted max-w-md">
            Our structural intelligence engine will analyze every page in your wiki and propose a cleaner, more logical category structure. You'll be able to review all changes before they are applied.
          </p>
        </div>
      )}
    </section>
  );
}
