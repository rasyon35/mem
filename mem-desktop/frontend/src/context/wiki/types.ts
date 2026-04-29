import React from 'react';

export type WikiPage = { id?: number; title: string; slug?: string; description?: string; type?: string; category?: string; updated_at?: string };

export type ChatSurface = 'main' | 'wiki' | 'graph' | 'synthesis';

export type ChatCitation = {
  page_title: string;
  snippet?: string;
  type?: string;
  source_type?: string;
  source_name?: string;
  source_path_or_url?: string;
  page_reference?: string;
  evidence_snippet?: string;
  relevance_score?: number;
};

export type ChatMode = 'global' | 'wiki_page' | 'graph_node';

export type ChatContextPayload = {
  pageTitle?: string;
  nodeId?: string;
  relatedNodes?: string[];
};

export type ChatAnswerMeta = {
  citations?: ChatCitation[];
  confidence?: 'low' | 'medium' | 'high';
  reasoning_summary?: string;
};

export type ChatMsg = { role: 'user' | 'ai'; text: string; meta?: ChatAnswerMeta };

export type ChatSurfaceState = {
  question: string;
  chatLog: ChatMsg[];
  chatLoading: boolean;
  chatMode: ChatMode;
  chatContext: ChatContextPayload;
  lastChatRequest: { question: string; mode: ChatMode; context: ChatContextPayload } | null;
};

// Graph Chatbot Context Types
export type UserIntent = 'definition' | 'deep' | 'relationship' | 'navigation' | 'synthesis' | 'exploration';
export type ContextDepth = 'quick' | 'standard' | 'deep_research';
export interface ChatContextPacket {
  node?: { node_id: string; node_name: string; node_type: string; summary?: string; direct_links: string[] };
  wiki?: { current_page?: string; page_content: string; page_title: string; backlinks: { title: string }[]; forward_links: { title: string }[] };
  graph?: { related_nodes: { id: string; name: string; edge_type: string }[]; hub_node?: string; edge_count: number };
  synthesis?: { cross_wiki_insights: string; confidence: number };
  intent: UserIntent;
  depth: ContextDepth;
  token_estimate: number;
  sources_used: string[];
};
export type UIAction = 
  | { type: 'open_wiki'; payload: { pageTitle: string } }
  | { type: 'show_related'; payload: { nodeId: string } }
  | { type: 'expand_depth'; payload: { depth: ContextDepth } }
  | { type: 'find_path'; payload: { from: string; to: string } }
  | { type: 'synthesize_hub'; payload: { hubTitle: string } };

export type IngestResult = {
  status?: 'staged' | 'applied';
  error?: string;
  needs_approval?: boolean;
  proposed_changes?: Record<string, unknown>;
  preview?: {
    summary?: string;
    new_pages?: string[];
    updated_pages?: string[];
    contradictions?: number;
  };
  changes?: string[];
  contradictions?: { existing_page: string; existing_claim: string; new_claim: string; confidence: string }[];
  summary?: string;
};

export interface WikiContextType {
  // Ingest
  file: File | null; setFile: (f: File | null) => void;
  url: string; setUrl: (u: string) => void;
  autoApprove: boolean; setAutoApprove: (v: boolean) => void;
  loading: boolean;
  result: IngestResult | null; setResult: (r: IngestResult | null) => void;
  handleIngest: () => Promise<void>;
  handleApprove: () => Promise<void>;

