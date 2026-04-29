import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamGraphNode } from '@/types/team';
import './TeamGraph.css';

export const TeamGraph = () => {
  const { currentTeam } = useWorkspace();
  const [nodes, setNodes] = useState<TeamGraphNode[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<TeamGraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!currentTeam) return;
    loadGraph();
  }, [currentTeam]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredNodes(nodes);
    } else {
      setFilteredNodes(nodes.filter(n => n.type === filter));
    }
  }, [nodes, filter]);

  const loadGraph = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.getTeamGraph(currentTeam.id);
      setNodes(data);
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'page': return '📄';
      case 'member': return '👤';
      case 'file': return '📎';
      case 'decision': return '⚖️';
      case 'task': return '✅';
      case 'conflict': return '⚠️';
      default: return '🔵';
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'page': return '#3B82F6';
      case 'member': return '#10B981';
      case 'file': return '#F59E0B';
      case 'decision': return '#8B5CF6';
      case 'task': return '#EC4899';
      case 'conflict': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (!currentTeam) return <div className="team-graph-empty">No team selected</div>;

  return (
    <div className="team-graph">
      <div className="graph-header">
        <h2>Team Graph</h2>
        <div className="graph-actions">
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Nodes</option>
            <option value="page">Pages</option>
            <option value="member">Members</option>
            <option value="file">Files</option>
            <option value="decision">Decisions</option>
            <option value="task">Tasks</option>
            <option value="conflict">Conflicts</option>
          </select>
          <button className="refresh-btn" onClick={loadGraph}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading team graph...</div>
      ) : (
        <div className="graph-content">
          <div className="graph-stats">
            <div className="stat-item">
              <span className="stat-value">{nodes.length}</span>
              <span className="stat-label">Total Nodes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{nodes.filter(n => n.type === 'page').length}</span>
              <span className="stat-label">Pages</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{nodes.filter(n => n.type === 'decision').length}</span>
              <span className="stat-label">Decisions</span>
            </div>
          </div>

          <div className="nodes-grid">
            {filteredNodes.map(node => (
              <div
                key={node.id}
                className="graph-node"
                style={{ borderLeft: `3px solid ${getNodeColor(node.type)}` }}
              >
                <div className="node-header">
                  <span className="node-icon">{getNodeIcon(node.type)}</span>
                  <h4 className="node-label">{node.label}</h4>
                  <span className="node-type">{node.type}</span>
                </div>
                {node.metadata && (
                  <div className="node-metadata">
                    {JSON.stringify(node.metadata).substring(0, 100)}
                    {JSON.stringify(node.metadata).length > 100 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredNodes.length === 0 && (
            <div className="empty-state">
              <p>No graph nodes found. Add nodes to build your team knowledge map.</p>
            </div>
          )}

          <div className="graph-visualization-placeholder">
            <p>📊 Full interactive graph visualization coming soon</p>
            <p className="subtitle">Will show relationships between all team nodes</p>
          </div>
        </div>
      )}
    </div>
  );
};