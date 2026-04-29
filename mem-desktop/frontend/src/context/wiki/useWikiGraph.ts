import { useState, useCallback } from 'react';
import axios from 'axios';

export function useWikiGraph(API: string) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [graphStats, setGraphStats] = useState<any>(null);
  const [graphMeta, setGraphMeta] = useState<any>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const fetchGraphData = useCallback(async (options: any = {}) => {
    setGraphLoading(true);
    setGraphError(null);
    try {
      const res = await axios.get(`${API}/knowledge/graph`, { params: options });
      setGraphData({
        nodes: res.data.nodes || [],
        links: res.data.links || [],
      });
      setGraphStats(res.data.stats || null);
      setGraphMeta(res.data.meta || null);
    } catch (err) {
      setGraphError('Failed to load graph data');
    } finally {
      setGraphLoading(false);
    }
  }, [API]);

  return {
    graphData,
    graphStats,
    graphMeta,
    graphLoading,
    graphError,
    fetchGraphData,
  };
}
