'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTeam } from '@/context/TeamContext';
import { TeamIcon, GlobeIcon, LockIcon } from './TeamIcons';
import { Team } from '@/lib/teamApi';

interface TeamSwitcherProps {
  isCollapsed: boolean;
}

export default function TeamSwitcher({ isCollapsed }: TeamSwitcherProps) {
  const { teams, currentTeam, setCurrentTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectTeam = (team: Team | null) => {
    setCurrentTeam(team);
    setOpen(false);
  };

  const getTeamColor = (name: string) => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`nav-btn w-full ${isCollapsed ? 'justify-center' : 'justify-between'} ${currentTeam ? 'text-accent' : ''}`}
        title={isCollapsed ? (currentTeam?.name || 'Personal') : ''}
      >
        {isCollapsed ? (
          currentTeam ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: getTeamColor(currentTeam.name), color: '#fff' }}>
              {currentTeam.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )
        ) : (
          <>
            <span className="flex items-center gap-2">
              {currentTeam ? (
                <>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: getTeamColor(currentTeam.name), color: '#fff' }}>
                    {currentTeam.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[120px]">{currentTeam.name}</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Personal</span>
                </>
              )}
            </span>
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className={`absolute ${isCollapsed ? 'left-12 top-0' : 'left-0 top-full mt-1'} w-64 bg-surface-2 border border-border rounded-lg shadow-lg z-50 py-1 animate-fade-in`}>
          <button
            onClick={() => selectTeam(null)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-3 transition-colors ${!currentTeam ? 'text-accent' : 'text-text-primary'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Personal Workspace
          </button>

          {teams.length > 0 && <div className="border-t border-border my-1" />}

          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => selectTeam(team)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-3 transition-colors ${currentTeam?.id === team.id ? 'text-accent' : 'text-text-primary'}`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: getTeamColor(team.name), color: '#fff' }}>
                {team.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate flex-1">{team.name}</span>
              {team.unread_notifications ? (
                <span className="w-4 h-4 rounded-full bg-accent text-white text-xs flex items-center justify-center flex-shrink-0">
                  {team.unread_notifications}
                </span>
              ) : null}
            </button>
          ))}

          <div className="border-t border-border my-1" />
          <button
            onClick={() => { setOpen(false); router.push('/dashboard/teams/create'); }}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-accent hover:bg-surface-3 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Team
          </button>
        </div>
      )}
    </div>
  );
}
