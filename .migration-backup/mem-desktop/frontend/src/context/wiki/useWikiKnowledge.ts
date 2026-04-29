import { useState, useCallback } from 'react';
import axios from 'axios';
import { IngestResult } from './types';

export function useWikiKnowledge(API: string, trackMetricEvent: any) {
  const [wikiPages, setWikiPages] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  
  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>(null);

  const fetchWikiPages = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/wiki/markdown-files`);
      const pages = (res.data.pages || []).map((p: any) => ({
        id: p.id,
        title: p.title || p.slug,
        slug: p.slug,
        category: p.topic_name || 'Knowledge',
        updated_at: p.updated_at || p.created_at || null,
      }));
      setWikiPages(pages);
    } catch { /* ignore */ }
  }, [API]);

  const handleIngest = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (url) formData.append('url', url);
      formData.append('auto_approve', String(autoApprove));

      const res = await axios.post(`${API}/ingest`, formData);
      setResult(res.data);
      
      if (res.data.status === 'staged') {
        setPendingChanges(res.data.proposed_changes);
        setIsReviewModalOpen(true);
      } else {
        fetchWikiPages();
      }

      await trackMetricEvent('frontend_ingest_completed', {
        source_type: file ? 'file' : 'url',
        has_error: Boolean(res.data?.error),
        status: res.data?.status || 'unknown',
      });
    } catch {
      setResult({ error: 'Ingest failed' });
      await trackMetricEvent('frontend_ingest_completed', {
        source_type: file ? 'file' : 'url',
        has_error: true,
        status: 'failed',
      });
    } finally {
      setLoading(false);
    }
  }, [API, file, url, autoApprove, fetchWikiPages, trackMetricEvent]);

  const handleApprove = useCallback(async (customChanges?: any) => {
    const changesToApprove = customChanges || pendingChanges || result?.proposed_changes;
    if (!changesToApprove) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/approve`, { changes: changesToApprove });
      setResult({ ...res.data });
      setIsReviewModalOpen(false);
      setPendingChanges(null);
      fetchWikiPages();
      
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
    } finally {
      setLoading(false);
    }
  }, [API, pendingChanges, result, fetchWikiPages, trackMetricEvent]);

  return {
    wikiPages,
    fetchWikiPages,
    file,
    setFile,
    url,
    setUrl,
    autoApprove,
    setAutoApprove,
    loading,
    result,
    setResult,
    handleIngest,
    handleApprove,
    isReviewModalOpen,
    setIsReviewModalOpen,
    pendingChanges,
    setPendingChanges
  };
}
