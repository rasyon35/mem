import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export interface ClusterSynthesis {
  summary: string;
  keyThemes: string[];
  connections: string[];
}

export interface MissingLinkSuggestion {
  fromNode: string;
  toNode: string;
  reason: string;
  strength: number;
}

export async function synthesizeCluster(
  nodeIds: string[],
  nodeNames: string[]
): Promise<ClusterSynthesis> {
  try {
    const res = await axios.post(`${API}/synthesize_cluster`, {
      nodes: nodeIds,
      names: nodeNames,
    });
    return res.data;
  } catch (err) {
    return {
      summary: 'Failed to synthesize cluster relationships.',
      keyThemes: [],
      connections: [],
    };
  }
}

export async function suggestMissingLinks(
  nodeId: string,
  relatedNodeIds: string[]
): Promise<MissingLinkSuggestion[]> {
  try {
    const res = await axios.post(`${API}/suggest_links`, {
      node: nodeId,
      related: relatedNodeIds,
    });
    return res.data.suggestions || [];
  } catch (err) {
    return [];
  }
}

export async function generateBridgeSuggestion(
  nodeA: string,
  nodeB: string
): Promise<string> {
  try {
    const res = await axios.get(
      `${API}/bridge_suggestion`,
      { params: { from: nodeA, to: nodeB } }
    );
    return res.data.suggestion || 'No bridge suggestion available.';
  } catch (err) {
    return 'Failed to generate bridge suggestion.';
  }
}

export function calculateHubScore(node: any, allNodes: any[]): number {
  let score = 0;
  score += (node.degree || 0) * 10;
  if (node.is_hub) score += 50;
  if (node.summary) score += 20;
  return Math.min(score, 100);
}

export function findPotentialHubs(
  nodes: any[],
  threshold: number = 30
): string[] {
  return nodes
    .filter(n => (n.degree || 0) >= threshold || n.is_hub)
    .map(n => n.id);
}
