'use client';

import React, { useEffect, useState } from 'react';
import { useTeam } from '@/context/TeamContext';
import { useRouter, useParams } from 'next/navigation';
import { TeamIcon } from '@/components/TeamIcons';
import { Team } from '@/lib/teamApi';
import { TeamHome } from '@/components/teams/TeamHome/TeamHome';
import { TeamWiki as TeamPages } from '@/components/teams/TeamWiki/TeamWiki';
import { TeamMembers } from '@/components/teams/TeamMembers/TeamMembers';
import { TeamGraph } from '@/components/teams/TeamGraph/TeamGraph';
import { TeamChat } from '@/components/teams/TeamChat/TeamChat';
import { ConflictResolution as TeamConflicts } from '@/components/teams/ConflictResolution/ConflictResolution';
import { TeamNotifications } from '@/components/teams/TeamNotifications/TeamNotifications';

function getTeamColor(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'pages', label: 'Pages' },
  { key: 'members', label: 'Members' },
  { key: 'graph', label: 'Graph' },
  { key: 'chat', label: 'Chat' },
  { key: 'conflicts', label: 'Conflicts' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'settings', label: 'Settings' },
];

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const { teams, currentTeam, setCurrentTeam, teamHome, teamPages, teamMembers,
          loading, fetchTeamHome, fetchTeamPages, fetchTeamMembers, fetchTeams } = useTeam();
  const [activeTab, setActiveTab] = useState('home');
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    const t = teams.find(t => t.id === teamId) || null;
    setTeam(t);
    if (t) {
      setCurrentTeam(t);
      fetchTeamHome(teamId);
      fetchTeamPages(teamId);
      fetchTeamMembers(teamId);
    }
    return () => {
      // Clear current team when leaving the page
      if (!t) setCurrentTeam(null);
    };
  }, [teamId, teams, setCurrentTeam, fetchTeamHome, fetchTeamPages, fetchTeamMembers]);

  const handleRefresh = () => {
    fetchTeamPages(teamId);
    fetchTeamMembers(teamId);
    fetchTeamHome(teamId);
  };

  if (!team && loading) {
    return <div className="panel p-8 text-center text-text-muted">Loading team...</div>;
  }

  if (!team) {
    return <div className="panel p-8 text-center text-text-muted">Team not found</div>;
  }

  const color = getTeamColor(team.name);

  return (
    <div className="panel">
      {/* Team Header */}
      <header className="panel-header border-b border-border">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: color }}>
              {team.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="panel-title flex items-center gap-2">
                {team.name}
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                  {team.role}
                </span>
                {team.unread_notifications ? (
                  <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                    {team.unread_notifications}
                  </span>
                ) : null}
              </h1>
              <p className="panel-sub">
                {team.description || 'No description'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTeam(null)}
            className="btn btn-ghost btn-sm"
            title="Switch to Personal Workspace"
          >
            ← Personal
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-1 px-5 border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
            {tab.key === 'notifications' && team.unread_notifications ? (
              <span className="ml-1.5 w-4 h-4 rounded-full bg-accent text-white text-xs inline-flex items-center justify-center">
                {team.unread_notifications}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="panel-body">
        {activeTab === 'home' && <TeamHome />}
        {activeTab === 'pages' && <TeamPages />}
        {activeTab === 'members' && <TeamMembers />}
        {activeTab === 'graph' && <TeamGraph />}
        {activeTab === 'chat' && <TeamChat />}
        {activeTab === 'conflicts' && <TeamConflicts />}
        {activeTab === 'notifications' && <TeamNotifications />}
        {activeTab === 'settings' && (
          <div className="p-6 text-text-muted">Team settings coming soon.</div>
        )}
      </div>
    </div>
  );
}
