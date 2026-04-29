import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import type { TeamPage } from '@/types/team';
import './KnowledgeFlow.css';

export const KnowledgeFlow = () => {
  const { currentTeam, mode } = useWorkspace();
  const [personalPages] = useState<TeamPage[]>([
    { id: 'p1', title: 'My Personal Notes', scope: 'personal', page_type: 'standard', publish_level: 'draft', content: '', created_at: '', updated_at: '', is_canonical: false },
    { id: 'p2', title: 'Private Research', scope: 'personal', page_type: 'knowledge_node', publish_level: 'draft', content: '', created_at: '', updated_at: '', is_canonical: false },
  ]);
  const [teamPages] = useState<TeamPage[]>([
    { id: 't1', title: 'Team Strategy', scope: 'team', page_type: 'decision', publish_level: 'canonical', content: '', created_at: '', updated_at: '', team_id: currentTeam?.id, is_canonical: true },
    { id: 't2', title: 'Shared SOP', scope: 'team', page_type: 'shared_sop', publish_level: 'team_shared', content: '', created_at: '', updated_at: '', team_id: currentTeam?.id, is_canonical: false },
  ]);
  const [action, setAction] = useState<'share' | 'fork' | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>('');

  const handleShareToTeam = async () => {
    if (!selectedPage || !currentTeam) return;
    try {
      await teamApi.sharePageToTeam(currentTeam.id, {
        page_id: selectedPage,
        preserve_origin: true,
        mark_source_author: true,
      });
      alert('Page shared to team successfully!');
      setAction(null);
      setSelectedPage('');
    } catch (err) {
      console.error('Failed to share page:', err);
    }
  };

  const handleForkToPersonal = async () => {
    if (!selectedPage) return;
    try {
      await teamApi.forkPageToPersonal(currentTeam?.id || '', {
        page_id: selectedPage,
      });
      alert('Page forked to personal space!');
      setAction(null);
      setSelectedPage('');
    } catch (err) {
      console.error('Failed to fork page:', err);
    }
  };

  return (
    <div className="knowledge-flow">
      <div className="flow-header">
        <h2>Knowledge Flow</h2>
        <p className="flow-description">
          Move knowledge between Personal and Team spaces
        </p>
      </div>

      <div className="flow-actions">
        <button
          className={`flow-btn ${action === 'share' ? 'active' : ''}`}
          onClick={() => {
            setAction('share');
            setSelectedPage('');
          }}
        >
          📤 Share to Team
        </button>
        <button
          className={`flow-btn ${action === 'fork' ? 'active' : ''}`}
          onClick={() => {
            setAction('fork');
            setSelectedPage('');
          }}
        >
          🍴 Fork to Personal
        </button>
      </div>

      {action === 'share' && (
        <div className="flow-panel">
          <h3>Share Personal Page to Team</h3>
          <p className="flow-info">
            Clones page to team, preserves origin, marks source author, adds team ownership layer.
          </p>
          <div className="page-selection">
            <h4>Select Personal Page:</h4>
            {personalPages.map(page => (
              <div
                key={page.id}
                className={`page-option ${selectedPage === page.id ? 'selected' : ''}`}
                onClick={() => setSelectedPage(page.id)}
              >
                <span className="page-title">{page.title}</span>
                <span className="page-type">{page.page_type}</span>
              </div>
            ))}
          </div>
          <button
            className="action-btn share-btn"
            onClick={handleShareToTeam}
            disabled={!selectedPage}
          >
            Share to Team "{currentTeam?.name}"
          </button>
        </div>
      )}

      {action === 'fork' && (
        <div className="flow-panel">
          <h3>Fork Team Page to Personal</h3>
          <p className="flow-info">
            Creates private copy, independent evolution in your personal space.
          </p>
          <div className="page-selection">
            <h4>Select Team Page:</h4>
            {teamPages.map(page => (
              <div
                key={page.id}
                className={`page-option ${selectedPage === page.id ? 'selected' : ''}`}
                onClick={() => setSelectedPage(page.id)}
              >
                <span className="page-title">{page.title}</span>
                <span className="page-type">{page.page_type}</span>
              </div>
            ))}
          </div>
          <button
            className="action-btn fork-btn"
            onClick={handleForkToPersonal}
            disabled={!selectedPage}
          >
            Fork to Personal
          </button>
        </div>
      )}

      <div className="flow-diagram">
        <h3>Flow Diagram</h3>
        <div className="diagram">
          <div className="flow-box personal">
            <h4>Personal Space</h4>
            <p>My Pages</p>
            <p>My Graph</p>
            <p>Private AI</p>
          </div>
          <div className="flow-arrow">⇄</div>
          <div className="flow-box team">
            <h4>Team Space</h4>
            <p>Team Pages</p>
            <p>Team Graph</p>
            <p>Shared AI</p>
          </div>
        </div>
        <div className="flow-explanation">
          <p><strong>Draft → Team Review → Approved Team Page</strong></p>
          <p>Team Internal Flow</p>
        </div>
      </div>
    </div>
  );
};