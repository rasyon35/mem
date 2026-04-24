'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWiki } from '@/context/WikiContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  IngestIcon, ChatIcon,  WikiIcon, GraphIcon,
  TimelineIcon, CollabIcon, SettingsIcon, ConflictIcon, SynthesisIcon, ResearchIcon
} from './Icons';


interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { wikiPages, contradictions, pullRequests, openPage, locks, presence, team } = useWiki();
  const { theme, toggleTheme } = useTheme();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ Knowledge: true, Insights: true, Team: true });

  const groupedPages = useMemo(() => {
    const groups: Record<string, typeof wikiPages> = {};
    wikiPages.forEach(p => {
      const cat = p.category || 'Miscellaneous';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [wikiPages]);

  const toggleCategory = (cat: string) => setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleSection = (sec: string) => setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  const navSections = [
    { key: 'Knowledge', items: [
      { title: 'Ingest', path: '/dashboard/ingest', icon: <IngestIcon /> },
      { title: 'Chat', path: '/dashboard/chat', icon: <ChatIcon /> },
      { title: 'Wiki', path: '/dashboard/wiki', icon: <WikiIcon /> },
      { title: 'Research', path: '/dashboard/research', icon: <ResearchIcon /> },
    ]},
    { key: 'Insights', items: [
      { title: 'Graph', path: '/dashboard/graph', icon: <GraphIcon /> },
      { title: 'Timeline', path: '/dashboard/timeline', icon: <TimelineIcon /> },
      { title: 'Conflicts', path: '/dashboard/contradictions', icon: <ConflictIcon />, badge: contradictions?.length },
      { title: 'Organize', path: '/dashboard/organize', icon: <SynthesisIcon /> },
    ]},
    { key: 'Team', items: [
      { title: 'Collab', path: '/dashboard/collab', icon: <CollabIcon /> },
      { title: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon /> },
    ]},
  ];

  const userRole = (() => {
    const email = 'local@user';
    if (!team) return 'admin';
    if ((team.admins || []).includes(email)) return 'admin';
    if ((team.editors || []).includes(email)) return 'editor';
    if ((team.contributors || []).includes(email)) return 'contributor';
    if ((team.viewers || []).includes(email)) return 'viewer';
    return 'admin';
  })();


  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Row + Collapse Toggle */}
      <div className="sidebar-header">
        <div className="logo overflow-hidden">
          <div className="logo-mark mr-3 flex-shrink-0">M</div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="logo-text font-outfit text-2xl tracking-tighter leading-none">MemOS</span>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] mt-1 whitespace-nowrap" style={{ color: 'var(--accent)' }}>Knowledge Engine</span>
            </motion.div>
          )}
        </div>
        <button 
          onClick={onToggle}
          className="collapse-toggle"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Nav Sections */}
      <nav className="nav px-2 flex-1 overflow-y-auto custom-scrollbar">
        {navSections.map(section => {
          const isSectionOpen = openSections[section.key] !== false;
          return (
            <div key={section.key} className="nav-section">
              {!isCollapsed && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="nav-section-header"
                >
                  <span>{section.key}</span>
                  <svg className={`w-3 h-3 transition-transform duration-200 ${isSectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {(isSectionOpen || isCollapsed) && section.items.map(item => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`nav-btn relative ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.title : ''}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="absolute inset-0 rounded-[var(--radius-md)] z-0"
                        style={{ background: 'var(--accent-glow)', border: '1px solid hsla(var(--accent-h), 85%, 55%, 0.25)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        {item.icon}
                        {item.badge ? (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center bg-danger text-[9px] font-black text-white rounded-full" style={{ boxShadow: '0 0 0 2px var(--bg-900)' }}>
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}

        {/* Wiki Pages */}
        {!isCollapsed && wikiPages.length > 0 && (
          <div className="sidebar-pages overflow-y-auto custom-scrollbar">
            {Object.entries(groupedPages).map(([category, pages]) => {
              if (pages.length === 0) return null;
              const isOpen = openCategories[category];
              return (
                <div key={category} className="mb-3">
                  <button 
                    onClick={() => toggleCategory(category)}
                    className="nav-section-header"
                  >
                    <span>{category} ({pages.length})</span>
                    <svg className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-1 border-l ml-2 pl-3" style={{ borderColor: 'var(--border)' }}>
                      {pages.map(p => (
                        <Link
                          key={p.title}
                          href={`/dashboard/wiki?page=${encodeURIComponent(p.title)}`}
                          className="text-[11px] font-bold py-1 transition-colors flex items-center gap-2"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          onClick={() => openPage(p.title)}
                        >
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${
                            locks.find((l: any) => l.page === p.title) ? 'bg-danger' : 
                            presence[p.title] ? 'bg-success animate-pulse' : ''
                          }`} style={!locks.find((l: any) => l.page === p.title) && !presence[p.title] ? { background: 'var(--bg-500)' } : {}} />
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
      </nav>

      {/* Footer: User Management + Theme Toggle */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">U</div>
          {!isCollapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Local User</span>
              <span className="sidebar-user-role">{userRole}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => toggleTheme()}
          className="sidebar-theme-btn"
          title={isCollapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : ''}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>
    </aside>
  );
}
