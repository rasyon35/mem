import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { TeamHome } from './TeamHome/TeamHome';
import { TeamWiki } from './TeamWiki/TeamWiki';
import { TeamChat } from './TeamChat/TeamChat';
import { TeamGraph } from './TeamGraph/TeamGraph';
import { TeamMembers } from './TeamMembers/TeamMembers';
import { TeamBranches } from './TeamBranches/TeamBranches';
import { TeamMemory } from './TeamMemory/TeamMemory';
import { ConflictResolution } from './ConflictResolution/ConflictResolution';
import { TeamIngestion } from './TeamIngestion/TeamIngestion';
import { TeamSearch } from './TeamSearch/TeamSearch';
import { TeamNotifications } from './TeamNotifications/TeamNotifications';
import { KnowledgeFlow } from './KnowledgeFlow/KnowledgeFlow';
import { TeamCreationFlow } from './TeamCreationFlow/TeamCreationFlow';
import './TeamLayer.css';

type TeamTab = 'home' | 'wiki' | 'chat' | 'graph' | 'members' | 'branches' | 'memory' | 'conflicts' | 'ingestion' | 'search' | 'notifications' | 'flow';

const TAB_LABELS: Record<TeamTab, string> = {
  home: '🏠 Home',
  wiki: '📚 Wiki',
  chat: '💬 Chat',
  graph: '🔵 Graph',
  members: '👥 Members',
  branches: '🌿 Branches',
  memory: '🧠 Memory',
  conflicts: '⚠️ Conflicts',
  ingestion: '📥 Ingestion',
  search: '🔍 Search',
  notifications: '🔔 Notifications',
  flow: '🔄 Knowledge Flow',
};

export const TeamLayer = () => {
  const { currentTeam, showTeamCreation, setShowTeamCreation } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TeamTab>('home');

  const getTeamColor = (id: string) => {
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  if (!currentTeam && !showTeamCreation) {
    return (
      <div className="team-layer-empty">
        <div className="empty-state">
          <h2>No Team Selected</h2>
          <p>Create or join a team to start collaborating.</p>
          <button className="create-team-btn" onClick={() => setShowTeamCreation(true)}>
            + Create Team Space
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="team-layer">
      {showTeamCreation && (
        <TeamCreationFlow onClose={() => setShowTeamCreation(false)} />
      )}

      {currentTeam && (
        <>
          <div className="team-layer-header">
            <h2 className="team-title">
              <span
                className="team-badge"
                style={{
                  background: getTeamColor(currentTeam.id),
                }}
              >
                {(currentTeam.avatar || currentTeam.name.charAt(0)).toUpperCase()}
              </span>
              {currentTeam.name}
            </h2>
            <span className="team-category">{currentTeam.category}</span>
          </div>

          <div className="team-tabs">
            {(Object.keys(TAB_LABELS) as TeamTab[]).map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="team-content">
            {activeTab === 'home' && <TeamHome />}
            {activeTab === 'wiki' && <TeamWiki />}
            {activeTab === 'chat' && <TeamChat />}
            {activeTab === 'graph' && <TeamGraph />}
            {activeTab === 'members' && <TeamMembers />}
            {activeTab === 'branches' && <TeamBranches />}
            {activeTab === 'memory' && <TeamMemory />}
            {activeTab === 'conflicts' && <ConflictResolution />}
            {activeTab === 'ingestion' && <TeamIngestion />}
            {activeTab === 'search' && <TeamSearch />}
            {activeTab === 'notifications' && <TeamNotifications />}
            {activeTab === 'flow' && <KnowledgeFlow />}
          </div>
        </>
      )}
    </div>
  );
};