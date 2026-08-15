'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockStore } from '@/lib/supabase/mockStore';
import { ProjectInvitation, Project } from '@/lib/supabase/types';
import { Database, UserCheck, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export default function InviteAcceptPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [invitation, setInvitation] = useState<ProjectInvitation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          // Supabase DB에서 초대 토큰 조회
          const { data: invData, error: invErr } = await supabase
            .from('project_invitations')
            .select(`
              *,
              project:projects (*)
            `)
            .eq('token', token)
            .maybeSingle();

          if (invErr) throw invErr;

          if (invData) {
            if (invData.accepted_at) {
              setError('이미 수락된 초대 링크입니다.');
              return;
            }
            if (new Date(invData.expires_at) < new Date()) {
              setError('만료된 초대 링크입니다.');
              return;
            }

            setInvitation(invData);
            setProject(invData.project);
            return;
          }
        } catch (err: any) {
          console.warn('Supabase invite fetch error:', err.message);
        }
      }

      // Mock Store Fallback
      const inv = mockStore.getInvitationByToken(token);
      if (inv) {
        setInvitation(inv);
        const proj = mockStore.getProjectById(inv.project_id);
        setProject(proj);
      } else {
        setError('유효하지 않거나 이미 만료된 초대 링크입니다.');
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?next=/invite/${token}`);
      return;
    }
    if (!token || !invitation) return;

    setIsProcessing(true);

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. project_members에 멤버 추가 (ON CONFLICT IGNORE)
        const { error: memberErr } = await supabase
          .from('project_members')
          .upsert({
            project_id: invitation.project_id,
            user_id: user.id,
            role: invitation.role,
            invited_by: invitation.invited_by,
          }, { onConflict: 'project_id,user_id' });

        if (memberErr) throw memberErr;

        // 2. project_invitations accepted_at 기록
        await supabase
          .from('project_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('id', invitation.id);

        router.push(`/project/${invitation.project_id}`);
        return;
      } catch (err: any) {
        console.error('Failed to accept in Supabase:', err.message);
        setError('초대 수락 중 오류가 발생했습니다: ' + err.message);
        setIsProcessing(false);
        return;
      }
    }

    // Mock Store Fallback
    const success = mockStore.acceptInvitation(token, user.id);
    if (success) {
      router.push(`/project/${invitation.project_id}`);
    } else {
      setError('초대 수락 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Database className="w-8 h-8 text-indigo-500 animate-pulse" />
          <p className="text-sm">초대 정보 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#161b22] border border-slate-800/90 rounded-2xl p-8 backdrop-blur-xl shadow-2xl z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/20 mb-5 border border-indigo-400/30">
          <UserCheck className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-white mb-2">ERD 프로젝트 초대</h1>

        {error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">
              <strong className="text-indigo-300">{project?.name || 'ERD Workspace'}</strong> 프로젝트의{' '}
              <span className="font-semibold text-white uppercase">{invitation?.role}</span> 권한으로 초대되었습니다.
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-6 text-left space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>초대된 이메일:</span>
                <span className="text-slate-200 font-semibold">{invitation?.email}</span>
              </div>
              <div className="flex justify-between">
                <span>부여 역할:</span>
                <span className="text-indigo-400 font-semibold uppercase">{invitation?.role}</span>
              </div>
              <div className="flex justify-between">
                <span>접속 대상 DB:</span>
                <span className="text-slate-200 uppercase">{project?.target_dialect || 'MSSQL'}</span>
              </div>
            </div>

            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isProcessing ? (
                '수락 처리 중...'
              ) : (
                <>초대 수락하고 룸 입장하기 <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>보안 검증된 프로젝트 룸에 접속합니다</span>
        </div>
      </div>
    </div>
  );
}
