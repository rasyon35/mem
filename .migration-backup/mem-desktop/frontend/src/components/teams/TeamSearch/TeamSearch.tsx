import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import './TeamSearch.css';

interface SearchResult {
  id: string;
  type: 'page' | 'chat' | 'decision' | 'graph_node';
  title: string;
  snippet: string;
  relevance: number;
}

export const TeamSearch = () => {
  const { currentTeam, mode } = useWorkspace();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchScope, setSearchScope] = useState<'team' | 'all_teams' | 'personal'>('team');

  const handleSearch = async () => {
    if (!query.trim() || !currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.searchTeam(
        currentTeam.id,
        query,
        searchScope === 'team' ? 'team' : 'all_teams'
      );
      // Mock transformation - adjust based on actual API response
      setResults(
        data.results?.map((r: any) => ({
          id: r.id,
          type: r.type || 'page',
          title: r.title || 'Untitled',
          snippet: r.snippet || r.content?.substring(0, 150) || '',
          relevance: r.relevance || 0.8,
        })) || []
      );
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'page': return '📄';
      case 'chat': return '💬';
      case 'decision': return '⚖️';
      case 'graph_node': return '🔵';
      default: return '📄';
    }
  };

  return (
    <div className="team-search">
      <div className="search-header">
        <h2>Team Search</h2>
        <p className="search-description">
          Semantic search across team wiki, chat, decisions, and graph
        </p>
      </div>

      <div className="search-controls">
        <div className="scope-selector">
          <button
            className={`scope-btn ${searchScope === 'personal' ? 'active' : ''}`}
            onClick={() => setSearchScope('personal')}
          >
            Personal
          </button>
          <button
            className={`scope-btn ${searchScope === 'team' ? 'active' : ''}`}
            onClick={() => setSearchScope('team')}
          >
            Current Team
          </button>
          <button
            className={`scope-btn ${searchScope === 'all_teams' ? 'active' : ''}`}
            onClick={() => setSearchScope('all_teams')}
          >
            All Teams
          </button>
        </div>

        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search team knowledge..."
            className="search-input"
          />
          <button
            className="search-btn"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      <div className="search-results">
        {loading ? (
          <div className="loading">Searching across team resources...</div>
        ) : (
          <>
            {results.length > 0 && (
              <div className="results-info">
                Found {results.length} results
              </div>
            )}
            {results.map(result => (
              <div key={result.id} className="result-card">
                <div className="result-header">
                  <span className="result-icon">{getResultIcon(result.type)}</span>
                  <h4 className="result-title">{result.title}</h4>
                  <span className="result-type">{result.type}</span>
                  <span className="result-relevance">
                    {Math.round(result.relevance * 100)}% match
                  </span>
                </div>
                <p className="result-snippet">{result.snippet}</p>
              </div>
            ))}
            {!loading && results.length === 0 && query && (
              <div className="empty-state">
                <p>No results found. Try a different search term.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};