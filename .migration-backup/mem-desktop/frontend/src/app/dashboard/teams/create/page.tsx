'use client';

import React, { useState } from 'react';
import { useTeam } from '@/context/TeamContext';
import { useRouter } from 'next/navigation';
import { TeamIcon, GlobeIcon, LockIcon, LinkIcon } from '@/components/TeamIcons';

const CATEGORIES = [
  { value: 'startup', label: 'Startup' },
  { value: 'research', label: 'Research' },
  { value: 'study_group', label: 'Study Group' },
  { value: 'family', label: 'Family' },
  { value: 'operations', label: 'Operations' },
  { value: 'custom', label: 'Custom' },
];

const VISIBILITIES = [
  { value: 'private', label: 'Private Invite Only', icon: LockIcon },
  { value: 'link', label: 'Link Access', icon: LinkIcon },
  { value: 'discoverable', label: 'Discoverable', icon: GlobeIcon },
];

export default function CreateTeamPage() {
  const { createTeam, loading } = useTeam();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'custom',
    visibility: 'private',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Team name is required');
      return;
    }
    try {
      const team = await createTeam(form);
      router.push(`/dashboard/teams/${team.id}`);
    } catch {
      setError('Failed to create team');
    }
  };

  return (
    <div className="panel max-w-2xl mx-auto">
      <header className="panel-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <TeamIcon size={22} className="text-accent" />
          </div>
          <div>
            <h1 className="panel-title">Create Team Space</h1>
            <p className="panel-sub">Collaborative knowledge workspace</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="panel-body space-y-6">
        {/* Step 1: Identity */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">1</span>
            Team Identity
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Team Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Startup Core, Research Lab"
                className="input w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What is this team working on?"
                className="input w-full min-h-[80px] resize-y"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Category */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">2</span>
            Category
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  form.category === cat.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border hover:border-accent/50 text-text-secondary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Visibility */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">3</span>
            Visibility
          </h2>
          <div className="space-y-2">
            {VISIBILITIES.map(v => {
              const Icon = v.icon;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setForm({ ...form, visibility: v.value })}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                    form.visibility === v.value
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Icon size={18} className={form.visibility === v.value ? 'text-accent' : 'text-text-muted'} />
                  <span className={form.visibility === v.value ? 'text-accent' : 'text-text-primary'}>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-error-bg border border-danger text-error text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/teams')}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="btn btn-primary"
          >
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
}
