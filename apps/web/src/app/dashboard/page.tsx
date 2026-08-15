'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockStore } from '@/lib/supabase/mockStore';
import { Project, TargetDialect, ProjectRole } from '@/lib/supabase/types';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Database,
  Plus,
  Search,
  Users,
  Clock,
  Trash2,
  ExternalLink,
  ShieldCheck,
  LogOut,
  FolderPlus,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'owner' | 'member'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setIsFetching(true);

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. 내가 소유한 프로젝트 조회
        const { data: ownedList, error: ownedErr } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (ownedErr) throw ownedErr;

        // 2. 내가 초대받은 멤버십 조회
        const { data: memberList, error: memberErr } = await supabase
          .from('project_members')
          .select(`
            role,
            project:projects (*)
          `)
          .eq('user_id', user.id);

        if (memberErr) throw memberErr;

        const ownedProjects: Project[] = (ownedList || []).map((p: any) => ({
          ...p,
          my_role: 'owner' as ProjectRole,
          member_count: 1,
        }));

        const sharedProjects: Project[] = (memberList || [])
          .filter((m: any) => m.project && m.project.owner_id !== user.id)
          .map((m: any) => ({
            ...m.project,
            my_role: m.role as ProjectRole,
            member_count: 1,
          }));

        // 중복 제거 후 합치기
        const combined = [...ownedProjects, ...sharedProjects];
        setProjects(combined);
      } catch (err: any) {
        console.warn('Supabase fetch error, fallback to local store:', err.message);
        setProjects(mockStore.getProjects(user.id));
      } finally {
        setIsFetching(false);
      }
    } else {
      setProjects(mockStore.getProjects(user.id));
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  const handleCreateProject = async (name: string, description: string, dialect: TargetDialect) => {
    if (!user) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const roomId = 'room-' + Math.random().toString(36).substring(2, 11);
        const { data: newProj, error } = await supabase
          .from('projects')
          .insert({
            owner_id: user.id,
            name,
            description,
            target_dialect: dialect,
            room_id: roomId,
          })
          .select()
          .single();

        if (error) throw error;
        await loadProjects();
        router.push(`/project/${newProj.id}`);
        return;
      } catch (err: any) {
        console.error('Failed to create in Supabase:', err.message);
        // Fallback to local store
      }
    }

    // Local Mock Fallback
    const newProj = mockStore.createProject(user.id, name, description, dialect);
    await loadProjects();
    router.push(`/project/${newProj.id}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까? 관련 ERD 데이터 및 방이 모두 제거됩니다.')) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('projects').delete().eq('id', projectId);
        await loadProjects();
        return;
      } catch (err: any) {
        console.error('Failed to delete in Supabase:', err.message);
      }
    }

    mockStore.deleteProject(projectId);
    loadProjects();
  };

  const filteredProjects = projects.filter((p) => {
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchQuery) return false;
    if (filterRole === 'owner') return p.my_role === 'owner';
    if (filterRole === 'member') return p.my_role !== 'owner';
    return true;
  });

  const getDialectBadge = (dialect: string) => {
    switch (dialect) {
      case 'mssql':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">MS SQL</span>;
      case 'postgres':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">PostgreSQL</span>;
      case 'mysql':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">MySQL</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">{(dialect || 'MSSQL').toUpperCase()}</span>;
    }
  };

  const getRoleBadge = (role?: ProjectRole) => {
    switch (role) {
      case 'owner':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">👑 Owner</span>;
      case 'editor':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">✏️ Editor</span>;
      case 'viewer':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-600/30">👁️ Viewer</span>;
      default:
        return null;
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Database className="w-8 h-8 text-indigo-500 animate-pulse" />
          <p className="text-sm">사용자 정보 및 프로젝트 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-slate-800 bg-[#161b22]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight">NookLabs ERD</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5">Realtime Collaborative Workspace</p>
          </div>
        </div>

        {/* User Profile and Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            <UserAvatar name={user.display_name} avatarUrl={user.avatar_url} size="sm" />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-200">{user.display_name}</div>
              <div className="text-[10px] text-slate-500">{user.email}</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            title="로그아웃"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Banner / Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              프로젝트 대시보드
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              팀과 실시간으로 공동 설계할 ERD 스키마 룸을 생성하거나 참여하세요.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" /> 새 프로젝트 생성
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b22] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#161b22] p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              전체 ({projects.length})
            </button>
            <button
              onClick={() => setFilterRole('owner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'owner'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              내 프로젝트
            </button>
            <button
              onClick={() => setFilterRole('member')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === 'member'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              공유받은 프로젝트
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-[#161b22]/40 my-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <FolderPlus className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? '일치하는 프로젝트가 없습니다' : '아직 생성된 프로젝트가 없습니다'}
            </h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5">
              새로운 ERD 프로젝트를 만들어 팀원을 초대하고 실시간으로 DB 스키마를 함께 설계해보세요.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => router.push(`/project/${proj.id}`)}
                className="group cursor-pointer bg-[#161b22] border border-slate-800/90 hover:border-indigo-500/60 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {getDialectBadge(proj.target_dialect)}
                      {getRoleBadge(proj.my_role)}
                    </div>
                    {proj.my_role === 'owner' && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        title="프로젝트 삭제"
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-1 truncate">
                    {proj.name}
                  </h2>
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">
                    {proj.description || '프로젝트 설명이 없습니다.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {proj.member_count || 1}명
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(proj.updated_at || proj.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold text-xs">
                    열기 <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
