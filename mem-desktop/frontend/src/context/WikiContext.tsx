'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export type WikiPage = { title: string; description: string; type?: string; category?: string };
export type ChatSurface = 'main' | 'wiki' | 'graph';
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
type ChatSurfaceState = {
  question: string;
  chatLog: ChatMsg[];
  chatLoading: boolean;
  chatMode: ChatMode;
  chatContext: ChatContextPayload;
  lastChatRequest: { question: string; mode: ChatMode; context: ChatContextPayload } | null;
};

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

interface WikiContextType {
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
  handleRevert: (hash: string) => Promise<void>;

  // Settings & Governance
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

  handleSync: () => Promise<void>;
  fetchConflicts: () => Promise<void>;

  // UI Modals
  modalDiff: { open: boolean; old: string; new: string; title: string };
  setModalDiff: (d: any) => void;
  mergeModalOpen: boolean; setMergeModalOpen: (v: boolean) => void;
  // Collaboration / Presence / Sync
  presence: Record<string, { user: string; last_seen: number }>;
  trackActivity: (page: string) => Promise<void>;
  fetchPresence: () => Promise<void>;
  syncStatus: any;
  team: any;
  locks: any[];
  hubMode: boolean; setHubMode: (v: boolean) => void;
  remoteUrl: string; setRemoteUrl: (s: string) => void;
  conflicts: any[];
  fetchLocks: () => Promise<void>;
  handleLock: (pageTitle: string, user: string, force?: boolean) => Promise<{ success: boolean; error?: string; owner?: string }>;
  handleUnlock: (pageTitle: string, user: string, force?: boolean) => Promise<{ success: boolean; error?: string }>;
  // Graph
  graphData: { nodes: any[]; links: any[] };
  graphStats: { node_count: number; link_count: number; ghost_count: number; hub_count: number; orphan_count: number } | null;
  graphMeta: { truncated?: boolean; build_ms?: number; revision?: string; focus?: string | null; depth?: number } | null;
  graphLoading: boolean;
  graphError: string | null;
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

  // Phase 5: Synthesis
  suggestedLinks: { title: string; score: number }[];
  suggestionsLoading: boolean;
  fetchSuggestions: (title: string) => Promise<void>;
  runLint: () => Promise<void>;
  lintRuns: any[];
  lintFindings: any[];
  remediationTasks: any[];
  fetchLintFindings: (runId?: number) => Promise<void>;
  fetchRemediationTasks: () => Promise<void>;
  updateRemediationTask: (id: number, status: string) => Promise<void>;
  fetchQueryArtifacts: () => Promise<void>;
  queryArtifacts: any[];
  undoQueryArtifact: (artifactId: number) => Promise<void>;
  zenMode: boolean;
  setZenMode: (v: boolean) => void;
}

const WikiContext = createContext<WikiContextType | undefined>(undefined);

