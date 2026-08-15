'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { Database, ShieldCheck, Mail, Lock, ArrowRight, User, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isSupabaseConfigured, loginWithDevMock, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  // 자동 로그인 및 저장된 계정 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('nooklabs_remember_email');
      const autoLoginSetting = localStorage.getItem('nooklabs_auto_login');
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (autoLoginSetting !== null) {
        setRememberMe(autoLoginSetting === 'true');
      }
    }
  }, []);

  // 이미 로그인되어 있으면 대시보드로 자동 이동 (자동 로그인)
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // 자동 로그인 및 이메일 기억 설정 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('nooklabs_auto_login', rememberMe ? 'true' : 'false');
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
      // Mock Auth Fallback with Auto-Login persistence
      setTimeout(() => {
        loginWithDevMock(displayName || email.split('@')[0], email);
        router.push('/dashboard');
      }, 300);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nooklabs_auto_login', 'true');
    }

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
    if (typeof window !== 'undefined') {
      localStorage.setItem('nooklabs_auto_login', 'true');
    }
    const names = {
      owner: 'Alex (Lead Architect)',
      editor: 'Sarah (Backend Dev)',
      viewer: 'Chris (DBA Reviewer)',
    };
    loginWithDevMock(names[role], `${role}@nooklabs.io`);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white flex flex-col justify-center items-center px-4 py-12 font-sans select-none relative">
      <div className="w-full max-w-sm z-10 space-y-6">
        {/* Figma Style Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2c2c2c] border border-white/[0.1] text-[#0c8ce9] shadow-md mb-2">
            <Database className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            NookLabs <span className="text-[#0c8ce9]">ERD</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-neutral-400 font-mono font-normal">v2.1</span>
          </h1>
          <p className="text-neutral-400 text-xs">
            실시간 협업 데이터베이스 스키마 설계 플랫폼
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#2c2c2c] border border-white/[0.08] rounded-xl p-6 shadow-2xl">
          {message && (
            <div
              className={`p-2.5 rounded-lg text-xs mb-4 border ${
                message.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <button
              onClick={() => handleOAuthLogin('github')}
              type="button"
              className="flex items-center justify-center gap-2 py-2 px-3 bg-[#1e1e1e] hover:bg-[#252525] border border-white/[0.1] text-neutral-200 hover:text-white rounded-lg text-xs font-medium transition-colors shadow-sm active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
            <button
              onClick={() => handleOAuthLogin('google')}
              type="button"
              className="flex items-center justify-center gap-2 py-2 px-3 bg-[#1e1e1e] hover:bg-[#252525] border border-white/[0.1] text-neutral-200 hover:text-white rounded-lg text-xs font-medium transition-colors shadow-sm active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Google</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-white/[0.08] w-full" />
            <span className="bg-[#2c2c2c] px-2.5 text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
              또는 이메일
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  이름 / 닉네임
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full bg-[#1e1e1e] border border-white/[0.1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0c8ce9] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                이메일 주소
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#1e1e1e] border border-white/[0.1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0c8ce9] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1e1e1e] border border-white/[0.1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0c8ce9] transition-colors"
                />
              </div>
            </div>

            {/* Auto Login & Remember Me */}
            {!isSignUp && (
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#1e1e1e] border-white/20 text-[#0c8ce9] focus:ring-0 cursor-pointer accent-[#0c8ce9]"
                  />
                  <span className="text-[11px] text-neutral-300 font-medium">자동 로그인 (로그인 상태 유지)</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-4 bg-[#0c8ce9] hover:bg-[#0a77c7] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                '처리 중...'
              ) : isSignUp ? (
                <>회원가입 완료 <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                <>로그인 <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>

          {/* Toggle Sign Up / In */}
          <div className="text-center mt-3.5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-[11px] text-[#0c8ce9] hover:underline transition-colors"
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>

          {/* Quick Dev Demo Profiles */}
          <div className="mt-5 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> 빠른 테스트 계정
              </span>
              <span className="text-[9px] text-neutral-500 font-mono">One-Click</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleDevQuickLogin('owner')}
                className="p-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-white/[0.08] hover:border-amber-400/50 rounded text-left transition-colors text-xs"
              >
                <div className="font-bold text-amber-300 text-[10px]">👑 Owner</div>
                <div className="text-[9px] text-neutral-400 truncate">Alex Architect</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevQuickLogin('editor')}
                className="p-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-white/[0.08] hover:border-[#0c8ce9]/50 rounded text-left transition-colors text-xs"
              >
                <div className="font-bold text-[#0c8ce9] text-[10px]">✏️ Editor</div>
                <div className="text-[9px] text-neutral-400 truncate">Sarah Backend</div>
              </button>
              <button
                type="button"
                onClick={() => handleDevQuickLogin('viewer')}
                className="p-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-white/[0.08] hover:border-neutral-400/50 rounded text-left transition-colors text-xs"
              >
                <div className="font-bold text-neutral-300 text-[10px]">👁️ Viewer</div>
                <div className="text-[9px] text-neutral-400 truncate">Chris DBA</div>
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
