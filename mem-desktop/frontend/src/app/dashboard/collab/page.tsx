'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWiki } from '@/context/WikiContext';
import { Spinner, TimelineIcon } from '@/components/Icons';
import axios from 'axios';

const API = 'http://localhost:8000/api';

const ROLE_META: Record<string, { color: string; bg: string; desc: string }> = {
  admins:       { color: '#f87171', bg: 'rgba(239,68,68,0.12)',     desc: 'Full access — manage pages, settings, and team roles.' },
  editors:      { color: '#c4b5fd', bg: 'rgba(108,99,255,0.12)',    desc: 'Can create and edit all wiki pages.' },
  contributors: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)',    desc: 'Can propose changes that require editorial review.' },
  viewers:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',   desc: 'Read-only access to the knowledge base.' },
};

export default function CollabPage() {
  const { 
    hubMode, setHubMode, remoteUrl, setRemoteUrl, 
    syncStatus, handleSync, loading, conflicts, setMergeModalOpen
  } = useWiki();

  const [team, setTeam] = useState<Record<string, string[]>>({
    admins: [], editors: [], contributors: [], viewers: []
  });
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamSaving, setTeamSaving] = useState(false);

  // Edit modal state
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const res = await axios.get(`${API}/team`);
      setTeam(res.data);
    } catch { /* ignore */ }
    finally { setTeamLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const openEdit = (role: string) => {
    setEditingRole(role);
    setEditValue((team[role] || []).join(', '));
  };

  const closeEdit = () => {
    setEditingRole(null);
    setEditValue('');
  };

  const saveRole = async () => {
    if (!editingRole) return;
    setTeamSaving(true);
    const members = editValue.split(',').map(m => m.trim()).filter(Boolean);
    const updated = { ...team, [editingRole]: members };
    try {
      await axios.post(`${API}/team`, updated);
      setTeam(updated);
      closeEdit();
    } catch {
      alert('Failed to save team changes.');
    } finally {
      setTeamSaving(false);
    }
  };

  return (
    <section className="panel" id="panel-collab">
      <h1 className="panel-title">Collaboration</h1>
      <p className="panel-sub">Share your knowledge base directly with your team.</p>

      <div className="setup-grid">
        <div className={`setup-card ${hubMode ? 'active' : ''}`}>
          <div className="setup-icon">🏠</div>
          <h2 className="text-xl font-bold">Host Hub</h2>
          <p className="text-sm text-secondary">Make this Mem instance the primary server for your team.</p>
          <button className={`btn-${hubMode ? 'success' : 'primary'}`} onClick={() => setHubMode(!hubMode)}>
            {hubMode ? 'Hub is ONLINE' : 'Enable Hub Mode'}
          </button>
          {hubMode && (
            <div className="mt-2 p-2 bg-bg-700 rounded border border-border">
              <p className="text-xs text-muted mb-1">YOUR HUB URL:</p>
              <code className="text-xs text-accent">http://localhost:8000/git/wiki.git</code>
            </div>
          )}
        </div>

        <div className={`setup-card ${!hubMode && remoteUrl ? 'active' : ''}`}>
          <div className="setup-icon">🤝</div>
          <h2 className="text-xl font-bold">Join Hub</h2>
          <p className="text-sm text-secondary">Sync with another team member's hub.</p>
          <input 
            className="text-input" 
            placeholder="http://192.168.1.5:8000/git/wiki.git"
            value={remoteUrl}
            onChange={e => setRemoteUrl(e.target.value)}
          />
          <button className="btn-primary" onClick={() => alert('Remote URL updated.')}>Connect to Hub</button>
        </div>
      </div>

      <div className="card mt-6">
        <div className="flex justify-between items-center p-8">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
              syncStatus?.status === 'synced' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
              syncStatus?.status === 'behind' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
              syncStatus?.status === 'ahead' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
              'bg-white/5 border-white/10 text-muted'
            }`}>
              <TimelineIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-black text-white">Synchronization</h2>
                {syncStatus?.branch && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-muted">
                    {syncStatus.branch}
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary font-medium">
                {syncStatus?.status === 'synced' && 'Knowledge base is perfectly in sync with the hub.'}
                {syncStatus?.status === 'behind' && `Hub is ahead by ${syncStatus.behind_by} conceptual update${syncStatus.behind_by > 1 ? 's' : ''}.`}
                {syncStatus?.status === 'ahead' && `You have ${syncStatus.ahead_by} local update${syncStatus.ahead_by > 1 ? 's' : ''} to push.`}
                {syncStatus?.status === 'diverged' && 'Local and Hub have diverged. Manual merge required.'}
                {!syncStatus && 'Analyzing link to remote hub...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {syncStatus?.status === 'behind' && (
              <div className="text-right mr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Update Available</p>
                <p className="text-[11px] text-muted">{syncStatus.behind_by} new commits</p>
              </div>
            )}
            <button 
              className={`btn-${syncStatus?.status === 'behind' ? 'success' : 'primary'} flex items-center gap-3 px-8 py-3`} 
              onClick={handleSync} 
              disabled={loading}
            >
              {loading ? <Spinner /> : (
                <>
                  <span className="font-black uppercase tracking-widest text-[11px]">{syncStatus?.status === 'behind' ? 'Pull Updates' : 'Sync Hub'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M21 2v6h-6M3 22v-6h6M21 2c-1.8-1.8-4.3-3-7-3C8.5-1 4.5 2.5 3 7M3 22c1.8 1.8 4.3 3 7 3 5.5 0 9.5-3.5 11-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
        
        {conflicts.length > 0 && (
          <div className="p-3 bg-red-bg border border-red rounded mt-2 flex justify-between items-center">
            <p className="text-sm font-bold text-red">⚠️ {conflicts.length} UNRESOLVED CONFLICTS</p>
            <button className="btn-primary py-1 px-3 text-xs" onClick={() => setMergeModalOpen(true)}>Open Merge Tool</button>
          </div>
        )}
      </div>

      {/* ──────────────────── Team Roles ──────────────────── */}
      <div className="card mt-6" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex justify-between items-center px-12 py-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Team Roles</h2>
            <p className="panel-sub mt-0.5" style={{ marginLeft: '4px' }}>Manage access levels for each team member.</p>
          </div>
          <button className="btn-ghost text-xs py-1.5 px-3" onClick={fetchTeam}>↻ Refresh</button>
        </div>

        {teamLoading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Spinner />
            <span className="text-muted text-sm">Loading team…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {Object.entries(ROLE_META).map(([role, meta]) => {
              const members: string[] = team[role] || [];
              return (
                <div
                  key={role}
                  className="flex items-start justify-between group hover:bg-white/2 transition-colors"
                  style={{ padding: '28px 48px', borderBottom: '1px solid var(--border)' }}
                >
                  <div className="flex-1 min-w-0">
                    {/* Role badge + description */}
                    <div className="flex items-center gap-3" style={{ marginBottom: '12px' }}>
                      <span
                        className="text-[10px] font-black uppercase tracking-widest rounded-full border"
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          borderColor: `${meta.color}30`,
                          padding: '4px 12px'
                        }}
                      >
                        {role}
                      </span>
                      <span className="text-xs text-muted">{meta.desc}</span>
                    </div>

                    {/* Members */}
                    <div className="flex flex-wrap" style={{ gap: '8px', marginTop: '8px' }}>
                      {members.length === 0 ? (
                        <span className="text-xs text-muted italic">No members assigned.</span>
                      ) : (
                        members.map(m => (
                          <span
                            key={m}
                            className="text-xs font-bold rounded-xl border border-white/10"
                            style={{
                              background: meta.bg,
                              color: meta.color,
                              padding: '6px 14px'
                            }}
                          >
                            {m}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Edit button — always visible, not opacity-0 */}
                  <button
                    onClick={() => openEdit(role)}
                    className="flex-shrink-0 font-black uppercase tracking-widest border border-border hover:border-accent/60 text-muted hover:text-white transition-all hover:bg-white/5 rounded-xl"
                    style={{
                      marginLeft: '24px',
                      marginTop: '2px',
                      padding: '10px 22px',
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────── Edit Modal via Portal ──────────────────── */}
      {editingRole && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-border flex flex-col overflow-hidden"
            style={{ background: 'var(--bg-800)', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between" style={{ padding: '32px 36px 28px', borderBottom: '1px solid var(--border)' }}>
              <div>
                {/* Role badge */}
                <span
                  className="inline-block font-black uppercase tracking-widest rounded-full border"
                  style={{
                    background: ROLE_META[editingRole].bg,
                    color: ROLE_META[editingRole].color,
                    borderColor: `${ROLE_META[editingRole].color}30`,
                    padding: '5px 14px',
                    fontSize: '10px',
                    marginBottom: '14px',
                  }}
                >
                  {editingRole}
                </span>
                <h3 className="text-2xl font-black text-white" style={{ marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  Edit Role Members
                </h3>
                <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.6 }}>
                  {ROLE_META[editingRole].desc}
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="flex-shrink-0 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-muted hover:text-white transition-all"
                style={{ width: '40px', height: '40px', marginLeft: '20px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '32px 36px' }}>
              <label
                className="block font-black uppercase text-muted"
                style={{ fontSize: '10px', letterSpacing: '0.3em', marginBottom: '14px' }}
              >
                Members (comma-separated)
              </label>
              <textarea
                className="text-input w-full resize-none font-mono"
                placeholder="e.g. Alice, Bob, charlie@example.com"
                style={{
                  borderRadius: '18px',
                  padding: '20px 22px',
                  lineHeight: 2.0,
                  fontSize: '14px',
                  minHeight: '140px',
                }}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
              />

              {/* Live Preview */}
              {editValue.trim() && (
                <div style={{ marginTop: '24px' }}>
                  <p
                    className="font-black uppercase text-muted"
                    style={{ fontSize: '10px', letterSpacing: '0.3em', marginBottom: '12px' }}
                  >
                    Preview
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {editValue.split(',').map(m => m.trim()).filter(Boolean).map(m => (
                      <span
                        key={m}
                        className="font-bold rounded-xl border border-white/10"
                        style={{
                          background: ROLE_META[editingRole].bg,
                          color: ROLE_META[editingRole].color,
                          padding: '8px 16px',
                          fontSize: '13px',
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div
              className="flex"
              style={{ gap: '12px', padding: '24px 36px 32px', borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={closeEdit}
                className="btn-ghost flex-1"
                style={{ padding: '14px', fontSize: '12px', letterSpacing: '0.1em' }}
              >
                Cancel
              </button>
              <button
                onClick={saveRole}
                disabled={teamSaving}
                className="btn-primary flex-1 justify-center"
                style={{ padding: '14px', fontSize: '12px', letterSpacing: '0.1em' }}
              >
                {teamSaving ? <><Spinner /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
