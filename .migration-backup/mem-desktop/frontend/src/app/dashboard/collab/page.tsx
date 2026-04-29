'use client';

import React, { useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { TeamIcon } from '@/components/TeamIcons';
import Link from 'next/link';

export default function CollabPage() {
  const { teams, fetchTeams, loading } = useTeam();
  const router = useRouter();

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  return (
    <div className="panel">
      <header className="panel-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TeamIcon size={22} className="text-accent" />
            </div>
            <div>
              <h1 className="panel-title">Collaboration</h1>
              <p className="panel-sub">Team workspaces & shared knowledge</p>
            </div>
          </div>
          <Link href="/dashboard/teams/create" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Team
          </Link>
        </div>
      </header>

      <div className="panel-body">
        {loading && teams.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-text-muted">
            <span className="spinner mr-2" /> Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto">
              <TeamIcon size={28} className="text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">No teams yet</h3>
            <p className="text-text-secondary max-w-md mx-auto">
              Create a team to start collaborating with others in a shared knowledge workspace.
            </p>
            <Link href="/dashboard/teams/create" className="btn btn-primary">
              Create Your First Team
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-text-primary">Your Teams ({teams.length})</h3>
            {teams.map(team => (
              <div
                key={team.id}
                className="card p-5 hover:border-accent/50 transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/teams/${team.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: getTeamColor(team.name) }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{team.name}</h3>
                      <p className="text-xs text-text-muted mt-1">
                        {team.role} · {team.visibility}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/teams/${team.id}`); }}
                    className="btn btn-ghost btn-sm"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getTeamColor(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
