'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Database } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <Database className="w-8 h-8 text-indigo-500 animate-pulse" />
        <p className="text-sm">NookLabs ERD 로딩 중...</p>
      </div>
    </div>
  );
}
