'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { teamApi, Team, TeamMembership, TeamInvite, TeamHome, TeamPage } from '@/lib/teamApi';

interface TeamContextType {
  teams: Team[];
  currentTeam: Team | null;
  teamHome: TeamHome | null;
  teamPages: TeamPage[];
  teamMembers: TeamMembership[];
  teamInvites: TeamInvite[];
  loading: boolean;
  error: string | null;

  fetchTeams: () => Promise<void>;
  fetchTeamHome: (teamId: string) => Promise<void>;
  fetchTeamPages: (teamId: string) => Promise<void>;
  fetchTeamMembers: (teamId: string) => Promise<void>;
  fetchTeamInvites: (teamId: string) => Promise<void>;
  createTeam: (data: Partial<Team>) => Promise<Team>;
  updateTeam: (teamId: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  addMember: (teamId: string, userId: string, role?: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  createInvite: (teamId: string, data?: any) => Promise<TeamInvite>;
  acceptInvite: (code: string) => Promise<void>;
  joinTeam: (teamId: string) => Promise<void>;
  shareToTeam: (teamId: string, pageTitle: string) => Promise<void>;
  forkToPersonal: (teamId: string, pageTitle: string) => Promise<void>;
  transferOwnership: (teamId: string, newOwnerId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamHome, setTeamHome] = useState<TeamHome | null>(null);
  const [teamPages, setTeamPages] = useState<TeamPage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMembership[]>([]);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamApi.myTeams();
      setTeams(data.teams || []);
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamHome = useCallback(async (teamId: string) => {
    setLoading(true);
    try {
      const data = await teamApi.home(teamId);
      setTeamHome(data);
    } catch {
      setError('Failed to load team home');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamPages = useCallback(async (teamId: string) => {
    try {
      const data = await teamApi.pages(teamId);
      setTeamPages(data.pages || []);
    } catch {
      setError('Failed to load team pages');
    }
  }, []);

  const fetchTeamMembers = useCallback(async (teamId: string) => {
    try {
      const data = await teamApi.members(teamId);
      setTeamMembers(data || []);
    } catch {
      setError('Failed to load team members');
    }
  }, []);

  const fetchTeamInvites = useCallback(async (teamId: string) => {
    try {
      const data = await teamApi.createInvite(teamId, {});
      setTeamInvites(data ? [data] : []);
    } catch {
      setError('Failed to load team invites');
    }
  }, []);

  const createTeam = useCallback(async (data: Partial<Team>) => {
    setLoading(true);
    try {
      const team = await teamApi.create(data);
      setTeams(prev => [...prev, team]);
      return team;
    } catch {
      setError('Failed to create team');
      throw new Error('Failed to create team');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeam = useCallback(async (teamId: string, data: Partial<Team>) => {
    try {
      const updated = await teamApi.update(teamId, data);
      setTeams(prev => prev.map(t => t.id === teamId ? updated : t));
      if (currentTeam?.id === teamId) setCurrentTeam(updated);
    } catch {
      setError('Failed to update team');
    }
  }, [currentTeam]);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      await teamApi.remove(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
      if (currentTeam?.id === teamId) setCurrentTeam(null);
    } catch {
      setError('Failed to delete team');
    }
  }, [currentTeam]);

  const addMember = useCallback(async (teamId: string, userId: string, role = 'viewer') => {
    try {
      await teamApi.addMember(teamId, userId, role);
      await fetchTeamMembers(teamId);
    } catch {
      setError('Failed to add member');
    }
  }, [fetchTeamMembers]);

  const removeMember = useCallback(async (teamId: string, userId: string) => {
    try {
      await teamApi.removeMember(teamId, userId);
      await fetchTeamMembers(teamId);
    } catch {
      setError('Failed to remove member');
    }
  }, [fetchTeamMembers]);

  const createInvite = useCallback(async (teamId: string, data: any = {}) => {
    try {
      return await teamApi.createInvite(teamId, data);
    } catch {
      setError('Failed to create invite');
      throw new Error('Failed to create invite');
    }
  }, []);

  const acceptInvite = useCallback(async (code: string) => {
    try {
      await teamApi.acceptInvite(code);
      await fetchTeams();
    } catch {
      setError('Failed to accept invite');
    }
  }, [fetchTeams]);

  const joinTeam = useCallback(async (teamId: string) => {
    try {
      await teamApi.joinTeam(teamId);
      await fetchTeams();
    } catch {
      setError('Failed to join team');
    }
  }, [fetchTeams]);

  const shareToTeam = useCallback(async (teamId: string, pageTitle: string) => {
    try {
      await teamApi.sharePageToTeam(teamId, { page_id: teamId, page_title: pageTitle });
    } catch {
      setError('Failed to share page to team');
    }
  }, []);

  const forkToPersonal = useCallback(async (teamId: string, pageTitle: string) => {
    try {
      await teamApi.forkPageToPersonal(teamId, { page_id: teamId, page_title: pageTitle });
    } catch {
      setError('Failed to fork page to personal');
    }
  }, []);

  const transferOwnership = useCallback(async (teamId: string, newOwnerId: string) => {
    try {
      await teamApi.transferOwnership(teamId, newOwnerId);
      await fetchTeams();
    } catch {
      setError('Failed to transfer ownership');
    }
  }, [fetchTeams]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return (
    <TeamContext.Provider value={{
      teams, currentTeam, teamHome, teamPages, teamMembers, teamInvites,
      loading, error,
      fetchTeams, fetchTeamHome, fetchTeamPages, fetchTeamMembers, fetchTeamInvites,
      createTeam, updateTeam, deleteTeam, setCurrentTeam,
      addMember, removeMember, createInvite, acceptInvite, joinTeam,
      shareToTeam, forkToPersonal, transferOwnership,
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within TeamProvider');
  return context;
};
