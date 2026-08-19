'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FolderArchive,
  Download,
  Upload,
  Map,
  Users2,
  Sparkles,
} from 'lucide-react';

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
    <footer className="h-6.5 bg-[#2c2c2c] border-t border-white/[0.08] px-2 sm:px-3 flex items-center justify-between text-[11px] text-neutral-300 z-30 select-none relative shrink-0 w-full overflow-x-hidden">
      {/* Left Utilities */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          onClick={onOpenDomain}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors shrink-0 whitespace-nowrap"
          title="도메인 관리"
        >
          <FolderArchive className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">도메인</span>
        </button>

        <button
          onClick={onOpenImport}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors shrink-0 whitespace-nowrap"
          title="불러오기 (Import)"
        >
          <Upload className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="hidden sm:inline">불러오기</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors shrink-0 whitespace-nowrap"
          title="내보내기 (Export)"
        >
          <Download className="w-3 h-3 text-[#0c8ce9] shrink-0" />
          <span className="hidden sm:inline">내보내기</span>
        </button>
      </div>

      {/* Right Utilities */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Collaborators Toggle Button */}
        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all shrink-0 whitespace-nowrap ${
              isUsersOpen
                ? 'bg-[#0c8ce9] text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title="현재 실시간 접속자 목록 보기"
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <Users2 className="w-3.5 h-3.5 text-[#0c8ce9] shrink-0" />
            <span className="whitespace-nowrap">{userCount}명</span>
          </button>

          {/* Live Collaborators Popover */}
          {isUsersOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-8 right-0 w-60 bg-[#222222] border border-white/[0.12] rounded-xl shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-tight">실시간 접속자 ({userCount})</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-medium">동시 편집</span>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {onlineUsers.length > 0 ? (
                  onlineUsers.map(({ clientId, user, isSelf }) => (
                    <div
                      key={clientId}
                      className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                        isSelf ? 'bg-[#2c2c2c] border border-[#0c8ce9]/30' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          style={{ backgroundColor: user.color || '#0c8ce9' }}
                          className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                        />
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs font-medium text-neutral-200 truncate">
                            {user.name || '동료 사용자'}
                          </span>
                        </div>
                      </div>

                      {isSelf && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#0c8ce9]/20 text-[#0c8ce9] border border-[#0c8ce9]/30 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-xs text-neutral-500">
                    접속자 정보 로딩 중...
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-white/[0.08] text-[10px] text-neutral-400 text-center flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0c8ce9]" />
                <span>커서와 편집이 실시간 동기화됩니다</span>
              </div>
            </div>
          )}
        </div>

        {/* MiniMap Toggle */}
        <button
          onClick={() => setIsMiniMapOpen(!isMiniMapOpen)}
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded border text-[10px] font-medium transition-all shrink-0 whitespace-nowrap ${
            isMiniMapOpen
              ? 'bg-[#181818] border-[#0c8ce9]/60 text-[#0c8ce9]'
              : 'border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          title="미니맵 토글"
        >
          <Map className="w-3 h-3 shrink-0" />
          <span className="hidden sm:inline">미니맵</span>
        </button>
      </div>
    </footer>
  );
};

