import { useWorkspace } from '@/context/WorkspaceContext';
import './WorkspaceSwitcher.css';

export const WorkspaceSwitcher = () => {
  const { mode, currentTeam, userTeams, setCurrentTeam, setShowTeamCreation } = useWorkspace();

  const getTeamColor = (id: string) => {
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="workspace-switcher">
      <div className="workspace-tabs">
        <button
          className={`tab ${mode === 'personal' ? 'active' : ''}`}
          onClick={() => setCurrentTeam(null)}
        >
          <span className="tab-icon">👤</span>
          Personal
        </button>
        {userTeams.map((team) => (
          <button
            key={team.id}
            className={`tab ${mode === 'team' && currentTeam?.id === team.id ? 'active' : ''}`}
            onClick={() => setCurrentTeam(team)}
          >
            <span
              className="team-avatar"
              style={{ background: getTeamColor(team.id) }}
            >
              {(team.avatar || team.name.charAt(0)).toUpperCase()}
            </span>
            {team.name}
          </button>
        ))}
        <button className="tab create-team-tab" onClick={() => setShowTeamCreation(true)}>
          <span className="tab-icon">＋</span>
        </button>
      </div>
    </div>
  );
};