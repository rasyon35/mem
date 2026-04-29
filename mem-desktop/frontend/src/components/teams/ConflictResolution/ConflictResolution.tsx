import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { KnowledgeConflict, ConflictStatus } from '@/types/team';
import './ConflictResolution.css';

export const ConflictResolution = () => {
  const { currentTeam } = useWorkspace();
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>([]);
  const [filteredConflicts, setFilteredConflicts] = useState<KnowledgeConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ConflictStatus | 'all'>('all');
  const [selectedConflict, setSelectedConflict] = useState<KnowledgeConflict | null>(null);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (!currentTeam) return;
    loadConflicts();
  }, [currentTeam]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredConflicts(conflicts);
    } else {
      setFilteredConflicts(conflicts.filter(c => c.status === filter));
    }
  }, [conflicts, filter]);

  const loadConflicts = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.getConflicts(currentTeam.id);
      setConflicts(data);
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict || !resolution.trim()) return;
    try {
      await teamApi.resolveConflict(currentTeam?.id || '', selectedConflict.id, resolution);
      setSelectedConflict(null);
      setResolution('');
      loadConflicts();
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    }
  };

  const getStatusColor = (status: ConflictStatus) => {
    switch (status) {
      case 'detected': return '#EF4444';
      case 'in_review': return '#F59E0B';
      case 'resolved': return '#10B981';
      case 'ignored': return '#6B7280';
    }
  };

  if (!currentTeam) return <div className="conflict-empty">No team selected</div>;

  return (
    <div className="conflict-resolution">
      <div className="conflict-header">
        <h2>Conflict Resolution</h2>
        <div className="conflict-actions">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ConflictStatus | 'all')}
          >
            <option value="all">All Statuses</option>
            <option value="detected">Detected</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>
          <button className="refresh-btn" onClick={loadConflicts}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading conflicts...</div>
      ) : (
        <div className="conflict-content">
          <div className="conflicts-list">
            {filteredConflicts.map(conflict => (
              <div
                key={conflict.id}
                className={`conflict-card ${selectedConflict?.id === conflict.id ? 'selected' : ''}`}
                onClick={() => setSelectedConflict(conflict)}
              >
                <div className="conflict-header-row">
                  <span className="conflict-id">#{conflict.id.substring(0, 8)}</span>
                  <span
                    className="conflict-status"
                    style={{ background: getStatusColor(conflict.status) }}
                  >
                    {conflict.status}
                  </span>
                </div>
                <div className="conflict-nodes">
                  <span className="node-label">Node A: {conflict.node_a}</span>
                  <span className="vs">vs</span>
                  <span className="node-label">Node B: {conflict.node_b}</span>
                </div>
                <div className="conflict-date">
                  Created: {new Date(conflict.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {filteredConflicts.length === 0 && (
              <div className="empty-state">
                <p>No conflicts found. Great job keeping knowledge consistent!</p>
              </div>
            )}
          </div>

          {selectedConflict && (
            <div className="conflict-detail">
              <h3>Conflict Details</h3>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className="value">{selectedConflict.status}</span>
              </div>
              <div className="detail-row">
                <span className="label">Node A:</span>
                <span className="value">{selectedConflict.node_a}</span>
              </div>
              <div className="detail-row">
                <span className="label">Node B:</span>
                <span className="value">{selectedConflict.node_b}</span>
              </div>
              {selectedConflict.resolution && (
                <div className="detail-row">
                  <span className="label">Resolution:</span>
                  <span className="value">{selectedConflict.resolution}</span>
                </div>
              )}
              {selectedConflict.status !== 'resolved' && selectedConflict.status !== 'ignored' && (
                <div className="resolution-section">
                  <h4>Resolve Conflict</h4>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Enter resolution..."
                    rows={4}
                  />
                  <div className="resolution-actions">
                    <button className="resolve-btn" onClick={handleResolve} disabled={!resolution.trim()}>
                      Resolve
                    </button>
                    <button className="ignore-btn" onClick={() => {
                      teamApi.resolveConflict(currentTeam?.id || '', selectedConflict.id, 'Ignored');
                      setSelectedConflict(null);
                      loadConflicts();
                    }}>
                      Ignore
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};