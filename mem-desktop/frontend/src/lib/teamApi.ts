const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0');

// Prefer explicit env config, otherwise use same-origin in hosted environments.
// Keep localhost fallback for local frontend+backend development convenience.
const API = process.env.NEXT_PUBLIC_API_URL || (isLocalhost ? 'http://127.0.0.1:8000/api' : '/api');

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  category: string;
  visibility: string;
  created_by: string;
  created_at: string;
  role?: string;
  unread_notifications?: number;
  member_count?: number;
}

export interface TeamMembership {
  id: string;
  team: string;
  user: { id: string; username: string; email: string };
  role: string;
  joined_at: string;
  is_active: boolean;
}

export interface TeamInvite {
  id: string;
  team: string;
  code: string;
  role: string;
  max_uses: number;
  uses: number;
  expires_at?: string;
  created_at: string;
  is_valid: boolean;
}

export interface TeamHome {
  team: Team;
  recent_pages: string[];
  activities: any[];
  conflicts: number;
  notifications: any[];
}

export interface TeamPage {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  status: string;
  category?: string;
  created_at: string;
  updated_at: string;
  author?: { username: string };
}

const headers = { 'Content-Type': 'application/json' };

export const teamApi = {
  // Team management
  list: () => fetch(`${API}/teams/`).then(r => r.json()),
  myTeams: () => fetch(`${API}/teams/my-teams/`).then(r => r.json()),
  create: (data: Partial<Team>) =>
    fetch(`${API}/teams/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
  detail: (id: string) => fetch(`${API}/teams/${id}/`).then(r => r.json()),
  update: (id: string, data: Partial<Team>) =>
    fetch(`${API}/teams/${id}/`, { method: 'PUT', headers, body: JSON.stringify(data) }).then(r => r.json()),
  remove: (id: string) =>
    fetch(`${API}/teams/${id}/`, { method: 'DELETE' }).then(r => r.ok),

  // Team home
  home: (id: string) => fetch(`${API}/teams/${id}/home/`).then(r => r.json()),

  // Members
  members: (id: string) => fetch(`${API}/teams/${id}/members/`).then(r => r.json()),
  addMember: (id: string, userId: string, role = 'viewer') =>
    fetch(`${API}/teams/${id}/members/`, { method: 'POST', headers, body: JSON.stringify({ user_id: userId, role }) }).then(r => r.json()),
  removeMember: (id: string, userId: string) =>
    fetch(`${API}/teams/${id}/members/remove/`, { method: 'POST', headers, body: JSON.stringify({ user_id: userId }) }).then(r => r.json()),

  // Ownership
  transferOwnership: (id: string, newOwnerId: string) =>
    fetch(`${API}/teams/${id}/transfer-ownership/`, { method: 'POST', headers, body: JSON.stringify({ new_owner_id: newOwnerId }) }).then(r => r.json()),

  // Invites
  createInvite: (id: string, data: { role?: string; max_uses?: number; expires_at?: string }) =>
    fetch(`${API}/teams/${id}/invite/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
  acceptInvite: (code: string) => fetch(`${API}/teams/invite/${code}/`).then(r => r.json()),
  joinTeam: (id: string) => fetch(`${API}/teams/${id}/join/`, { method: 'POST' }).then(r => r.json()),

  // Pages
  pages: (id: string) => fetch(`${API}/teams/${id}/pages/`).then(r => r.json()),
  createPage: (id: string, data: any) =>
    fetch(`${API}/teams/${id}/pages/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
  updatePage: (teamId: string, pageId: string, data: any) =>
    fetch(`${API}/teams/${teamId}/pages/${pageId}/`, { method: 'PATCH', headers, body: JSON.stringify(data) }).then(r => r.json()),
  deletePage: (teamId: string, pageId: string) =>
    fetch(`${API}/teams/${teamId}/pages/${pageId}/`, { method: 'DELETE' }).then(r => r.ok),

  // Graph
  graph: (id: string) => fetch(`${API}/teams/${id}/graph/`).then(r => r.json()),
  addGraphNode: (id: string, data: any) =>
    fetch(`${API}/teams/${id}/graph/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),

  // Branches
  branches: (id: string) => fetch(`${API}/teams/${id}/branches/`).then(r => r.json()),
  createBranch: (id: string, data: any) =>
    fetch(`${API}/teams/${id}/branches/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
  mergeBranch: (teamId: string, branchId: string) =>
    fetch(`${API}/teams/${teamId}/branches/${branchId}/action/`, { method: 'POST', headers, body: JSON.stringify({ action: 'merge' }) }).then(r => r.json()),

  // Chat
  chat: (id: string, data: { message: string }) =>
    fetch(`${API}/teams/${id}/chat/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
  aiChat: (id: string, data: { question: string; page_context?: string }) =>
    fetch(`${API}/teams/${id}/chat/ai/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),

  // Memory
  memory: (id: string) => fetch(`${API}/teams/${id}/memory/`).then(r => r.json()),
  addMemory: (id: string, data: any) =>
    fetch(`${API}/teams/${id}/memory/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),

  // Conflicts
  conflicts: (id: string) => fetch(`${API}/teams/${id}/conflicts/`).then(r => r.json()),
  resolveConflict: (id: string, conflictId: string, resolution: string) =>
    fetch(`${API}/teams/${id}/conflicts/${conflictId}/resolve/`, { method: 'POST', headers, body: JSON.stringify({ resolution }) }).then(r => r.json()),

  // Notifications
  notifications: (id: string) => fetch(`${API}/teams/${id}/notifications/`).then(r => r.json()),
  markNotificationRead: (notificationId: string) =>
    fetch(`${API}/notifications/${notificationId}/read/`, { method: 'POST' }).then(r => r.ok),

  // Search
  search: (id: string, query: string) =>
    fetch(`${API}/teams/${id}/search/?q=${encodeURIComponent(query)}`).then(r => r.json()),

  // Knowledge flow
  sharePageToTeam: (teamId: string, data: any) =>
    fetch(`${API}/teams/${teamId}/share-to-team/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),
  forkPageToPersonal: (teamId: string, data: any) =>
    fetch(`${API}/teams/${teamId}/fork-to-personal/`, { method: 'POST', headers, body: JSON.stringify(data) }).then(r => r.json()),

  // Ingestion
  uploadToTeam: (id: string, formData: FormData) =>
    fetch(`${API}/teams/${id}/upload/`, { method: 'POST', body: formData }).then(r => r.json()),

  // Activities
  activities: (id: string) => fetch(`${API}/teams/${id}/activities/`).then(r => r.json()),

  // Workspace
  workspace: () => fetch(`${API}/teams/workspace/`).then(r => r.json()),
};