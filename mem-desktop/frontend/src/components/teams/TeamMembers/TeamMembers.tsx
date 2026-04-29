import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamMembership, TeamRole, TeamInvite } from '@/types/team';
import './TeamMembers.css';

export const TeamMembers = () => {
  const { currentTeam, userTeams } = useWorkspace();
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddDirectly, setShowAddDirectly] = useState(false);

  const currentUserMembership = members.find(m => m.user_id === currentTeam?.owner_id);
  const isOwner = currentUserMembership?.role === 'owner';

  useEffect(() => {
    if (!currentTeam) return;
    loadMembersAndInvites();
  }, [currentTeam]);

  const loadMembersAndInvites = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const [membersData, invitesData] = await Promise.all([
        teamApi.getTeamMembers(currentTeam.id),
        teamApi.getInvites(currentTeam.id),
      ]);
      setMembers(membersData);
      setInvites(invitesData);
    } catch (err) {
      console.error('Failed to load members/invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: TeamRole) => {
    if (!currentTeam || !isOwner) return;
    try {
      await teamApi.updateMemberRole(currentTeam.id, userId, newRole);
      loadMembersAndInvites();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentTeam || !isOwner) return;
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await teamApi.removeMember(currentTeam.id, userId, currentTeam.owner_id);
      loadMembersAndInvites();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case 'owner': return '#EF4444';
      case 'editor': return '#3B82F6';
      case 'viewer': return '#10B981';
      case 'guest': return '#F59E0B';
    }
  };

  if (!currentTeam) return <div className="team-members-empty">No team selected</div>;

  return (
    <div className="team-members">
      <div className="members-header">
        <h2>Team Members</h2>
        <div className="members-actions">
          <button className="invite-btn" onClick={() => setShowInviteModal(true)}>
            📧 Invite by Email
          </button>
          <button className="invite-btn" onClick={() => setShowAddDirectly(true)}>
            👤 Add Directly
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading members...</div>
      ) : (
        <div className="members-content">
          {/* Active Members */}
          <div className="members-section">
            <h3>Active Members ({members.length})</h3>
            <div className="members-list">
              {members.map(member => (
                <div key={member.id} className="member-card">
                  <div className="member-info">
                    <div className="member-avatar">
                      {member.user?.username.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="member-details">
                      <span className="member-name">{member.user?.username || 'Unknown'}</span>
                      <span className="member-email">{member.user?.email || ''}</span>
                    </div>
                  </div>
                  <div className="member-actions">
                    <span
                      className="role-badge"
                      style={{ background: getRoleBadgeColor(member.role) }}
                    >
                      {member.role}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value as TeamRole)}
                        className="role-select"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                        <option value="guest">Guest</option>
                      </select>
                    )}
                    {isOwner && member.role !== 'owner' && (
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <div className="members-section">
              <h3>Pending Invites ({invites.length})</h3>
              <div className="invites-list">
                {invites.map(invite => (
                  <div key={invite.id} className="invite-card">
                    <div className="invite-info">
                      <span className="invite-email">{invite.email || 'Invite Code'}</span>
                      <span className="invite-code">Code: {invite.code}</span>
                    </div>
                    <div className="invite-details">
                      <span className="invite-role">{invite.role}</span>
                      <span className="invite-uses">
                        Uses: {invite.uses}/{invite.max_uses}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ownership Transfer */}
          {isOwner && members.length > 1 && (
            <div className="members-section">
              <h3>Transfer Ownership</h3>
              <p className="section-description">
                Transfer team ownership to another member if you want to leave.
              </p>
              <select
                className="transfer-select"
                onChange={(e) => {
                  if (e.target.value && confirm('Are you sure you want to transfer ownership?')) {
                    teamApi.transferOwnership(currentTeam.id, e.target.value);
                  }
                }}
              >
                <option value="">Select new owner...</option>
                {members.filter(m => m.role !== 'owner').map(m => (
                  <option key={m.id} value={m.user_id}>
                    {m.user?.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInviteSent={loadMembersAndInvites}
        />
      )}

      {showAddDirectly && (
        <AddDirectlyModal
          onClose={() => setShowAddDirectly(false)}
          onMemberAdded={loadMembersAndInvites}
        />
      )}
    </div>
  );
};

// Invite Modal
const InviteModal = ({
  onClose,
  onInviteSent,
}: {
  onClose: () => void;
  onInviteSent: () => void;
}) => {
  const { currentTeam } = useWorkspace();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('viewer');
  const [method, setMethod] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!currentTeam || !email.trim()) return;
    setLoading(true);
    try {
      if (method === 'email') {
        await teamApi.inviteToTeam(currentTeam.id, email, role, 'email');
      } else {
        await teamApi.generateInviteCode(currentTeam.id, role);
      }
      onInviteSent();
      onClose();
    } catch (err) {
      console.error('Failed to send invite:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Invite to Team</h3>
        <div className="form-group">
          <label>Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as 'email' | 'code')}>
            <option value="email">Email Invite</option>
            <option value="code">Generate Invite Code</option>
          </select>
        </div>
        {method === 'email' ? (
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
        ) : (
          <p className="info-text">A unique invite code will be generated.</p>
        )}
        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="submit-btn" onClick={handleSend} disabled={loading || !email}>
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Directly Modal
const AddDirectlyModal = ({
  onClose,
  onMemberAdded,
}: {
  onClose: () => void;
  onMemberAdded: () => void;
}) => {
  const { currentTeam } = useWorkspace();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<TeamRole>('viewer');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!currentTeam || !userId.trim()) return;
    setLoading(true);
    try {
      await teamApi.addMember(currentTeam.id, userId, role);
      onMemberAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Add Member Directly</h3>
        <div className="form-group">
          <label>User ID or Username</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID or username"
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="submit-btn" onClick={handleAdd} disabled={loading || !userId}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
};