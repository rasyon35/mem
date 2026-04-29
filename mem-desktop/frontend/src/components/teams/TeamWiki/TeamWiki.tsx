import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamPage, PageType, PublishLevel } from '@/types/team';
import './TeamWiki.css';

export const TeamWiki = () => {
  const { currentTeam } = useWorkspace();
  const [pages, setPages] = useState<TeamPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<TeamPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<PageType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentTeam) return;
    loadPages();
  }, [currentTeam]);

  useEffect(() => {
    filterPages();
  }, [pages, filter, searchQuery]);

  const loadPages = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const data = await teamApi.getTeamPages(currentTeam.id);
      setPages(data);
    } catch (err) {
      console.error('Failed to load pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterPages = () => {
    let filtered = pages;
    if (filter !== 'all') {
      filtered = filtered.filter(p => p.page_type === filter);
    }
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredPages(filtered);
  };

  const handleCreatePage = async (title: string, content: string, pageType: PageType) => {
    if (!currentTeam) return;
    try {
      await teamApi.createTeamPage(currentTeam.id, title, content, pageType);
      setShowCreateModal(false);
      loadPages();
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const getPageTypeIcon = (type: PageType) => {
    switch (type) {
      case 'standard': return '📄';
      case 'shared_sop': return '📋';
      case 'decision': return '⚖️';
      case 'knowledge_node': return '🧠';
      case 'meeting_synthesis': return '📝';
      default: return '📄';
    }
  };

  if (!currentTeam) return <div className="team-wiki-empty">No team selected</div>;

  return (
    <div className="team-wiki">
      <div className="wiki-header">
        <h2>Team Wiki</h2>
        <div className="wiki-actions">
          <input
            type="text"
            placeholder="Search pages..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as PageType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="standard">Standard</option>
            <option value="shared_sop">SOP</option>
            <option value="decision">Decision</option>
            <option value="knowledge_node">Knowledge Node</option>
            <option value="meeting_synthesis">Meeting Synthesis</option>
          </select>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            + New Page
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading wiki pages...</div>
      ) : (
        <div className="wiki-content">
          <div className="pages-grid">
            {filteredPages.map(page => (
              <div key={page.id} className={`page-card ${page.publish_level}`}>
                <div className="page-card-header">
                  <span className="page-icon">{getPageTypeIcon(page.page_type)}</span>
                  <h3 className="page-card-title">{page.title}</h3>
                  <span className={`publish-badge ${page.publish_level}`}>
                    {page.publish_level}
                  </span>
                </div>
                <p className="page-preview">
                  {page.content.substring(0, 150)}
                  {page.content.length > 150 ? '...' : ''}
                </p>
                <div className="page-card-footer">
                  <span className="page-type">{page.page_type}</span>
                  <span className="page-date">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredPages.length === 0 && (
            <div className="empty-state">
              <p>No pages found. Create your first team page!</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreatePageModal
          onSubmit={handleCreatePage}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

// Create Page Modal Component
const CreatePageModal = ({
  onSubmit,
  onClose,
}: {
  onSubmit: (title: string, content: string, pageType: PageType) => void;
  onClose: () => void;
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pageType, setPageType] = useState<PageType>('standard');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Create Team Page</h3>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
          />
        </div>
        <div className="form-group">
          <label>Page Type</label>
          <select value={pageType} onChange={(e) => setPageType(e.target.value as PageType)}>
            <option value="standard">Standard Page</option>
            <option value="shared_sop">Shared SOP</option>
            <option value="decision">Decision Page</option>
            <option value="knowledge_node">Knowledge Node</option>
            <option value="meeting_synthesis">Meeting Synthesis</option>
          </select>
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Page content (markdown supported)"
            rows={8}
          />
        </div>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="submit-btn"
            onClick={() => onSubmit(title, content, pageType)}
            disabled={!title.trim()}
          >
            Create Page
          </button>
        </div>
      </div>
    </div>
  );
};