import { Project, ProjectMember, ProjectInvitation, UserProfile, ProjectRole } from './types';
import { ProjectVersion, ERDSnapshot } from '@/types/erd';

const MOCK_USER_STORAGE_KEY = 'nooklabs_mock_user';
const MOCK_PROJECTS_STORAGE_KEY = 'nooklabs_mock_projects';
const MOCK_MEMBERS_STORAGE_KEY = 'nooklabs_mock_members';
const MOCK_INVITES_STORAGE_KEY = 'nooklabs_mock_invites';
const MOCK_VERSIONS_STORAGE_KEY = 'nooklabs_mock_versions';

export const DEFAULT_MOCK_USER: UserProfile = {
  id: 'usr_dev_1001',
  email: 'developer@nooklabs.io',
  display_name: 'David Lee (Dev)',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=David',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// LocalStorage Helper
function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

export const mockStore = {
  // Current User
  getCurrentUser(): UserProfile | null {
    return getStored<UserProfile | null>(MOCK_USER_STORAGE_KEY, null);
  },

  setCurrentUser(user: UserProfile | null) {
    setStored(MOCK_USER_STORAGE_KEY, user);
  },

  // Projects
  getProjects(userId: string): Project[] {
    const defaultProjects: Project[] = [
      {
        id: 'proj-e-commerce-2026',
        owner_id: userId,
        name: 'E-Commerce Main DB',
        description: '글로벌 커머스 주문·결제·재고 통합 ERD 모델',
        target_dialect: 'mssql',
        room_id: 'room-ecommerce-01',
        status: 'active',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString(),
        my_role: 'owner',
        member_count: 3,
      },
      {
        id: 'proj-auth-service',
        owner_id: 'usr_other_9999',
        name: 'SSO & IAM Platform',
        description: '사내 통합 인증 및 RBAC 권한 관리 데이터 모델',
        target_dialect: 'postgres',
        room_id: 'room-auth-service-02',
        status: 'active',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        my_role: 'editor',
        member_count: 2,
      },
    ];

    const allProjects = getStored<Project[]>(MOCK_PROJECTS_STORAGE_KEY, defaultProjects);
    const allMembers = getStored<ProjectMember[]>(MOCK_MEMBERS_STORAGE_KEY, []);

    // Filter projects where user is owner OR member
    const userProjects = allProjects.filter((p) => {
      if (p.owner_id === userId) return true;
      return allMembers.some((m) => m.project_id === p.id && m.user_id === userId);
    });

    return userProjects.map((p) => {
      const projectMembers = allMembers.filter((m) => m.project_id === p.id);
      const myMembership = projectMembers.find((m) => m.user_id === userId);
      const isOwner = p.owner_id === userId;
      const role: ProjectRole = isOwner ? 'owner' : myMembership?.role || 'editor';
      const memberCount = Math.max(projectMembers.length, 1);

      return {
        ...p,
        my_role: role,
        member_count: memberCount,
      };
    });
  },

  createProject(userId: string, name: string, description: string, dialect: any): Project {
    const allProjects = getStored<Project[]>(MOCK_PROJECTS_STORAGE_KEY, []);
    const newProj: Project = {
      id: 'proj-' + Math.random().toString(36).substring(2, 9),
      owner_id: userId,
      name,
      description,
      target_dialect: dialect,
      room_id: 'room-' + Math.random().toString(36).substring(2, 11),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      my_role: 'owner',
      member_count: 1,
    };
    const updated = [newProj, ...allProjects];
    setStored(MOCK_PROJECTS_STORAGE_KEY, updated);

    // Add owner to members
    this.addMember(newProj.id, userId, 'owner', null);
    return newProj;
  },

  deleteProject(projectId: string): void {
    const user = this.getCurrentUser();
    if (!user) return;
    const allProjects = getStored<Project[]>(MOCK_PROJECTS_STORAGE_KEY, []);
    const projects = allProjects.filter((p) => p.id !== projectId);
    setStored(MOCK_PROJECTS_STORAGE_KEY, projects);
  },

  getProjectById(projectId: string): Project | null {
    const allProjects = getStored<Project[]>(MOCK_PROJECTS_STORAGE_KEY, []);
    return allProjects.find((p) => p.id === projectId) || null;
  },

  // Members
  getMembers(projectId: string): ProjectMember[] {
    const allMembers = getStored<ProjectMember[]>(MOCK_MEMBERS_STORAGE_KEY, []);
    const filtered = allMembers.filter((m) => m.project_id === projectId);
    const currentUser = this.getCurrentUser();

    if (filtered.length === 0 && currentUser) {
      const initial: ProjectMember = {
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        project_id: projectId,
        user_id: currentUser.id,
        role: 'owner',
        invited_by: null,
        joined_at: new Date().toISOString(),
        profile: currentUser,
      };
      setStored(MOCK_MEMBERS_STORAGE_KEY, [...allMembers, initial]);
      return [initial];
    }
    return filtered;
  },

  addMember(projectId: string, userId: string, role: ProjectRole, invitedBy: string | null): ProjectMember {
    const allMembers = getStored<ProjectMember[]>(MOCK_MEMBERS_STORAGE_KEY, []);
    const existingIndex = allMembers.findIndex((m) => m.project_id === projectId && m.user_id === userId);
    const currentUser = this.getCurrentUser();

    let userProfile = currentUser?.id === userId ? currentUser : null;
    if (!userProfile) {
      userProfile = {
        id: userId,
        email: `${userId.slice(0, 8)}@nooklabs.io`,
        display_name: `Member (${userId.slice(-4)})`,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (existingIndex >= 0) {
      allMembers[existingIndex] = {
        ...allMembers[existingIndex],
        role,
        profile: userProfile,
      };
      setStored(MOCK_MEMBERS_STORAGE_KEY, allMembers);
      return allMembers[existingIndex];
    }

    const newMember: ProjectMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      project_id: projectId,
      user_id: userId,
      role,
      invited_by: invitedBy,
      joined_at: new Date().toISOString(),
      profile: userProfile,
    };
    setStored(MOCK_MEMBERS_STORAGE_KEY, [...allMembers, newMember]);
    return newMember;
  },

  updateMemberRole(projectId: string, memberId: string, newRole: ProjectRole): void {
    const allMembers = getStored<ProjectMember[]>(MOCK_MEMBERS_STORAGE_KEY, []);
    const updated = allMembers.map((m) =>
      m.project_id === projectId && m.id === memberId ? { ...m, role: newRole } : m
    );
    setStored(MOCK_MEMBERS_STORAGE_KEY, updated);
  },

  removeMember(projectId: string, memberId: string): void {
    const allMembers = getStored<ProjectMember[]>(MOCK_MEMBERS_STORAGE_KEY, []);
    const updated = allMembers.filter((m) => !(m.project_id === projectId && m.id === memberId));
    setStored(MOCK_MEMBERS_STORAGE_KEY, updated);
  },

  // Invitations
  getInvitations(projectId: string): ProjectInvitation[] {
    const allInvites = getStored<ProjectInvitation[]>(MOCK_INVITES_STORAGE_KEY, []);
    return allInvites.filter((i) => i.project_id === projectId && !i.accepted_at);
  },

  createInvitation(projectId: string, email: string, role: 'editor' | 'viewer', invitedBy: string): ProjectInvitation {
    const allInvites = getStored<ProjectInvitation[]>(MOCK_INVITES_STORAGE_KEY, []);
    const newInvite: ProjectInvitation = {
      id: 'inv-' + Math.random().toString(36).substring(2, 9),
      project_id: projectId,
      email,
      role,
      token: 'inv_tok_' + Math.random().toString(36).substring(2, 14),
      invited_by: invitedBy,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      accepted_at: null,
      created_at: new Date().toISOString(),
    };
    setStored(MOCK_INVITES_STORAGE_KEY, [...allInvites, newInvite]);
    return newInvite;
  },

  getInvitationByToken(token: string): ProjectInvitation | null {
    const allInvites = getStored<ProjectInvitation[]>(MOCK_INVITES_STORAGE_KEY, []);
    return allInvites.find((i) => i.token === token) || null;
  },

  acceptInvitation(token: string, userId: string): boolean {
    const allInvites = getStored<ProjectInvitation[]>(MOCK_INVITES_STORAGE_KEY, []);
    const invite = allInvites.find((i) => i.token === token);
    if (!invite || invite.accepted_at) return false;

    invite.accepted_at = new Date().toISOString();
    setStored(MOCK_INVITES_STORAGE_KEY, allInvites);
    this.addMember(invite.project_id, userId, invite.role, invite.invited_by);
    return true;
  },

  // Versions / Snapshots
  getVersions(projectId: string): ProjectVersion[] {
    const allVersions = getStored<ProjectVersion[]>(MOCK_VERSIONS_STORAGE_KEY, []);
    return allVersions
      .filter((v) => v.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createVersion(
    projectId: string,
    name: string,
    snapshot: ERDSnapshot,
    createdBy: string,
    creatorName: string = '사용자',
    description?: string,
    isAutoSnapshot: boolean = false
  ): ProjectVersion {
    const allVersions = getStored<ProjectVersion[]>(MOCK_VERSIONS_STORAGE_KEY, []);
    const tableCount = Object.keys(snapshot.tables || {}).length;
    const relationshipCount = Object.keys(snapshot.relationships || {}).length;

    const newVersion: ProjectVersion = {
      id: 'ver_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      projectId,
      name,
      description,
      snapshot,
      tableCount,
      relationshipCount,
      createdBy,
      creatorName,
      createdAt: new Date().toISOString(),
      isAutoSnapshot,
    };

    setStored(MOCK_VERSIONS_STORAGE_KEY, [newVersion, ...allVersions]);
    return newVersion;
  },

  deleteVersion(versionId: string): void {
    const allVersions = getStored<ProjectVersion[]>(MOCK_VERSIONS_STORAGE_KEY, []);
    const updated = allVersions.filter((v) => v.id !== versionId);
    setStored(MOCK_VERSIONS_STORAGE_KEY, updated);
  },
};
