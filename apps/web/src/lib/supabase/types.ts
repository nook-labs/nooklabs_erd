export type ProjectRole = 'owner' | 'editor' | 'viewer';
export type TargetDialect = 'mssql' | 'postgres' | 'mysql' | 'oracle';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  target_dialect: TargetDialect;
  room_id: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  // 조인용 가상 필드
  my_role?: ProjectRole;
  member_count?: number;
  owner_profile?: UserProfile;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  invited_by: string | null;
  joined_at: string;
  profile?: UserProfile;
}

export interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  project_name?: string;
}
