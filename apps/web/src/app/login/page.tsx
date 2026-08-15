'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Database, ShieldCheck, Zap, Sparkles, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isSupabaseConfigured, loginWithDevMock } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  // 이메일 기억하기 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('nooklabs_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  // 이미 로그인되어 있으면 대시보드로 이동
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // 이메일 기억 처리
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        localStorage.setItem('nooklabs_remember_email', email);
      } else {
        localStorage.removeItem('nooklabs_remember_email');
      }
    }

    setLoading(true);
    setMessage(null);

    if (isSupabaseConfigured && supabase) {
      try {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: displayName || email.split('@')[0],
              },
            },
          });
          if (error) throw error;
          setMessage({ text: '가입 확인 이메일이 전송되었습니다. 이메일을 확인해주세요.', type: 'success' });
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          router.push('/dashboard');
        }
      } catch (err: any) {
        setMessage({ text: err.message || '인증에 실패했습니다.', type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      // Mock Auth Fallback
      setTimeout(() => {
        loginWithDevMock(displayName || email.split('@')[0], email);
        router.push('/dashboard');
      }, 300);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } else {
      loginWithDevMock(`${provider.toUpperCase()} Developer`, `dev.${provider}@nooklabs.io`);
      router.push('/dashboard');
    }
  };

  const handleDevQuickLogin = (role: 'owner' | 'editor' | 'viewer') => {
    const names = {
      owner: 'Alex (Lead Architect)',
      editor: 'Sarah (Backend Dev)',
      viewer: 'Chris (DBA Reviewer)',
    };
    loginWithDevMock(names[role], `${role}@nooklabs.io`);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/20 mb-4 border border-indigo-400/30">
            <Database className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            NookLabs ERD <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">v2.1 Realtime</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            차세대 계정 기반 실시간 협업 데이터베이스 설계 플랫폼
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#161b22]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {message && (
            <div
              className={`p-3 rounded-lg text-sm mb-5 border ${
                message.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleOAuthLogin('github')}
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
            <button
              onClick={() => handleOAuthLogin('google')}
              type="button"
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              Google
            </button>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#161b22] px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              또는 이메일 계정
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  이름 / 표시 이름
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            {!isSignUp && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xs text-slate-300 font-medium">로그인 정보 기억하기</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                '처리 중...'
              ) : isSignUp ? (
                <>회원가입 완료 <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>로그인 <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Toggle Sign Up / In */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>

          {/* Quick Dev Demo Profiles */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 빠른 테스트 계정 (One-Click)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Mock Auth</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDevQuickLogin('owner')}
                className="p-2 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 rounded-lg text-left transition-colors text-xs"
              >
                <div className="font-bold text-indigo-300">👑 Owner</div>
                <div className="text-[10px] text-slate-400 truncate">Alex Architect</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevQuickLogin('editor')}
                className="p-2 bg-violet-950/40 hover:bg-violet-900/60 border border-violet-800/40 rounded-lg text-left transition-colors text-xs"
              >
                <div className="font-bold text-violet-300">✏️ Editor</div>
                <div className="text-[10px] text-slate-400 truncate">Sarah Backend</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevQuickLogin('viewer')}
                className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-left transition-colors text-xs"
              >
                <div className="font-bold text-slate-300">👁️ Viewer</div>
                <div className="text-[10px] text-slate-400 truncate">Chris DBA</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Supabase RLS & Hocuspocus CRDT Sync Engine
        </p>
      </div>
    </div>
  );
}
