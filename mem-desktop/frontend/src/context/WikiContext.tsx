'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export type WikiPage = { title: string; description: string; type?: string; category?: string };
export type ChatMsg = { role: 'user' | 'ai'; text: string };

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
  chatLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleChat: () => Promise<void>;

  // Wiki
  wikiPages: WikiPage[];
  selectedPage: { title: string; content: string } | null; setSelectedPage: (p: { title: string; content: string } | null) => void;
  fetchWikiPages: () => Promise<void>;
  openPage: (title: string) => Promise<void>;

  // Timeline & History
  gitHistory: any[];
  fetchHistory: (pageTitle?: string) => Promise<void>;
  handleRevert: (hash: string) => Promise<void>;

  // Settings
  contradictions: any[];
  resolveContradiction: (id: number, action: 'accept' | 'dismiss') => Promise<void>;
  criticalPages: any[];
  newCritical: string; setNewCritical: (s: string) => void;
  addCritical: () => Promise<void>;
  removeCritical: (title: string) => Promise<void>;

  // Collaboration
  syncStatus: any;
  team: any;
  locks: any[];
  hubMode: boolean; setHubMode: (v: boolean) => void;
  remoteUrl: string; setRemoteUrl: (s: string) => void;
  conflicts: any[];
  handleSync: () => Promise<void>;
  fetchConflicts: () => Promise<void>;

  // UI Modals
  modalDiff: { open: boolean; old: string; new: string; title: string };
  setModalDiff: (d: any) => void;
  mergeModalOpen: boolean; setMergeModalOpen: (v: boolean) => void;
  // Presence
  presence: Record<string, { user: string; last_seen: number }>;
  trackActivity: (page: string) => Promise<void>;
  fetchPresence: () => Promise<void>;
  // Graph
  graphData: { nodes: any[]; links: any[] };
  fetchGraphData: () => Promise<void>;
}

const WikiContext = createContext<WikiContextType | undefined>(undefined);

export const WikiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);

  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<{ title: string; content: string } | null>(null);
  const [gitHistory, setGitHistory] = useState<any[]>([]);
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Background Presence Fetch
  useEffect(() => {
    fetchPresence();
    const interval = setInterval(fetchPresence, 5000);
    return () => clearInterval(interval);
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
    } catch {
      setResult({ error: 'Request failed' });
    } finally { setLoading(false); }
  };

  const handleApprove = async () => {
    if (!result?.proposed_changes) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/approve`, { changes: result.proposed_changes });
      setResult({ ...res.data });
      fetchHistory();
    } catch {
      setResult({ error: 'Approval request failed' });
    } finally { setLoading(false); }
  };

  const handleChat = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setChatLog(prev => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { question: q });
      setChatLog(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch {
      setChatLog(prev => [...prev, { role: 'ai', text: '⚠️ Could not reach backend.' }]);
    } finally { setChatLoading(false); }
  };

  const fetchWikiPages = async () => {
    try {
      const res = await axios.get(`${API}/wiki`);
      setWikiPages(res.data.pages || []);
    } catch { /* ignore */ }
  };

  const openPage = async (title: string) => {
    try {
      const res = await axios.get(`${API}/wiki/${encodeURIComponent(title)}`);
      setSelectedPage(res.data);
    } catch { /* ignore */ }
  };

  const fetchHistory = async (pageTitle?: string) => {
    try {
      const url = pageTitle ? `${API}/history?page=${encodeURIComponent(pageTitle)}` : `${API}/history`;
      const res = await axios.get(url);
      setGitHistory(res.data.commits || []);
    } catch { /* ignore */ }
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

  const fetchGraphData = async () => {
    try {
      const res = await axios.get(`${API}/graph`);
      setGraphData(res.data);
    } catch { /* ignore */ }
  };

  return (
    <WikiContext.Provider value={{
      file, setFile, url, setUrl, autoApprove, setAutoApprove, loading, result, setResult, handleIngest, handleApprove,
      question, setQuestion, chatLog, chatLoading, chatEndRef, handleChat,
      wikiPages, selectedPage, setSelectedPage, fetchWikiPages, openPage,
      gitHistory, fetchHistory, handleRevert,
      contradictions, resolveContradiction, criticalPages, newCritical, setNewCritical, addCritical, removeCritical,
      syncStatus, team, locks, hubMode, setHubMode, remoteUrl, setRemoteUrl, conflicts, handleSync, fetchConflicts,
      modalDiff, setModalDiff, mergeModalOpen, setMergeModalOpen,
      presence, trackActivity, fetchPresence,
      graphData, fetchGraphData
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