  // Chat
  question: string; setQuestion: (q: string) => void;
  chatLog: ChatMsg[];
  chatMetaLog: ChatAnswerMeta[];
  chatMode: ChatMode;
  chatContext: ChatContextPayload;
  chatLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleChat: (pageContext?: string) => Promise<void>;
  ask: (surface: ChatSurface, questionText: string, options?: { mode?: ChatMode; context?: ChatContextPayload }) => Promise<void>;
  retry: (surface: ChatSurface) => Promise<void>;
  clearConversation: (surface: ChatSurface) => void;
  setContext: (surface: ChatSurface, mode: ChatMode, context?: ChatContextPayload) => void;
  getChatState: (surface: ChatSurface) => {
    question: string;
    chatLog: ChatMsg[];
    chatLoading: boolean;
    chatMode: ChatMode;
    chatContext: ChatContextPayload;
    chatEndRef: React.RefObject<HTMLDivElement | null>;
  };
  setQuestionForSurface: (surface: ChatSurface, q: string) => void;

  // Wiki - Unified Markdown V2 Logic
  wikiPages: any[];
  fetchWikiPages: () => Promise<void>;
  
  // Timeline & History
  gitHistory: any[];
  fetchHistory: (pageTitle?: string) => Promise<void>;
  handleRevert: (hash: string, fetchWikiPages?: () => void) => Promise<void>;

  // Governance
  contradictions: any[];
  fetchContradictions: () => Promise<void>;
  resolveContradiction: (id: number, action: 'accept' | 'dismiss') => Promise<void>;
  pullRequests: any[];
  fetchPullRequests: () => Promise<void>;
  approvePullRequest: (branchName: string) => Promise<void>;
  criticalPages: any[];
  newCritical: string; setNewCritical: (s: string) => void;
  addCritical: () => Promise<void>;
  removeCritical: (title: string) => Promise<void>;

  // Sync / Collaboration
  syncStatus: any;
  team: any;
  conflicts: any[];
  handleSync?: () => Promise<void>;
  fetchConflicts: () => Promise<void>;
  locks: any[];
  fetchLocks: () => Promise<void>;
  handleLock: (pageTitle: string, user: string, force?: boolean) => Promise<{ success: boolean; error?: string; owner?: string }>;
  handleUnlock: (pageTitle: string, user: string, force?: boolean) => Promise<{ success: boolean; error?: string }>;
  mergeModalOpen: boolean;
  setMergeModalOpen: (v: boolean) => void;
  // Graph
  graphData: { nodes: any[]; links: any[] };
  graphStats: { node_count: number; link_count: number; ghost_count: number; hub_count: number; orphan_count: number } | null;
  graphMeta: { truncated?: boolean; build_ms?: number; revision?: string; focus?: string | null; depth?: number } | null;
  graphLoading: boolean;
  graphError: string | null;
  presence?: Record<string, { user: string }>;
  fetchGraphData: (options?: {
    focus?: string;
    depth?: number;
    q?: string;
    includeGhost?: boolean;
    minDegree?: number;
    limitNodes?: number;
    limitLinks?: number;
  }) => Promise<void>;
  trackMetricEvent: (event: string, payload?: Record<string, unknown>) => Promise<void>;

  // Linter / Remediation
  suggestedLinks: { title: string; score: number }[];
  suggestionsLoading: boolean;
  fetchSuggestions: (pageTitle: string) => Promise<void>;
  runLint: () => Promise<void>;
  lintRuns: any[];
  lintFindings: any[];
  remediationTasks: any[];
  fetchLintFindings: (runId?: number) => Promise<void>;
  fetchRemediationTasks: () => Promise<void>;
  updateRemediationTask: (id: number, status: string) => Promise<void>;
  
  // Query Artifacts
  fetchQueryArtifacts: () => Promise<void>;
  queryArtifacts: any[];
  undoQueryArtifact: (artifactId: number) => Promise<void>;

  // Global UI
  zenMode: boolean; setZenMode: (v: boolean) => void;
  wikiSidebarOpen: boolean; setWikiSidebarOpen: (v: boolean) => void;
  modalDiff: { open: boolean; title: string; old?: string; new?: string };
  setModalDiff: (d: { open: boolean; title: string; old?: string; new?: string }) => void;

  // Staged Changes Review
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (v: boolean) => void;
  pendingChanges: any;
  setPendingChanges: (c: any) => void;
}
