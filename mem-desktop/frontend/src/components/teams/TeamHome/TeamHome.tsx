import { useEffect, useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '@/lib/teamApi';
import type { TeamPage, TeamNotification, KnowledgeConflict } from '@/types/team';
import './TeamHome.css';

export const TeamHome = () => {
  const { currentTeam } = useWorkspace();
  const [recentPages, setRecentPages] = useState<TeamPage[]>([]);
  const [notifications, setNotifications] = useState<TeamNotification[]>([]);
  const [conflicts, setConflicts] = useState<KnowledgeConflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTeam) return;
    loadTeamData();
  }, [currentTeam]);

  const loadTeamData = async () => {
    if (!currentTeam) return;
    setLoading(true);
    try {
      const [pages, notifs, confs] = await Promise.all([
        teamApi.pages(currentTeam.id),
        teamApi.notifications(currentTeam.id),
        teamApi.conflicts(currentTeam.id),
      ]);
      setRecentPages((pages as any).slice(0, 5));
      setNotifications((notifs as any).filter((n: TeamNotification) => !n.read));
      setConflicts((confs as any).filter((c: KnowledgeConflict) => c.status === 'detected' || c.status === 'in_review'));
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentTeam) return <div className="team-home-empty">No team selected</div>;

  return (
    <div className="team-home">
      <div className="team-home-header">
        <h2>{currentTeam.name} — Team Home</h2>
        <p className="team-description">{currentTeam.description}</p>
      </div>

      {loading ? (
        <div className="loading">Loading team data...</div>
      ) : (
        <div className="team-home-grid">
          {/* Recent Pages */}
          <div className="home-card">
            <h3>Recent Pages</h3>
            <ul className="page-list">
              {recentPages.map(page => (
                <li key={page.id} className="page-item">
                  <span className={`page-type-badge ${page.page_type}`}>{page.page_type}</span>
                  <span className="page-title">{page.title}</span>
                  <span className={`publish-level ${page.publish_level}`}>{page.publish_level}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Team Activity */}
          <div className="home-card">
            <h3>Team Activity</h3>
            <div className="activity-feed">
              {notifications.map(notif => (
                <div key={notif.id} className="activity-item">
                  <span className={`notification-type ${notif.type}`}></span>
                  <span>{notif.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shared Uploads */}
          <div className="home-card">
            <h3>Shared Uploads</h3>
            <p className="placeholder-text">Team upload system coming soon</p>
          </div>

          {/* Team Graph Snapshot */}
          <div className="home-card">
            <h3>Team Graph Snapshot</h3>
            <p className="placeholder-text">Graph visualization coming soon</p>
          </div>

          {/* Open Discussions */}
          <div className="home-card">
            <h3>Open Discussions</h3>
            <p className="placeholder-text">Team chat integration coming soon</p>
          </div>

          {/* Pending Approvals */}
          <div className="home-card">
            <h3>Pending Approvals</h3>
            {conflicts.length > 0 ? (
              <ul className="conflict-list">
                {conflicts.map(conflict => (
                  <li key={conflict.id} className="conflict-item">
                    <span className="conflict-status">{conflict.status}</span>
                    <span>Conflict detected</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-pending">No pending approvals</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};