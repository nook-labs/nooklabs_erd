'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderArchive,
  Download,
  Upload,
  Map,
  Users2,
  Sparkles,
  ShieldCheck,
  Circle,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export interface OnlineUserInfo {
  clientId: number;
  user: {
    id: string;
    name: string;
    color: string;
    avatar?: string | null;
  };
  isSelf: boolean;
}

interface BottomBarProps {
  onOpenDomain: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  isMiniMapOpen: boolean;
  setIsMiniMapOpen: (open: boolean) => void;
  onlineUsers?: OnlineUserInfo[];
}

export const BottomBar: React.FC<BottomBarProps> = ({
  onOpenDomain,
  onOpenImport,
  onOpenExport,
  isMiniMapOpen,
  setIsMiniMapOpen,
  onlineUsers = [],
}) => {
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsUsersOpen(false);
      }
    };
    if (isUsersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUsersOpen]);

  const userCount = Math.max(onlineUsers.length, 1);

  return (
    <footer className="h-8 bg-[#090d16] border-t border-white/[0.08] px-3 flex items-center justify-between text-xs text-slate-300 z-30 select-none relative">
      {/* Left Utilities */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenDomain}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors"
        >
          <FolderArchive className="w-3 h-3 text-indigo-400" />
          <span>도메인 관리</span>
        </button>

        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors"
        >
          <Upload className="w-3 h-3 text-emerald-400" />
          <span>불러오기 (Import)</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium hover:bg-white/[0.06] text-slate-300 hover:text-white transition-colors"
        >
          <Download className="w-3 h-3 text-sky-400" />
          <span>내보내기 (Export)</span>
        </button>
      </div>

      {/* Right Utilities */}
      <div className="flex items-center gap-3">
        {/* Collaborators Toggle Button */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              isUsersOpen
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="현재 실시간 접속자 목록 보기"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Users2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>접속자 {userCount}명</span>
          </button>

          {/* Live Collaborators Popover */}
          {isUsersOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-9 right-0 w-64 bg-[#111622]/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-tight">실시간 접속자 ({userCount})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">동시 편집 중</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {onlineUsers.length > 0 ? (
                  onlineUsers.map(({ clientId, user, isSelf }) => (
                    <div
                      key={clientId}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        isSelf ? 'bg-indigo-950/40 border border-indigo-500/20' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Color Badge / Avatar */}
                        <div
                          style={{ borderColor: user.color || '#6366f1' }}
                          className="relative w-6 h-6 rounded-full border-2 p-0.5 shrink-0 flex items-center justify-center bg-slate-900"
                        >
                          <div
                            style={{ backgroundColor: user.color || '#6366f1' }}
                            className="w-full h-full rounded-full"
                          />
                        </div>

                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {user.name || '동료 사용자'}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {isSelf ? '나 (현재 브라우저)' : `Client ID #${clientId.toString().slice(-4)}`}
                          </span>
                        </div>
                      </div>

                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          YOU
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500">
                    접속자 정보를 불러오는 중...
                  </div>
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-white/[0.08] text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>커서와 편집이 실시간 동기화됩니다</span>
              </div>
            </div>
          )}
        </div>

        {/* MiniMap Toggle */}
        <button
          onClick={() => setIsMiniMapOpen(!isMiniMapOpen)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition-all ${
            isMiniMapOpen
              ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
              : 'border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
          }`}
          title="미니맵 토글"
        >
          <Map className="w-3 h-3" />
          <span>미니맵</span>
        </button>
      </div>
    </footer>
  );
};
