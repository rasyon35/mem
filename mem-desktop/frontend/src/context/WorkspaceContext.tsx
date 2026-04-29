'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WorkspaceMode, Team } from '@/types/team';
import { teamApi } from '@/lib/teamApi';

interface WorkspaceContextType {
  mode: WorkspaceMode;
  currentTeam: Team | null;
  userTeams: Team[];
  setMode: (mode: WorkspaceMode) => void;
  setCurrentTeam: (team: Team | null) => void;
  loadTeams: () => Promise<void>;
  showTeamCreation: boolean;
  setShowTeamCreation: (show: boolean) => void;
}

const Ctx = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<WorkspaceMode>('personal');
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [showTeamCreation, setShowTeamCreation] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      const teams = await teamApi.myTeams();
      setUserTeams(teams);
      if (currentTeam && !teams.find((t: any) => t.id === currentTeam.id)) {
        setCurrentTeam(null);
        setMode('personal');
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  }, [currentTeam]);

  useEffect(() => {
    loadTeams();
  }, []);

  return (
    <Ctx.Provider
      value={{
        mode,
        currentTeam,
        userTeams,
        setMode,
        setCurrentTeam,
        loadTeams,
        showTeamCreation,
        setShowTeamCreation,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(Ctx);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
};