export const WikiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);

  const defaultSurfaceState = (): ChatSurfaceState => ({
    question: '',
    chatLog: [],
    chatLoading: false,
    chatMode: 'global',
    chatContext: {},
    lastChatRequest: null,
  });
  const [chatState, setChatState] = useState<Record<ChatSurface, ChatSurfaceState>>({
    main: defaultSurfaceState(),
    wiki: defaultSurfaceState(),
    graph: defaultSurfaceState(),
  });
  const mainChatEndRef = useRef<HTMLDivElement>(null);
  const wikiChatEndRef = useRef<HTMLDivElement>(null);
  const graphChatEndRef = useRef<HTMLDivElement>(null);

  const [wikiPages, setWikiPages] = useState<any[]>([]);
  const [gitHistory, setGitHistory] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [criticalPages, setCriticalPages] = useState<any[]>([]);
  const [newCritical, setNewCritical] = useState('');

  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [team, setTeam] = useState<any>({ admins: [], editors: [], contributors: [], viewers: [] });
  const [locks, setLocks] = useState<any[]>([]);
  const [hubMode, setHubMode] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [conflicts, setConflicts] = useState<any[]>([]);

  const [modalDiff, setModalDiff] = useState({ open: false, old: '', new: '', title: '' });
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [presence, setPresence] = useState<Record<string, any>>({});
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [graphStats, setGraphStats] = useState<any>(null);
  const [graphMeta, setGraphMeta] = useState<any>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [suggestedLinks, setSuggestedLinks] = useState<{ title: string; score: number }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [lintRuns, setLintRuns] = useState<any[]>([]);
  const [lintFindings, setLintFindings] = useState<any[]>([]);
  const [remediationTasks, setRemediationTasks] = useState<any[]>([]);
  const [queryArtifacts, setQueryArtifacts] = useState<any[]>([]);
  const [zenMode, setZenMode] = useState(false);


  const getChatEndRef = (surface: ChatSurface) => {
    if (surface === 'wiki') return wikiChatEndRef;
    if (surface === 'graph') return graphChatEndRef;
    return mainChatEndRef;
  };
  const getSurfaceState = (surface: ChatSurface) => chatState[surface];
  const setQuestionForSurface = (surface: ChatSurface, q: string) => {
    setChatState(prev => ({ ...prev, [surface]: { ...prev[surface], question: q } }));
  };

  useEffect(() => {
    mainChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.main.chatLog]);
  useEffect(() => {
    wikiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.wiki.chatLog]);
  useEffect(() => {
    graphChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.graph.chatLog]);

  const trackMetricEvent = async (event: string, payload: Record<string, unknown> = {}) => {
    try {
      await axios.post(`${API}/metrics/event`, { event, payload });
    } catch {
      // Metrics are non-blocking.
    }
  };

  // Background Presence & Heartbeat
  useEffect(() => {
    // 1. Initial fetch
    fetchPresence();
    fetchTeam();
    fetchLocks();

    // 2. Poll presence and locks every 10 seconds
    const pollInterval = setInterval(() => {
      fetchPresence();
      fetchLocks();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);


  const handleIngest = async () => {
    if (!file && !url.trim()) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    if (file) formData.append('file', file);
    else formData.append('url', url.trim());
    formData.append('auto_approve', String(autoApprove));
    try {
      const res = await axios.post(`${API}/ingest`, formData);
      setResult(res.data);
      await trackMetricEvent('frontend_ingest_completed', {
        source_type: file ? 'file' : 'url',
        has_error: Boolean(res.data?.error),
        status: res.data?.status || 'unknown',
      });
    } catch {
      setResult({ error: 'Request failed' });
      await trackMetricEvent('frontend_ingest_completed', {
        source_type: file ? 'file' : 'url',
        has_error: true,
        status: 'failed',
      });
    } finally { setLoading(false); }
  };

  const handleApprove = async () => {
    if (!result?.proposed_changes) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/approve`, { changes: result.proposed_changes });
      setResult({ ...res.data });
      fetchHistory();
      await trackMetricEvent('frontend_approve_completed', {
        has_error: Boolean(res.data?.error),
        status: res.data?.status || 'unknown',
      });
    } catch {
      setResult({ error: 'Approval request failed' });
      await trackMetricEvent('frontend_approve_completed', {
        has_error: true,
        status: 'failed',
      });
    } finally { setLoading(false); }
  };

  const setContext = (surface: ChatSurface, mode: ChatMode, context: ChatContextPayload = {}) => {
    setChatState(prev => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        chatMode: mode,
        chatContext: context,
      },
    }));
  };

  const ask = async (
    surface: ChatSurface,
    questionText: string,
    options: { mode?: ChatMode; context?: ChatContextPayload } = {},
  ) => {
    if (!questionText.trim()) return;
    const q = questionText.trim();
    const surfaceState = getSurfaceState(surface);
    const mode = options.mode || surfaceState.chatMode;
    const contextPayload = options.context || surfaceState.chatContext;
    setChatState(prev => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        question: '',
        chatLoading: true,
        lastChatRequest: { question: q, mode, context: contextPayload },
        chatLog: [...prev[surface].chatLog, { role: 'user', text: q }],
      },
    }));
    await trackMetricEvent('chat_message_sent', {
      surface,
      mode,
      has_context: Boolean(contextPayload.pageTitle || contextPayload.nodeId),
    });
    try {
      const payload: any = { question: q, surface };
      const pageContext = contextPayload.pageTitle || contextPayload.nodeId;
      if (pageContext) payload.page_context = pageContext;
      
      const res = await axios.post(`${API}/chat`, payload);
      const aiMeta: ChatAnswerMeta = {
        citations: res.data.citations || [],
        confidence: res.data.confidence || 'medium',
        reasoning_summary: res.data.reasoning_summary || '',
      };
      setChatState(prev => ({
        ...prev,
        [surface]: {
          ...prev[surface],
          chatLog: [...prev[surface].chatLog, { role: 'ai', text: res.data.answer, meta: aiMeta }],
        },
      }));
      await trackMetricEvent('chat_answer_received', {
        surface,
        mode,
        confidence: res.data.confidence || 'medium',
        citations_count: Array.isArray(res.data.citations) ? res.data.citations.length : 0,
      });
      await trackMetricEvent('frontend_chat_completed', {
        surface,
        with_page_context: Boolean(pageContext),
        has_error: false,
      });
    } catch {
      setChatState(prev => ({
        ...prev,
        [surface]: {
          ...prev[surface],
          chatLog: [
            ...prev[surface].chatLog,
            { role: 'ai', text: '⚠️ Could not reach backend.', meta: { citations: [], confidence: 'low', reasoning_summary: 'Request failed.' } },
          ],
        },
      }));
      await trackMetricEvent('frontend_chat_completed', {
        surface,
        with_page_context: Boolean(contextPayload.pageTitle || contextPayload.nodeId),
        has_error: true,
      });
    } finally {
      setChatState(prev => ({
        ...prev,
        [surface]: { ...prev[surface], chatLoading: false },
      }));
    }
  };

  const retry = async (surface: ChatSurface) => {
    const surfaceState = getSurfaceState(surface);
    if (!surfaceState.lastChatRequest) return;
    await trackMetricEvent('chat_retry', { surface, mode: surfaceState.lastChatRequest.mode });
    await ask(surface, surfaceState.lastChatRequest.question, {
      mode: surfaceState.lastChatRequest.mode,
      context: surfaceState.lastChatRequest.context,
    });
  };

  const clearConversation = (surface: ChatSurface) => {
    setChatState(prev => ({
      ...prev,
      [surface]: {
        ...prev[surface],
        chatLog: [],
        lastChatRequest: null,
      },
    }));
  };

  const handleChat = async (pageContext?: string) => {
    const ctx: ChatContextPayload =
      pageContext ? { pageTitle: pageContext, nodeId: pageContext } : chatState.main.chatContext;
    const mode: ChatMode = pageContext ? 'wiki_page' : chatState.main.chatMode;
    await ask('main', chatState.main.question, { mode, context: ctx });
  };


  const fetchWikiPages = async () => {
    try {
      const res = await axios.get(`${API}/wiki/markdown-files`);
      const pages = (res.data.pages || []).map((p: any) => ({
        title: p.title || p.slug,
        slug: p.slug,
        category: p.topic_name || 'Knowledge',
      }));
      setWikiPages(pages);
    } catch { /* ignore */ }
  };

  const fetchHistory = async (pageTitle?: string) => {
    try {
      const url = pageTitle ? `${API}/history?page=${encodeURIComponent(pageTitle)}` : `${API}/history`;
      const res = await axios.get(url);
      setGitHistory(res.data.commits || []);
    } catch { /* ignore */ }
  };

  const fetchPullRequests = async () => {
    try {
      const res = await axios.get(`${API}/pull_requests`);
      setPullRequests(res.data.pull_requests || []);
    } catch { /* ignore */ }
  };

  const approvePullRequest = async (branchName: string) => {
    try {
      // Create a mock staged_changes with the branch_name to pass to the approve endpoint
      await axios.post(`${API}/approve`, { changes: { branch_name: branchName } });
      await fetchPullRequests();
      await fetchHistory();
    } catch { alert('Failed to merge pull request'); }
  };

  const handleRevert = async (hash: string) => {
    if (!confirm('Revert wiki?')) return;
    try {
      await axios.post(`${API}/revert`, { commit_hash: hash });
      fetchHistory(); fetchWikiPages();
    } catch { alert('Revert failed'); }
  };

  const fetchContradictions = async () => {
    try {
      const res = await axios.get(`${API}/contradictions`);
      setContradictions(res.data.contradictions || []);
    } catch { /* ignore */ }
  };

  const resolveContradiction = async (id: number, action: 'accept' | 'dismiss') => {
    try {
      await axios.patch(`${API}/contradictions`, { id, action });
      fetchContradictions();
    } catch { /* ignore */ }
  };

  const fetchCriticalPages = async () => {
    try {
      const res = await axios.get(`${API}/critical`);
      setCriticalPages(res.data.critical_pages || []);
    } catch { /* ignore */ }
  };

  const addCritical = async () => {
    if (!newCritical.trim()) return;
    try {
      await axios.post(`${API}/critical`, { title: newCritical.trim() });
      setNewCritical(''); fetchCriticalPages();
    } catch { /* ignore */ }
  };

  const removeCritical = async (title: string) => {
    try {
      await axios.delete(`${API}/critical`, { data: { title } });
      fetchCriticalPages();
    } catch { /* ignore */ }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await axios.get(`${API}/sync_status`);
      setSyncStatus(res.data);
    } catch { /* ignore */ }
  };

  const trackActivity = async (page: string) => {
    try {
      await axios.post(`${API}/track_activity`, { page, user: 'Me' }); // Simplified user
    } catch { /* ignore */ }
  };

  const fetchPresence = async () => {
    try {
      const res = await axios.get(`${API}/presence`);
      setPresence(res.data.presence || {});
    } catch { /* ignore */ }
  };

  const fetchTeam = async () => {
    try {
      const res = await axios.get(`${API}/team`);
      setTeam(res.data);
    } catch { /* ignore */ }
  };

  const fetchLocks = async () => {
    try {
      const res = await axios.get(`${API}/locks`);
      setLocks(res.data.locks || []);
    } catch { /* ignore */ }
  };

  const handleLock = async (pageTitle: string, user: string, force = false) => {
    try {
      const res = await axios.post(`${API}/locks`, { 
        page: pageTitle, 
        user, 
        action: 'lock', 
        force 
      });
      fetchLocks();
      return { success: true };
    } catch (err: any) {
      return { 
        success: false, 
        error: err.response?.data?.error || 'Lock failed',
        owner: err.response?.data?.owner
      };
    }
  };

  const handleUnlock = async (pageTitle: string, user: string, force = false) => {
    try {
      await axios.post(`${API}/locks`, { 
        page: pageTitle, 
        user, 
        action: 'unlock', 
        force 
      });
      fetchLocks();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Unlock failed' };
    }
  };

  const fetchConflicts = async () => {
    try {
      const res = await axios.get(`${API}/conflicts`);
      setConflicts(res.data.conflicts || []);
      if (res.data.conflicts?.length > 0) setMergeModalOpen(true);
    } catch { /* ignore */ }
  };

  const handleSync = async () => {
    setLoading(true);
    await fetchSyncStatus(); await fetchHistory(); await fetchConflicts();
    setLoading(false);
  };

  const fetchGraphData = async (options: {
    focus?: string;
    depth?: number;
    q?: string;
    includeGhost?: boolean;
    minDegree?: number;
    limitNodes?: number;
    limitLinks?: number;
  } = {}) => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const params: Record<string, string | number> = {};
      if (options.focus) params.focus = options.focus;
      if (typeof options.depth === 'number') params.depth = options.depth;
      if (typeof options.includeGhost === 'boolean') params.include_ghost = String(options.includeGhost);
      if (typeof options.minDegree === 'number') params.min_degree = options.minDegree;
      if (typeof options.limitNodes === 'number') params.limit_nodes = options.limitNodes;
      if (typeof options.limitLinks === 'number') params.limit_links = options.limitLinks;

      const res = await axios.get(`${API}/knowledge/graph`, { params });
      setGraphData({ nodes: res.data.nodes || [], links: res.data.links || [] });
      setGraphStats(res.data.stats || null);
      setGraphMeta(res.data.meta || null);
    } catch {
      setGraphError('Failed to load graph data.');
      setGraphData({ nodes: [], links: [] });
      setGraphStats(null);
      setGraphMeta(null);
    } finally {
      setGraphLoading(false);
    }
  };

  const fetchSuggestions = async (title: string) => {
    setSuggestionsLoading(true);
    try {
      const res = await axios.get(`${API}/suggestions?page=${encodeURIComponent(title)}`);
      setSuggestedLinks(res.data.suggestions || []);
    } catch { 
      setSuggestedLinks([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };


  const runLint = async () => {
    try {
      await axios.post(`${API}/lint/run`, { async: true });
      const statusRes = await axios.get(`${API}/lint/status`);
      setLintRuns(statusRes.data.runs || []);
    } catch { /* ignore */ }
  };

  const fetchLintFindings = async (runId?: number) => {
    try {
      const res = await axios.get(`${API}/lint/findings`, { params: runId ? { run_id: runId } : {} });
      setLintFindings(res.data.findings || []);
    } catch { /* ignore */ }
  };

  const fetchRemediationTasks = async () => {
    try {
      const res = await axios.get(`${API}/remediation/tasks`);
      setRemediationTasks(res.data.tasks || []);
    } catch { /* ignore */ }
  };

  const updateRemediationTask = async (id: number, status: string) => {
    try {
      await axios.patch(`${API}/remediation/update`, { id, status });
      await fetchRemediationTasks();
    } catch { /* ignore */ }
  };

  const fetchQueryArtifacts = async () => {
    try {
      const res = await axios.get(`${API}/query_artifacts`);
      setQueryArtifacts(res.data.artifacts || []);
    } catch { /* ignore */ }
  };

  const undoQueryArtifact = async (artifactId: number) => {
    try {
      await axios.post(`${API}/query_artifacts/undo`, { artifact_id: artifactId });
      await fetchQueryArtifacts();
    } catch { /* ignore */ }
  };


  const question = chatState.main.question;
  const setQuestion = (q: string) => setQuestionForSurface('main', q);
  const chatLog = chatState.main.chatLog;
  const chatMetaLog = chatState.main.chatLog.filter((m) => m.role === 'ai').map((m) => m.meta || {});
  const chatMode = chatState.main.chatMode;
  const chatContext = chatState.main.chatContext;
  const chatLoading = chatState.main.chatLoading;
  const chatEndRef = mainChatEndRef;
  const getChatState = (surface: ChatSurface) => ({
    question: chatState[surface].question,
    chatLog: chatState[surface].chatLog,
    chatLoading: chatState[surface].chatLoading,
    chatMode: chatState[surface].chatMode,
    chatContext: chatState[surface].chatContext,
    chatEndRef: getChatEndRef(surface),
  });

  return (
    <WikiContext.Provider value={{
      file, setFile, url, setUrl, autoApprove, setAutoApprove, loading, result, setResult, handleIngest, handleApprove,
      question, setQuestion, chatLog, chatMetaLog, chatMode, chatContext, chatLoading, chatEndRef, handleChat, ask, retry, clearConversation, setContext, getChatState, setQuestionForSurface,
      wikiPages, fetchWikiPages,
      gitHistory, fetchHistory, handleRevert,
      pullRequests, fetchPullRequests, approvePullRequest,
      contradictions, fetchContradictions, resolveContradiction, criticalPages, newCritical, setNewCritical, addCritical, removeCritical,
      syncStatus, team, hubMode, setHubMode, remoteUrl, setRemoteUrl, conflicts, handleSync, fetchConflicts,
      modalDiff, setModalDiff, mergeModalOpen, setMergeModalOpen,
      presence, trackActivity, fetchPresence,
      locks, fetchLocks, handleLock, handleUnlock,
      graphData, graphStats, graphMeta, graphLoading, graphError, fetchGraphData, trackMetricEvent,
      suggestedLinks, suggestionsLoading, fetchSuggestions,
      runLint, lintRuns, lintFindings, remediationTasks, fetchLintFindings, fetchRemediationTasks, updateRemediationTask,
      fetchQueryArtifacts, queryArtifacts, undoQueryArtifact,
      zenMode, setZenMode
    }}>
      {children}
    </WikiContext.Provider>
  );
};

export const useWiki = () => {
  const context = useContext(WikiContext);
  if (context === undefined) throw new Error('useWiki must be used within a WikiProvider');
  return context;
};
