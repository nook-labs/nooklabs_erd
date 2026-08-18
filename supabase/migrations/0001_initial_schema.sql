-- ==============================================================================
-- Migration: 0001_initial_schema.sql
-- Description: NookLabs ERD 초기 스키마 및 기본 RLS 설정
-- ==============================================================================

-- 1. Profiles Table (auth.users 확장 프로필)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Projects Table (ERD 프로젝트 메타데이터)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT DEFAULT '',
  target_dialect TEXT NOT NULL DEFAULT 'mssql', -- 'mssql' | 'postgres' | 'mysql' | 'oracle'
  room_id TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Project Members Table (프로젝트 멤버 및 RBAC 역할)
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'owner' | 'editor' | 'viewer'
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(project_id, user_id)
);

-- 4. Project Invitations Table (이메일 및 토큰 초대)
CREATE TABLE IF NOT EXISTS public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor', -- 'editor' | 'viewer'
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Project Documents Table (Yjs 바이너리 백업 및 스키마 저장)
CREATE TABLE IF NOT EXISTS public.project_documents (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  ydoc_state BYTEA,
  state_vector BYTEA,
  update_seq BIGINT DEFAULT 0,
  schema_version INT DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Project Snapshots Table (이름 있는 스냅샷)
CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  ydoc_state BYTEA,
  document_json JSONB,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Project Assets Table (이미지 메타데이터)
CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- Functions & Triggers
-- ==============================================================================

-- 신규 가입자 발생 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 프로젝트 생성 시 owner_id를 project_members에 'owner'로 자동 추가하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. Projects RLS
CREATE POLICY "Projects viewable by authenticated users"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- 3. Project Members RLS
CREATE POLICY "Project members viewable by authenticated users"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Project members manageable by authenticated users"
  ON public.project_members FOR ALL
  TO authenticated
  USING (true);

-- 4. Project Invitations RLS
CREATE POLICY "Invitations viewable by anyone with link"
  ON public.project_invitations FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Invitations insertable by authenticated users"
  ON public.project_invitations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Invitations updatable by authenticated users"
  ON public.project_invitations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Invitations deletable by authenticated users"
  ON public.project_invitations FOR DELETE
  TO authenticated
  USING (true);
