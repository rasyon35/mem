import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamBranch } from '@/types/team';
import './TeamBranches.css';

export const TeamBranches = () => {
  const { currentTeam } = useWorkspace();
  const [branches, setBranches] = useState<TeamBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!currentTeam) return;
    loadBranches();
  }, [currentTeam]);

  const loadBranches = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.getTeamBranches(currentTeam.id);
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (name: string, basePageId: string) => {
    if (!currentTeam) return;
    try {
      await teamApi.createBranch(currentTeam.id, name, basePageId);
      setShowCreateModal(false);
      loadBranches();
    } catch (err) {
      console.error('Failed to create branch:', err);
    }
  };

  const handleMerge = async (branchId: string) => {
    if (!confirm('Are you sure you want to merge this branch?')) return;
    try {
      await teamApi.mergeBranch(currentTeam?.id || '', branchId);
      loadBranches();
    } catch (err) {
      console.error('Failed to merge branch:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#F59E0B';
      case 'review': return '#3B82F6';
      case 'approved': return '#10B981';
      case 'orphaned': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (!currentTeam) return <div className="team-branches-empty">No team selected</div>;

  return (
    <div className="team-branches">
      <div className="branches-header">
        <h2>Team Branches</h2>
        <p className="branches-description">
          Experimental workspace for drafting ideas, proposals, and testing before merging.
        </p>
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          + New Branch
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading branches...</div>
      ) : (
        <div className="branches-list">
          {branches.map(branch => (
            <div key={branch.id} className="branch-card">
              <div className="branch-header">
                <h4 className="branch-name">{branch.name}</h4>
                <span
                  className="branch-status"
                  style={{ background: getStatusColor(branch.status) }}
                >
                  {branch.status}
                </span>
              </div>
              <div className="branch-meta">
                <span>Base Page: {branch.base_page_id}</span>
                <span>Created: {new Date(branch.created_at).toLocaleDateString()}</span>
              </div>
              {branch.status === 'approved' && (
                <button
                  className="merge-btn"
                  onClick={() => handleMerge(branch.id)}
                >
                  Merge to Main
                </button>
              )}
            </div>
          ))}

          {branches.length === 0 && (
            <div className="empty-state">
              <p>No branches yet. Create a branch to experiment with ideas.</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateBranchModal
          onSubmit={handleCreateBranch}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

const CreateBranchModal = ({
  onSubmit,
  onClose,
}: {
  onSubmit: (name: string, basePageId: string) => void;
  onClose: () => void;
}) => {
  const [name, setName] = useState('');
  const [basePageId, setBasePageId] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Create New Branch</h3>
        <div className="form-group">
          <label>Branch Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., feature-proposal, draft-plan"
          />
        </div>
        <div className="form-group">
          <label>Base Page ID</label>
          <input
            type="text"
            value={basePageId}
            onChange={(e) => setBasePageId(e.target.value)}
            placeholder="ID of page to branch from"
          />
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="submit-btn"
            onClick={() => onSubmit(name, basePageId)}
            disabled={!name.trim() || !basePageId.trim()}
          >
            Create Branch
          </button>
        </div>
      </div>
    </div>
  );
};