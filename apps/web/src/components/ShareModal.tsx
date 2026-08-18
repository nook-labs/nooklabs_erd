'use client';

import React, { useState, useEffect } from 'react';
import { ProjectMember, ProjectRole, UserProfile } from '@/lib/supabase/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockStore } from '@/lib/supabase/mockStore';
import { UserAvatar } from './UserAvatar';
import {
  X,
  Users,
  UserPlus,
  Mail,
  Copy,
  Check,
  Shield,
  Trash2,
  Sparkles,
  Link,
  ChevronDown,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentUser: UserProfile;
  myRole: ProjectRole;
  onMembersChange?: (count: number) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentUser,
  myRole,
  onMembersChange,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, projectId]);

  const loadMembers = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Fetch project owner_id
        const { data: projData } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', projectId)
          .maybeSingle();

        // 2. Fetch all registered project members with profile JOIN
        const { data: memberRows, error: memberErr } = await supabase
          .from('project_members')
          .select(`
            id,
            project_id,
            user_id,
            role,
            joined_at,
            profile:profiles (
              id,
              email,
              display_name,
              avatar_url
            )
          `)
          .eq('project_id', projectId);

        if (!memberErr) {
          const list: ProjectMember[] = (memberRows || []).map((m: any) => ({
            id: m.id,
            project_id: m.project_id,
            user_id: m.user_id,
            role: m.role as ProjectRole,
            invited_by: null,
            joined_at: m.joined_at,
            profile: m.profile || {
              id: m.user_id,
              email: m.user_id === currentUser.id ? currentUser.email : `user_${m.user_id.slice(0, 6)}`,
              display_name: m.user_id === currentUser.id ? currentUser.display_name : 'Member',
              avatar_url: m.user_id === currentUser.id ? currentUser.avatar_url : null,
            },
          }));

          const ownerId = projData?.owner_id;

          // 3. Ensure owner is in the list
          const hasOwner = list.some((m) => m.role === 'owner' || (ownerId && m.user_id === ownerId));
          if (!hasOwner && ownerId) {
            // Fetch owner profile directly from profiles table
            const { data: ownerProf } = await supabase
              .from('profiles')
              .select('id, email, display_name, avatar_url, created_at, updated_at')
              .eq('id', ownerId)
              .maybeSingle();

            const ownerProfile: UserProfile = ownerProf || {
              id: ownerId,
              email: ownerId === currentUser.id ? currentUser.email : 'owner',
              display_name: ownerId === currentUser.id ? currentUser.display_name : 'Project Owner',
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            list.unshift({
              id: `mem_owner_${ownerId}`,
              project_id: projectId,
              user_id: ownerId,
              role: 'owner',
              invited_by: null,
              joined_at: new Date().toISOString(),
              profile: ownerProfile,
            });
          }

          // 4. Ensure current user is in the list
          const hasCurrentUser = list.some((m) => m.user_id === currentUser.id);
          if (!hasCurrentUser) {
            list.push({
              id: `mem_cur_${currentUser.id}`,
              project_id: projectId,
              user_id: currentUser.id,
              role: myRole,
              invited_by: null,
              joined_at: new Date().toISOString(),
              profile: currentUser,
            });
          }

          // Remove any accidental duplicate user_ids, prioritizing owner role
          const uniqueList: ProjectMember[] = [];
          const seenUsers = new Set<string>();
          // Sort to put owner first
          list.sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
          list.forEach((m) => {
            if (!seenUsers.has(m.user_id)) {
              seenUsers.add(m.user_id);
              uniqueList.push(m);
            }
          });

          setMembers(uniqueList);
          onMembersChange?.(uniqueList.length);
          return;
        }
      } catch (err: any) {
        console.warn('Failed to load members from Supabase:', err.message);
      }
    }

    const list = mockStore.getMembers(projectId);
    const filteredList = list.filter((m) => m.profile?.email !== 'developer@nooklabs.io' || m.user_id === currentUser.id);
    if (!filteredList.some((m) => m.user_id === currentUser.id)) {
      filteredList.push({
        id: `mem_cur_${currentUser.id}`,
        project_id: projectId,
        user_id: currentUser.id,
        role: myRole,
        invited_by: null,
        joined_at: new Date().toISOString(),
        profile: currentUser,
      });
    }
    setMembers(filteredList);
    onMembersChange?.(filteredList.length);
  };

  if (!isOpen) return null;

  const isOwner = myRole === 'owner';

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: invData, error } = await supabase
          .from('project_invitations')
          .insert({
            project_id: projectId,
            email: inviteEmail.trim(),
            role: inviteRole,
            invited_by: currentUser.id,
          })
          .select()
          .single();

        if (!error && invData) {
          const link = `${window.location.origin}/invite/${invData.token}`;
          setLastInviteLink(link);
          setInviteEmail('');
          await loadMembers();
          return;
        }
      } catch (err: any) {
        console.warn('Supabase invite error, fallback:', err.message);
      }
    }

    const inv = mockStore.createInvitation(projectId, inviteEmail.trim(), inviteRole, currentUser.id);
    const link = `${window.location.origin}/invite/${inv.token}`;
    setLastInviteLink(link);
    setInviteEmail('');
    loadMembers();
  };

  const handleCopyLink = (linkToCopy?: string) => {
    const targetLink = linkToCopy || lastInviteLink || `${window.location.origin}/project/${projectId}`;
    navigator.clipboard.writeText(targetLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoleChange = async (memberId: string, newRole: ProjectRole) => {
    if (!isOwner) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('project_members')
          .update({ role: newRole })
          .eq('id', memberId);
        await loadMembers();
        return;
      } catch (err: any) {
        console.warn('Failed to update role in Supabase:', err.message);
      }
    }

    mockStore.updateMemberRole(projectId, memberId, newRole);
    loadMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isOwner) return;
    if (!confirm('이 멤버를 프로젝트에서 제외하시겠습니까?')) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('project_members')
          .delete()
          .eq('id', memberId);
        await loadMembers();
        return;
      } catch (err: any) {
        console.warn('Failed to remove member in Supabase:', err.message);
      }
    }

    mockStore.removeMember(projectId, memberId);
    loadMembers();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">프로젝트 공유 및 멤버 관리</h2>
              <p className="text-xs text-slate-400 truncate max-w-[320px]">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Invite Form */}
          {(isOwner || myRole === 'editor') && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5 text-indigo-400" /> 새 멤버 초대하기
              </label>
              <form onSubmit={handleSendInvite} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="editor">Editor (편집 가능)</option>
                  <option value="viewer">Viewer (읽기 전용)</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
                >
                  초대장 발송
                </button>
              </form>

              {/* Generated Invite Link Notification */}
              {lastInviteLink && (
                <div className="mt-3 p-2.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[11px] text-indigo-200 truncate">{lastInviteLink}</span>
                  </div>
                  <button
                    onClick={() => handleCopyLink(lastInviteLink)}
                    className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-colors"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    {copiedLink ? '복사됨' : '링크 복사'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                참여 중인 멤버 ({members.length})
              </span>
              <span className="text-[11px] text-slate-500">
                내 권한: <strong className="text-indigo-400 uppercase">{myRole}</strong>
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {members.map((mem) => {
                const profile = mem.profile || {
                  display_name: 'Unknown Member',
                  email: 'member@nooklabs.io',
                  avatar_url: null,
                };
                const isMe = mem.user_id === currentUser.id;

                return (
                  <div
                    key={mem.id}
                    className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar name={profile.display_name} avatarUrl={profile.avatar_url} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{profile.display_name}</span>
                          {isMe && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              나
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{profile.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mem.role === 'owner' ? (
                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                          👑 Owner
                        </span>
                      ) : isOwner ? (
                        <select
                          value={mem.role}
                          onChange={(e) => handleRoleChange(mem.id, e.target.value as ProjectRole)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="editor">✏️ Editor</option>
                          <option value="viewer">👁️ Viewer</option>
                        </select>
                      ) : (
                        <span className="text-[11px] text-slate-400 capitalize bg-slate-800/80 px-2 py-0.5 rounded-lg">
                          {mem.role}
                        </span>
                      )}

                      {isOwner && mem.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(mem.id)}
                          title="멤버 퇴출"
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Copy Project URL */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              링크를 가진 멤버가 바로 룸에 접속합니다
            </div>
            <button
              onClick={() => handleCopyLink()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? '링크 복사됨' : '룸 링크 복사'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
