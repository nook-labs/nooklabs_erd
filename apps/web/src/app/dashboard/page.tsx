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
  LogOut,
  FolderPlus,
  Clock3,
  Globe,
  FolderGit2,
  BookOpen,
  Sparkles,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  Check,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'my' | 'shared'>('recent');
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
        // Ensure user profile exists in profiles table
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        // 1. Projects owned by the user
        const { data: ownedList, error: ownedErr } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (ownedErr) throw ownedErr;

        // 2. Projects where user is a member
        const { data: memberList, error: memberErr } = await supabase
          .from('project_members')
          .select(`
            role,
            project:projects (*)
          `)
          .eq('user_id', user.id);

        if (memberErr) throw memberErr;

        // 3. Fetch all member counts for accurate display
        const { data: allMembers } = await supabase
          .from('project_members')
          .select('project_id');

        const memberCountMap: Record<string, number> = {};
        (allMembers || []).forEach((m: any) => {
          if (m.project_id) {
            memberCountMap[m.project_id] = (memberCountMap[m.project_id] || 0) + 1;
          }
        });

        const ownedProjects: Project[] = (ownedList || []).map((p: any) => ({
          ...p,
          my_role: 'owner' as ProjectRole,
          member_count: Math.max(memberCountMap[p.id] || 1, 1),
        }));

        const sharedProjects: Project[] = (memberList || [])
          .filter((m: any) => m.project && m.project.owner_id !== user.id)
          .map((m: any) => ({
            ...m.project,
            my_role: (m.role || 'editor') as ProjectRole,
            member_count: Math.max(memberCountMap[m.project.id] || 1, 1),
          }));

        // Deduplicate projects in case of overlaps
        const projectMap = new Map<string, Project>();
        ownedProjects.forEach((p) => projectMap.set(p.id, p));
        sharedProjects.forEach((p) => {
          if (!projectMap.has(p.id)) {
            projectMap.set(p.id, p);
          }
        });

        setProjects(Array.from(projectMap.values()));
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

        // Upsert owner membership
        if (newProj?.id) {
          await supabase.from('project_members').upsert({
            project_id: newProj.id,
            user_id: user.id,
            role: 'owner',
            joined_at: new Date().toISOString(),
          }, { onConflict: 'project_id,user_id' });
        }

        await loadProjects();
        router.push(`/project/${newProj.id}`);
        return;
      } catch (err: any) {
        console.error('Failed to create in Supabase:', err.message);
      }
    }

    const newProj = mockStore.createProject(user.id, name, description, dialect);
    await loadProjects();
    router.push(`/project/${newProj.id}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까? 관련 ERD 데이터가 모두 제거됩니다.')) return;

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
    if (activeTab === 'my') return p.my_role === 'owner';
    if (activeTab === 'shared') return p.my_role !== 'owner';
    return true;
  });

  const getDialectBadge = (dialect: string) => {
    switch (dialect) {
      case 'postgres':
        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">PostgreSQL</span>;
      case 'mysql':
        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">MySQL</span>;
      case 'mssql':
      default:
        return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#0c8ce9]/15 text-[#0c8ce9] border border-[#0c8ce9]/30">MS SQL</span>;
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center text-neutral-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0c8ce9] border-t-transparent animate-spin" />
          <p className="text-xs">NookLabs ERD Studio 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white flex flex-col md:flex-row font-sans md:h-screen md:overflow-hidden">
      {/* Left Sidebar (Desktop: Vertical Sidebar, Mobile: Compact Header & Tabs) */}
      <aside className="w-full md:w-60 bg-[#2c2c2c] border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col justify-between shrink-0 p-3 md:p-3.5 z-20">
        <div className="space-y-3 md:space-y-4">
          {/* User Profile Header */}
          <div className="flex items-center justify-between pb-2.5 md:pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar name={user.display_name} avatarUrl={user.avatar_url} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user.display_name}</div>
                <div className="text-[10px] text-neutral-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="로그아웃"
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg transition-colors flex items-center gap-1 text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="md:hidden">로그아웃</span>
            </button>
          </div>

          {/* Navigation Links (Responsive: Horizontal scroll on mobile, Vertical on desktop) */}
          <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap ${
                activeTab === 'recent'
                  ? 'bg-[#0c8ce9] text-white shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] bg-[#222222] md:bg-transparent'
              }`}
            >
              <Clock3 className="w-3.5 h-3.5" />
              <span>최근 항목</span>
            </button>

            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap ${
                activeTab === 'my'
                  ? 'bg-[#0c8ce9] text-white shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] bg-[#222222] md:bg-transparent'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>내 프로젝트</span>
            </button>

            <button
              onClick={() => setActiveTab('shared')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 whitespace-nowrap ${
                activeTab === 'shared'
                  ? 'bg-[#0c8ce9] text-white shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-white/[0.06] bg-[#222222] md:bg-transparent'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>공유된 프로젝트</span>
            </button>
          </nav>
        </div>

        {/* Brand Bottom Tag (Desktop only) */}
        <div className="hidden md:flex pt-3 border-t border-white/[0.08] items-center justify-between text-[11px] text-neutral-400">
          <span className="font-semibold text-neutral-300 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-[#0c8ce9]" /> NookLabs ERD
          </span>
          <span className="text-[10px] px-1 py-0.5 rounded bg-white/[0.06] font-mono">v2.1</span>
        </div>
      </aside>

      {/* Main File Browser Content Area (Full native touch scroll on mobile) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] md:overflow-y-auto overflow-x-hidden">
        {/* Top Header / Search / CTA */}
        <header className="border-b border-white/[0.08] p-3 sm:px-6 sm:h-14 flex items-center justify-between gap-2.5 sticky top-0 bg-[#1e1e1e]/95 backdrop-blur-md z-10">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#2c2c2c] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0c8ce9] transition-colors"
            />
          </div>

          {/* New Project Button (Figma Blue) */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[#0c8ce9] hover:bg-[#0a77c7] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 프로젝트</span>
          </button>
        </header>

        {/* Section Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            {activeTab === 'recent'
              ? '최근 항목'
              : activeTab === 'my'
              ? '내 프로젝트'
              : '공유된 프로젝트'}{' '}
            <span className="text-neutral-500 font-normal">({filteredProjects.length})</span>
          </h1>
        </div>

        {/* Projects Grid (Figma Thumbnail Cards) */}
        <div className="px-3 sm:px-6 pb-16 md:pb-8">
          {filteredProjects.length === 0 ? (
            <div className="border border-dashed border-white/[0.12] rounded-xl p-12 text-center bg-[#242424]/40 my-6">
              <div className="w-12 h-12 rounded-xl bg-[#0c8ce9]/10 border border-[#0c8ce9]/20 text-[#0c8ce9] flex items-center justify-center mx-auto mb-3">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                {searchQuery ? '일치하는 프로젝트가 없습니다' : '아직 생성된 프로젝트가 없습니다'}
              </h3>
              <p className="text-neutral-400 text-xs max-w-sm mx-auto mb-4">
                새로운 ERD 프로젝트를 만들어 팀원과 실시간으로 DB 스키마를 설계해보세요.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#0c8ce9] hover:bg-[#0a77c7] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 첫 프로젝트 만들기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => router.push(`/project/${proj.id}`)}
                  className="group cursor-pointer bg-[#2c2c2c] hover:bg-[#333333] border border-white/[0.08] hover:border-[#0c8ce9] rounded-xl overflow-hidden transition-all duration-150 flex flex-col"
                >
                  {/* Figma Canvas Miniature Preview Box */}
                  <div className="h-32 bg-[#181818] relative flex items-center justify-center border-b border-white/[0.06] group-hover:bg-[#141414] transition-colors p-3">
                    <div className="w-full h-full border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 bg-[#222222]/60">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-6 rounded bg-[#2c2c2c] border border-white/10 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                          table_1
                        </div>
                        <div className="w-4 h-[1px] bg-[#0c8ce9]" />
                        <div className="w-12 h-6 rounded bg-[#2c2c2c] border border-white/10 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                          table_2
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">ERD Canvas</span>
                    </div>

                    {/* Delete button on hover */}
                    {proj.my_role === 'owner' && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        title="프로젝트 삭제"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-400 p-1 rounded bg-[#2c2c2c]/80 hover:bg-[#2c2c2c] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <h2 className="text-xs font-bold text-white group-hover:text-[#0c8ce9] transition-colors truncate">
                          {proj.name}
                        </h2>
                        {getDialectBadge(proj.target_dialect)}
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-1 mb-3">
                        {proj.description || '설명이 없습니다.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        {new Date(proj.updated_at || proj.created_at).toLocaleDateString()}
                      </span>

                      <span className="text-[#0c8ce9] font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        열기 <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

