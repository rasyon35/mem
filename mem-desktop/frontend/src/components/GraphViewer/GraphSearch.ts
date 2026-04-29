import { GraphNode, SearchResult } from './GraphTypes';

export interface SearchQuery {
  term: string;
  filters: {
    tag?: string;
    hub?: boolean;
    minDegree?: number;
    ghost?: boolean;
    relatedTo?: string;
  };
}

export function parseSearchInput(input: string): SearchQuery {
  const filters: SearchQuery['filters'] = {};
  let term = input.trim();
  
  // Parse commands
  const tagMatch = term.match(/tag:(\S+)/);
  if (tagMatch) {
    filters.tag = tagMatch[1];
    term = term.replace(/tag:\S+/, '').trim();
  }
  
  const hubMatch = term.match(/hub:(true|false)/);
  if (hubMatch) {
    filters.hub = hubMatch[1] === 'true';
    term = term.replace(/hub:\S+/, '').trim();
  }
  
  const degreeMatch = term.match(/degree>(\d+)/);
  if (degreeMatch) {
    filters.minDegree = parseInt(degreeMatch[1]);
    term = term.replace(/degree>\d+/, '').trim();
  }
  
  const ghostMatch = term.match(/ghost:(true|false)/);
  if (ghostMatch) {
    filters.ghost = ghostMatch[1] === 'true';
    term = term.replace(/ghost:\S+/, '').trim();
  }
  
  const relatedMatch = term.match(/related:(\S+)/);
  if (relatedMatch) {
    filters.relatedTo = relatedMatch[1];
    term = term.replace(/related:\S+/, '').trim();
  }
  
  return { term, filters };
}

export function semanticSearch(
  query: string,
  nodes: GraphNode[],
  edges: { fromId: string; toId: string }[],
  neighborMap: Map<string, Set<string>>
): SearchResult[] {
  if (!query.trim()) return [];
  
  const parsed = parseSearchInput(query);
  const results: SearchResult[] = [];
  const queryLower = parsed.term.toLowerCase();
  
  nodes.forEach(node => {
    let score = 0;
    let matchType: SearchResult['matchType'] = 'exact';
    
    // Apply filters
    if (parsed.filters.tag && node.category !== parsed.filters.tag) return;
    if (parsed.filters.hub !== undefined && node.is_hub !== parsed.filters.hub) return;
    if (parsed.filters.minDegree !== undefined && node.degree < parsed.filters.minDegree) return;
    if (parsed.filters.ghost !== undefined && node.type === 'ghost' !== parsed.filters.ghost) return;
    
    const nameLower = node.name.toLowerCase();
    
    // Exact match
    if (nameLower === queryLower) {
      score = 100;
      matchType = 'exact';
    }
    // Starts with
    else if (nameLower.startsWith(queryLower)) {
      score = 80;
      matchType = 'exact';
    }
    // Contains
    else if (nameLower.includes(queryLower)) {
      score = 60;
      matchType = 'exact';
    }
    
    // Fuzzy match
    if (score === 0) {
      const fuzzyScore = fuzzyMatch(queryLower, nameLower);
      if (fuzzyScore > 0.6) {
        score = fuzzyScore * 50;
        matchType = 'fuzzy';
      }
    }
    
    // Category match
    if (score === 0 && node.category?.toLowerCase().includes(queryLower)) {
      score = 40;
      matchType = 'category';
    }
    
    // Connected nodes
    if (parsed.filters.relatedTo) {
      const relatedTo = parsed.filters.relatedTo.toLowerCase();
      const relatedNode = nodes.find(n => n.name.toLowerCase().includes(relatedTo));
      if (relatedNode && neighborMap.get(relatedNode.id)?.has(node.id)) {
        score = 70;
        matchType = 'connected';
      }
    }
    
    // Backlink/mention (based on degree)
    if (score === 0 && node.degree > 5) {
      score = Math.min(node.degree * 2, 30);
      matchType = 'backlink';
    }
    
    if (score > 0) {
      results.push({ nodeId: node.id, score, matchType });
    }
  });
  
  return results.sort((a, b) => b.score - a.score);
}

function fuzzyMatch(query: string, target: string): number {
  if (query.length === 0) return 1;
  if (target.length === 0) return 0;
  
  const dp: number[][] = Array(query.length + 1)
    .fill(null)
    .map(() => Array(target.length + 1).fill(0));
  
  for (let i = 0; i <= query.length; i++) dp[i][0] = i;
  for (let j = 0; j <= target.length; j++) dp[0][j] = j;
  
  for (let i = 1; i <= query.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      if (query[i - 1] === target[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }
  
  const maxLen = Math.max(query.length, target.length);
  return maxLen === 0 ? 1 : 1 - dp[query.length][target.length] / maxLen;
}

export function buildNeighborMap(
  edges: { fromId: string; toId: string }[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  
  edges.forEach(e => {
    if (!map.has(e.fromId)) map.set(e.fromId, new Set());
    if (!map.has(e.toId)) map.set(e.toId, new Set());
    map.get(e.fromId)!.add(e.toId);
    map.get(e.toId)!.add(e.fromId);
  });
  
  return map;
}
