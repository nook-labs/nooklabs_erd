-- ==============================================================================
-- Migration: 0002_add_missing_rls_and_realtime.sql
-- Description: 누락된 RLS 정책(profiles insert, documents/snapshots/assets), 
--              Realtime Publication 및 Storage 버킷 설정 추가
-- ==============================================================================

-- 1. Profiles Table - INSERT 정책 추가 (Upsert 정상 동작 보장)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. Project Documents Table - RLS 정책 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_documents' AND policyname = 'Project documents viewable by authenticated users'
  ) THEN
    CREATE POLICY "Project documents viewable by authenticated users"
      ON public.project_documents FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_documents' AND policyname = 'Project documents manageable by authenticated users'
  ) THEN
    CREATE POLICY "Project documents manageable by authenticated users"
      ON public.project_documents FOR ALL
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 3. Project Snapshots Table - RLS 정책 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_snapshots' AND policyname = 'Snapshots viewable by authenticated users'
  ) THEN
    CREATE POLICY "Snapshots viewable by authenticated users"
      ON public.project_snapshots FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_snapshots' AND policyname = 'Snapshots manageable by authenticated users'
  ) THEN
    CREATE POLICY "Snapshots manageable by authenticated users"
      ON public.project_snapshots FOR ALL
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 4. Project Assets Table - RLS 정책 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_assets' AND policyname = 'Project assets viewable by authenticated users'
  ) THEN
    CREATE POLICY "Project assets viewable by authenticated users"
      ON public.project_assets FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_assets' AND policyname = 'Project assets manageable by authenticated users'
  ) THEN
    CREATE POLICY "Project assets manageable by authenticated users"
      ON public.project_assets FOR ALL
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ==============================================================================
-- 5. Supabase Realtime Publication 설정
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_invitations;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_snapshots;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ==============================================================================
-- 6. Storage 버킷 설정 (이미지/에셋 업로드용)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('erd-assets', 'erd-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access for erd-assets'
  ) THEN
    CREATE POLICY "Public Access for erd-assets"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'erd-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload to erd-assets'
  ) THEN
    CREATE POLICY "Authenticated users can upload to erd-assets"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'erd-assets');
  END IF;
END $$;
