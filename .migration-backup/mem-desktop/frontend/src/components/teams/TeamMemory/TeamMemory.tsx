import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamMemory as TeamMemoryType, MemoryType } from '@/types/team';
import './TeamMemory.css';

export const TeamMemory = () => {
  const { currentTeam } = useWorkspace();
  const [memories, setMemories] = useState<TeamMemoryType[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<TeamMemoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');

  useEffect(() => {
    if (!currentTeam) return;
    loadMemories();
  }, [currentTeam]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredMemories(memories);
    } else {
      setFilteredMemories(memories.filter(m => m.memory_type === filter));
    }
  }, [memories, filter]);

  const loadMemories = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.getTeamMemory(currentTeam.id);
      setMemories(data);
    } catch (err) {
      console.error('Failed to load memory:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMemoryIcon = (type: MemoryType) => {
    switch (type) {
      case 'fact': return '📄';
      case 'discussion': return '💬';
      case 'decision': return '⚖️';
      case 'experiment': return '🧪';
      case 'contradiction': return '⚠️';
    }
  };

  const getMemoryColor = (type: MemoryType) => {
    switch (type) {
      case 'fact': return '#3B82F6';
      case 'discussion': return '#10B981';
      case 'decision': return '#8B5CF6';
      case 'experiment': return '#F59E0B';
      case 'contradiction': return '#EF4444';
    }
  };

  if (!currentTeam) return <div className="team-memory-empty">No team selected</div>;

  return (
    <div className="team-memory">
      <div className="memory-header">
        <h2>Team Memory</h2>
        <div className="memory-actions">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as MemoryType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="fact">Factual Knowledge</option>
            <option value="discussion">Discussion Memory</option>
            <option value="decision">Decision Memory</option>
            <option value="experiment">Experimental Memory</option>
            <option value="contradiction">Contradiction Memory</option>
          </select>
          <button className="refresh-btn" onClick={loadMemories}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading team memory...</div>
      ) : (
        <div className="memory-content">
          <div className="memory-stats">
            <div className="stat-item">
              <span className="stat-value">{memories.length}</span>
              <span className="stat-label">Total Memories</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {memories.filter(m => m.memory_type === 'fact').length}
              </span>
              <span className="stat-label">Facts</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {memories.filter(m => m.memory_type === 'decision').length}
              </span>
              <span className="stat-label">Decisions</span>
            </div>
          </div>

          <div className="memory-list">
            {filteredMemories.map(memory => (
              <div key={memory.id} className="memory-card">
                <div className="memory-header-row">
                  <span className="memory-icon" style={{ color: getMemoryColor(memory.memory_type) }}>
                    {getMemoryIcon(memory.memory_type)}
                  </span>
                  <span className="memory-type" style={{ background: getMemoryColor(memory.memory_type) }}>
                    {memory.memory_type}
                  </span>
                  <span className="confidence-score">
                    Confidence: {(memory.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="memory-content">
                  <pre>{JSON.stringify(memory.content, null, 2)}</pre>
                </div>
                <div className="memory-footer">
                  <span className="memory-date">
                    Created: {new Date(memory.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}

            {filteredMemories.length === 0 && (
              <div className="empty-state">
                <p>No memories found. Team memory will be populated from discussions and decisions.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};