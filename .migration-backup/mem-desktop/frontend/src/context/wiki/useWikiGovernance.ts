import { useState, useCallback } from 'react';
import axios from 'axios';

export function useWikiGovernance(API: string) {
  const [gitHistory, setGitHistory] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [criticalPages, setCriticalPages] = useState<any[]>([]);
  const [newCritical, setNewCritical] = useState('');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [team, setTeam] = useState<any>({ admins: [], editors: [], contributors: [], viewers: [] });
  const [locks, setLocks] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  const fetchHistory = useCallback(async (pageTitle?: string) => {
    try {
      const url = pageTitle ? `${API}/history?page=${encodeURIComponent(pageTitle)}` : `${API}/history`;
      const res = await axios.get(url);
      setGitHistory(res.data.commits || []);
    } catch { /* ignore */ }
  }, [API]);

  const handleRevert = useCallback(async (hash: string, fetchWikiPages: () => void) => {
    if (!confirm('Revert wiki?')) return;
    try {
      await axios.post(`${API}/revert`, { commit_hash: hash });
      fetchHistory(); 
      fetchWikiPages();
    } catch { alert('Revert failed'); }
  }, [API, fetchHistory]);

  const fetchPullRequests = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/pull_requests`);
      setPullRequests(res.data.pull_requests || []);
    } catch { /* ignore */ }
  }, [API]);

  const approvePullRequest = useCallback(async (branchName: string) => {
    try {
      await axios.post(`${API}/approve`, { changes: { branch_name: branchName } });
      await fetchPullRequests();
      await fetchHistory();
    } catch { alert('Failed to merge pull request'); }
  }, [API, fetchPullRequests, fetchHistory]);

  const fetchContradictions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/contradictions`);
      setContradictions(res.data.contradictions || []);
    } catch { /* ignore */ }
  }, [API]);

  const resolveContradiction = useCallback(async (id: number, action: 'accept' | 'dismiss') => {
    try {
      await axios.patch(`${API}/contradictions`, { id, action });
      fetchContradictions();
    } catch { /* ignore */ }
  }, [API, fetchContradictions]);

  const fetchCriticalPages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/critical`);
      setCriticalPages(res.data.critical_pages || []);
    } catch { /* ignore */ }
  }, [API]);

  const addCritical = useCallback(async () => {
    if (!newCritical.trim()) return;
    try {
      await axios.post(`${API}/critical`, { title: newCritical.trim() });
      setNewCritical(''); 
      fetchCriticalPages();
    } catch { /* ignore */ }
  }, [API, newCritical, fetchCriticalPages]);

  const removeCritical = useCallback(async (title: string) => {
    try {
      await axios.delete(`${API}/critical`, { data: { title } });
      fetchCriticalPages();
    } catch { /* ignore */ }
  }, [API, fetchCriticalPages]);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sync_status`);
      setSyncStatus(res.data);
    } catch { /* ignore */ }
  }, [API]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/team`);
      setTeam(res.data);
    } catch { /* ignore */ }
  }, [API]);

  const fetchLocks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/locks`);
      setLocks(res.data.locks || []);
    } catch { /* ignore */ }
  }, [API]);

  const handleLock = useCallback(async (pageTitle: string, user: string, force = false) => {
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
  }, [API, fetchLocks]);

  const handleUnlock = useCallback(async (pageTitle: string, user: string, force = false) => {
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
  }, [API, fetchLocks]);

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/conflicts`);
      setConflicts(res.data.conflicts || []);
      if (res.data.conflicts?.length > 0) setMergeModalOpen(true);
    } catch { /* ignore */ }
  }, [API]);

  return {
    gitHistory, fetchHistory, handleRevert,
    pullRequests, fetchPullRequests, approvePullRequest,
    contradictions, fetchContradictions, resolveContradiction,
    criticalPages, newCritical, setNewCritical, addCritical, removeCritical,
    syncStatus, fetchSyncStatus,
    team, fetchTeam,
    locks, fetchLocks, handleLock, handleUnlock,
    conflicts, fetchConflicts,
    mergeModalOpen, setMergeModalOpen
  };
}
