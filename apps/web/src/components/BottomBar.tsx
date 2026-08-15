'use client';

import React from 'react';
import {
  FolderArchive,
  Download,
  Upload,
  Map,
  Users2,
} from 'lucide-react';

interface BottomBarProps {
  onOpenDomain: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  isMiniMapOpen: boolean;
  setIsMiniMapOpen: (open: boolean) => void;
  userCount?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  onOpenDomain,
  onOpenImport,
  onOpenExport,
  isMiniMapOpen,
  setIsMiniMapOpen,
  userCount = 1,
}) => {
  return (
    <footer className="h-8 bg-[#090d16] border-t border-white/[0.08] px-3 flex items-center justify-between text-xs text-slate-300 z-30 select-none">
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
        {/* Collaborators Count */}
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
          <Users2 className="w-3 h-3 text-slate-400" />
          <span>접속 {userCount}명</span>
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
