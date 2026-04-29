import { useState, useCallback } from 'react';
import axios from 'axios';

export function useWikiLinter(API: string) {
  const [suggestedLinks, setSuggestedLinks] = useState<{ title: string; score: number }[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [lintRuns, setLintRuns] = useState<any[]>([]);
  const [lintFindings, setLintFindings] = useState<any[]>([]);
  const [remediationTasks, setRemediationTasks] = useState<any[]>([]);
  const [queryArtifacts, setQueryArtifacts] = useState<any[]>([]);

  const fetchSuggestions = useCallback(async (pageTitle: string) => {
    if (!pageTitle) return;
    setSuggestionsLoading(true);
    try {
      const res = await axios.get(`${API}/suggestions`, { params: { page: pageTitle } });
      setSuggestedLinks(res.data.suggestions || []);
    } catch { /* ignore */ }
    finally {
      setSuggestionsLoading(false);
    }
  }, [API]);

  const runLint = useCallback(async () => {
    try {
      await axios.post(`${API}/lint/run`, { async: true });
      const statusRes = await axios.get(`${API}/lint/status`);
      setLintRuns(statusRes.data.runs || []);
    } catch { /* ignore */ }
  }, [API]);

  const fetchLintFindings = useCallback(async (runId?: number) => {
    try {
      const res = await axios.get(`${API}/lint/findings`, { params: runId ? { run_id: runId } : {} });
      setLintFindings(res.data.findings || []);
    } catch { /* ignore */ }
  }, [API]);

  const fetchRemediationTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/remediation/tasks`);
      setRemediationTasks(res.data.tasks || []);
    } catch { /* ignore */ }
  }, [API]);

  const updateRemediationTask = useCallback(async (id: number, status: string) => {
    try {
      await axios.patch(`${API}/remediation/update`, { id, status });
      await fetchRemediationTasks();
    } catch { /* ignore */ }
  }, [API, fetchRemediationTasks]);

  const fetchQueryArtifacts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/query_artifacts`);
      setQueryArtifacts(res.data.artifacts || []);
    } catch { /* ignore */ }
  }, [API]);

  const undoQueryArtifact = useCallback(async (artifactId: number) => {
    try {
      await axios.post(`${API}/query_artifacts/undo`, { artifact_id: artifactId });
      await fetchQueryArtifacts();
    } catch { /* ignore */ }
  }, [API, fetchQueryArtifacts]);

  return {
    suggestedLinks,
    suggestionsLoading,
    fetchSuggestions,
    runLint,
    lintRuns,
    lintFindings,
    remediationTasks,
    fetchLintFindings,
    fetchRemediationTasks,
    updateRemediationTask,
    fetchQueryArtifacts,
    queryArtifacts,
    undoQueryArtifact,
  };
}
