import type {
  Team,
  CreateTeamPayload,
  TeamInvite,
  TeamMembership,
  TeamPage,
  TeamGraphNode,
  TeamBranch,
  TeamMemory,
  KnowledgeConflict,
  AIInteractionMemory,
  TeamNotification,
  SharePagePayload,
  ForkPagePayload,
  TeamRole,
  PageType,
  PublishLevel,
  MemoryType,
  ConflictStatus,
  InviteMethod,
} from '../types/team';

const API_BASE = '/api';

export const teamApi = {
  // ==================== TEAM MANAGEMENT ====================
  createTeam: async (payload: CreateTeamPayload): Promise<Team> => {
    const res = await fetch(`${API_BASE}/teams/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create team');
    return res.json();
  },

  getMyTeams: async (): Promise<Team[]> => {
    const res = await fetch(`${API_BASE}/teams/my-teams/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch teams');
    return res.json();
  },

  getTeam: async (teamId: string): Promise<Team> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch team');
    return res.json();
  },

  updateTeam: async (teamId: string, payload: Partial<Team>): Promise<Team> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update team');
    return res.json();
  },

  deleteTeam: async (teamId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete team');
  },

  // ==================== MEMBER MANAGEMENT ====================
  getTeamMembers: async (teamId: string): Promise<TeamMembership[]> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },

  addMember: async (teamId: string, userId: string, role: TeamRole): Promise<TeamMembership> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (!res.ok) throw new Error('Failed to add member');
    return res.json();
  },

  updateMemberRole: async (teamId: string, userId: string, role: TeamRole): Promise<TeamMembership> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members/${userId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to update member role');
    return res.json();
  },

  removeMember: async (teamId: string, userId: string, removedBy: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members/remove/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, removed_by: removedBy }),
    });
    if (!res.ok) throw new Error('Failed to remove member');
  },

  transferOwnership: async (teamId: string, newOwnerId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/transfer-ownership/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_owner_id: newOwnerId }),
    });
    if (!res.ok) throw new Error('Failed to transfer ownership');
  },

  // ==================== INVITATION SYSTEM ====================
  inviteToTeam: async (
    teamId: string,
    email: string,
    role: TeamRole,
    method: InviteMethod = 'email' as InviteMethod
  ): Promise<TeamInvite> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/invite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, method }),
    });
    if (!res.ok) throw new Error('Failed to send invite');
    return res.json();
  },

  generateInviteCode: async (teamId: string, role: TeamRole, maxUses = 1): Promise<TeamInvite> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/invite/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, max_uses: maxUses, method: 'code' }),
    });
    if (!res.ok) throw new Error('Failed to generate invite code');
    return res.json();
  },

  acceptInvite: async (code: string): Promise<TeamMembership> => {
    const res = await fetch(`${API_BASE}/teams/invite/${code}/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to accept invite');
    return res.json();
  },

  getInvites: async (teamId: string): Promise<TeamInvite[]> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/invite/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch invites');
    return res.json();
  },

  // ==================== TEAM PAGES ====================
  getTeamPages: async (teamId: string, pageType?: PageType): Promise<TeamPage[]> => {
    const url = new URL(`${API_BASE}/teams/${teamId}/pages/`, window.location.origin);
    if (pageType) url.searchParams.set('page_type', pageType);
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch team pages');
    return res.json();
  },

  createTeamPage: async (
    teamId: string,
    title: string,
    content: string,
    pageType: PageType = 'standard',
    publishLevel: PublishLevel = 'team_shared'
  ): Promise<TeamPage> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/pages/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, page_type: pageType, publish_level: publishLevel }),
    });
    if (!res.ok) throw new Error('Failed to create team page');
    return res.json();
  },

  updateTeamPage: async (teamId: string, pageId: string, payload: Partial<TeamPage>): Promise<TeamPage> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/pages/${pageId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update page');
    return res.json();
  },

  deleteTeamPage: async (teamId: string, pageId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/pages/${pageId}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete page');
  },

  // ==================== KNOWLEDGE FLOW ====================
  sharePageToTeam: async (teamId: string, payload: SharePagePayload): Promise<TeamPage> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/share-to-team/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to share page to team');
    return res.json();
  },

  forkPageToPersonal: async (teamId: string, payload: ForkPagePayload): Promise<TeamPage> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/fork-to-personal/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to fork page to personal');
    return res.json();
  },

  // ==================== TEAM GRAPH ====================
  getTeamGraph: async (teamId: string): Promise<TeamGraphNode[]> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/graph/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch team graph');
    return res.json();
  },

  addGraphNode: async (teamId: string, node: Partial<TeamGraphNode>): Promise<TeamGraphNode> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/graph/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node),
    });
    if (!res.ok) throw new Error('Failed to add graph node');
    return res.json();
  },

  // ==================== TEAM BRANCHES ====================
  getTeamBranches: async (teamId: string): Promise<TeamBranch[]> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/branches/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch branches');
    return res.json();
  },

  createBranch: async (teamId: string, name: string, basePageId: string): Promise<TeamBranch> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/branches/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, base_page_id: basePageId }),
    });
    if (!res.ok) throw new Error('Failed to create branch');
    return res.json();
  },

  mergeBranch: async (teamId: string, branchId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/branches/${branchId}/action/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'merge' }),
    });
    if (!res.ok) throw new Error('Failed to merge branch');
  },

  // ==================== TEAM MEMORY ====================
  getTeamMemory: async (teamId: string, memoryType?: MemoryType): Promise<TeamMemory[]> => {
    const url = new URL(`${API_BASE}/teams/${teamId}/memory/`, window.location.origin);
    if (memoryType) url.searchParams.set('memory_type', memoryType);
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch team memory');
    return res.json();
  },

  addTeamMemory: async (teamId: string, memory: Partial<TeamMemory>): Promise<TeamMemory> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/memory/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    if (!res.ok) throw new Error('Failed to add team memory');
    return res.json();
  },

  // ==================== CONFLICT RESOLUTION ====================
  getConflicts: async (teamId: string, status?: ConflictStatus): Promise<KnowledgeConflict[]> => {
    const url = new URL(`${API_BASE}/teams/${teamId}/conflicts/`, window.location.origin);
    if (status) url.searchParams.set('status', status);
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch conflicts');
    return res.json();
  },

  resolveConflict: async (teamId: string, conflictId: string, resolution: string): Promise<KnowledgeConflict> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/conflicts/${conflictId}/resolve/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    if (!res.ok) throw new Error('Failed to resolve conflict');
    return res.json();
  },

  // ==================== AI INTERACTION MEMORY ====================
  getAIInteractions: async (teamId: string): Promise<AIInteractionMemory[]> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/ai-interactions/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch AI interactions');
    return res.json();
  },

  // ==================== NOTIFICATIONS ====================
  getNotifications: async (teamId: string): Promise<TeamNotification[]> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/notifications/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/notifications/${notificationId}/read/`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to mark notification as read');
  },

  // ==================== TEAM SEARCH ====================
  searchTeam: async (teamId: string, query: string, scope: 'team' | 'all_teams' = 'team'): Promise<any> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/search/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, scope }),
    });
    if (!res.ok) throw new Error('Failed to search team');
    return res.json();
  },

  // ==================== TEAM INGESTION ====================
  uploadToTeam: async (teamId: string, file: File, addToTeam = true): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('add_to_team', String(addToTeam));
    const res = await fetch(`${API_BASE}/teams/${teamId}/upload/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  // ==================== TEAM ONBOARDING ====================
  getOnboarding: async (teamId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/onboarding/`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch onboarding');
    return res.json();
  },

  completeOnboarding: async (teamId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/onboarding/complete/`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to complete onboarding');
  },
};