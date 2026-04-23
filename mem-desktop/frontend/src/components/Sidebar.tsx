'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWiki } from '@/context/WikiContext';
import { 
  IngestIcon, ChatIcon,  WikiIcon, GraphIcon,
  TimelineIcon, CollabIcon, SettingsIcon, ConflictIcon, SynthesisIcon, ResearchIcon
} from './Icons';


export default function Sidebar() {
  const pathname = usePathname();
  const { wikiPages, contradictions, pullRequests, openPage, locks, presence } = useWiki();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'AGI & Cognitive': true,
    'Algorithms': true,
    'Finance': true,
    'Logic & Reasoning': true,
    'Operating Systems': true,
    'AI Tech': true,
    'Software & Systems': true,
    'Miscellaneous': true
  });

  const groupedPages = useMemo(() => {
    const groups: Record<string, typeof wikiPages> = {};
    wikiPages.forEach(p => {
      const cat = p.category || 'Miscellaneous';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [wikiPages]);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const navItems = [
    { title: 'Ingest', path: '/dashboard/ingest', icon: <IngestIcon /> },
    { title: 'Review', path: '/dashboard/review', icon: <ResearchIcon />, badge: pullRequests?.length },
    { title: 'Chat', path: '/dashboard/chat', icon: <ChatIcon /> },
    { title: 'Wiki', path: '/dashboard/wiki', icon: <WikiIcon /> },
    { title: 'Graph', path: '/dashboard/graph', icon: <GraphIcon /> },
    { title: 'Timeline', path: '/dashboard/timeline', icon: <TimelineIcon /> },
    { title: 'Conflicts', path: '/dashboard/contradictions', icon: <ConflictIcon />, badge: contradictions?.length },
    { title: 'Organize', path: '/dashboard/organize', icon: <SynthesisIcon /> },
    { title: 'Research', path: '/dashboard/research', icon: <ResearchIcon /> },
    { title: 'Collab', path: '/dashboard/collab', icon: <CollabIcon /> },
    { title: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon /> },
  ];


  return (
    <aside className="sidebar">
      <div className="logo px-4 mb-10">
        <div className="logo-mark mr-3 shadow-2xl shadow-accent/50">M</div>
        <div className="flex flex-col">
          <span className="logo-text font-outfit text-2xl tracking-tighter leading-none">MemOS</span>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-accent/60 mt-1">Knowledge Engine</span>
        </div>
      </div>

      <nav className="nav px-2">
        {navItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-btn relative ${isActive ? 'active text-white' : ''}`}
              id={`nav-${item.title.toLowerCase()}`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-accent/20 border border-accent/30 rounded-[var(--radius-md)] z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  {item.icon}
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center bg-danger text-[9px] font-black text-white rounded-full ring-2 ring-bg-900">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {wikiPages.length > 0 && (
        <div className="sidebar-pages flex-1 overflow-y-auto pr-2 mt-8 custom-scrollbar">
          {Object.entries(groupedPages).map(([category, pages]) => {
            if (pages.length === 0) return null;
            const isOpen = openCategories[category];
            return (
              <div key={category} className="mb-4">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-2 mb-2 group cursor-pointer"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted group-hover:text-white transition-colors font-outfit">
                    {category} ({pages.length})
                  </span>
                  <svg className={`w-3 h-3 text-muted/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isOpen && (
                   <div className="flex flex-col gap-1 border-l border-white/5 ml-2 pl-3">
                    {pages.map(p => (
                      <Link
                        key={p.title}
                        href={`/dashboard/wiki?page=${encodeURIComponent(p.title)}`}
                        className="text-[11px] font-bold text-muted-dark hover:text-white py-1 transition-colors flex items-center gap-2 group/link"
                        onClick={() => openPage(p.title)}
                      >
                         <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                            locks.find((l: any) => l.page === p.title) ? 'bg-danger' : 
                            presence[p.title] ? 'bg-success animate-pulse' : 'bg-white/10'
                         }`} />
                         <span className="truncate">{p.title.replace(/_/g, ' ')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
