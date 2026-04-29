export type WorkspaceMode = 'personal' | 'team' | 'global';
export type TeamRole = 'owner' | 'editor' | 'viewer' | 'guest';
export type TeamCategory = 'startup' | 'research' | 'study_group' | 'family' | 'operations' | 'custom';
export type TeamVisibility = 'private_invite_only' | 'link_access' | 'discoverable';
export type PageScope = 'personal' | 'team';
export type PageType = 'standard' | 'shared_sop' | 'decision' | 'knowledge_node' | 'meeting_synthesis';
export type PublishLevel = 'draft' | 'team_shared' | 'canonical';
export type MemoryType = 'fact' | 'discussion' | 'decision' | 'experiment' | 'contradiction';
export type ConflictStatus = 'detected' | 'in_review' | 'resolved' | 'ignored';
export type InviteMethod = 'email' | 'code' | 'link' | 'direct_add';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  category: TeamCategory;
  visibility: TeamVisibility;
  owner_id: string;
  avatar?: string;
  created_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  user?: User;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  invited_by: string;
  email?: string;
  code: string;
  role: TeamRole;
  max_uses: number;
  uses: number;
  expires_at?: string;
  created_at: string;
}

export interface TeamPage {
  id: string;
  title: string;
  content: string;
  page_type: PageType;
  scope: PageScope;
  team_id?: string;
  user_id?: string;
  publish_level: PublishLevel;
  is_canonical: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
}

export interface TeamGraphNode {
  id: string;
  label: string;
  type: 'page' | 'member' | 'file' | 'decision' | 'task' | 'conflict';
  team_id: string;
  metadata?: Record<string, any>;
}

export interface TeamBranch {
  id: string;
  team_id: string;
  name: string;
  creator_id: string;
  status: 'draft' | 'review' | 'approved' | 'orphaned';
  base_page_id: string;
  created_at: string;
}

export interface TeamMemory {
  id: string;
  team_id: string;
  memory_type: MemoryType;
  content: Record<string, any>;
  confidence: number;
  created_at: string;
}

export interface TemporalNode {
  id: string;
  team_id: string;
  content_id: string;
  valid_from: string;
  valid_until?: string;
  superseded_by?: string;
}

export interface KnowledgeConflict {
  id: string;
  team_id: string;
  node_a: string;
  node_b: string;
  status: ConflictStatus;
  resolution?: string;
  resolved_by?: string;
  created_at: string;
}

export interface AIInteractionMemory {
  id: string;
  team_id: string;
  prompt: string;
  response: string;
  referenced_nodes: string[];
  contributed_decision_id?: string;
  created_at: string;
}

export interface TeamNotification {
  id: string;
  team_id: string;
  user_id: string;
  type: 'page_shared' | 'mention' | 'contradiction' | 'review_request' | 'graph_update';
  message: string;
  read: boolean;
  created_at: string;
}

export interface CreateTeamPayload {
  name: string;
  description: string;
  category: TeamCategory;
  visibility: TeamVisibility;
  default_role: TeamRole;
}

export interface SharePagePayload {
  page_id: string;
  preserve_origin: boolean;
  mark_source_author: boolean;
}

export interface ForkPagePayload {
  page_id: string;
}