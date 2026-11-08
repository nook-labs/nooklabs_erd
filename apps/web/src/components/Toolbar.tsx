'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DisplayMode } from '@/types/erd';
import {
  Undo2,
  Redo2,
  Pencil,
  Check,
  Cloud,
  ChevronLeft,
  Download,
  Upload,
  Plus,
  Layers,
  Lock,
  Unlock,
  Settings,
  Search,
  Share2,
  HelpCircle,
} from 'lucide-react';

interface ToolbarProps {
  projectTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  issues?: any[];
  onToggleValidation?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isConnected: boolean;
  saveStatus?: 'synced' | 'saving' | 'error';
  userRole?: string;
  onOpenShareModal?: () => void;
  memberCount?: number;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
  onToggleEntityList?: () => void;
  isEntityListOpen?: boolean;
  onToggleDiagramList?: () => void;
  isDiagramListOpen?: boolean;
  onAddDiagram?: () => void;
  onToggleVersionHistory?: () => void;
  isVersionHistoryOpen?: boolean;
  versionCount?: number;
  tableCount?: number;
  isViewerMode?: boolean;
  onToggleViewerMode?: () => void;
  onOpenSearch?: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectTitle,
  onUpdateTitle,
  displayMode,
  setDisplayMode,
  onUndo,
  onRedo,
  isConnected,
  saveStatus = 'synced',
  isViewerMode = false,
  onToggleViewerMode,
  onToggleInspector,
  isInspectorOpen = false,
  onToggleDiagramList,
  isDiagramListOpen = false,
  onAddDiagram,
  onOpenSearch,
  onOpenShareModal,
  onOpenExport,
  onOpenImport,
}) => {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(projectTitle);

  useEffect(() => {
    setTitle(projectTitle);
  }, [projectTitle]);

  const handleFinishEdit = () => {
    if (isViewerMode) return;
    setIsEditingTitle(false);
    if (title.trim()) {
      onUpdateTitle(title.trim());
    } else {
      setTitle(projectTitle);
    }
  };

  return (
    <header className="h-[34px] bg-[#2c2c2c] border-b border-[#1f1f1f] px-3 flex items-center justify-between z-30 select-none shrink-0 w-full font-sans text-neutral-200">
      {/* Left: ERDCloud Signature Cloud Logo + Project Name + Undo/Redo */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Back / Home Logo Button */}
        <button
          onClick={() => router.push('/dashboard')}
          title="대시보드로 이동"
          className="flex items-center gap-1 text-[#38bdf8] hover:text-white transition-colors"
        >
          {/* ERD Cloud Style Icon */}
          <div className="flex items-center gap-0.5 font-black text-xs tracking-tighter">
            <Cloud className="w-4 h-4 fill-[#38bdf8] text-[#38bdf8]" />
            <span className="text-[11px] font-extrabold text-white tracking-tight">ERD</span>
          </div>
        </button>

        <div className="h-3 w-[1px] bg-white/20" />

        {/* Project Title (Inline Editable like ERDCloud) */}
        {isEditingTitle && !isViewerMode ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishEdit();
                if (e.key === 'Escape') {
                  setTitle(projectTitle);
                  setIsEditingTitle(false);
                }
              }}
              className="bg-black/80 text-white font-bold text-xs px-1.5 py-0.5 rounded border border-[#38bdf8] outline-none w-36 shadow-inner"
            />
            <button
              onClick={handleFinishEdit}
              className="p-0.5 text-emerald-400 hover:text-white"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => !isViewerMode && setIsEditingTitle(true)}
            className="flex items-center gap-1 cursor-pointer group hover:opacity-90"
            title="클릭하여 프로젝트 이름 변경"
          >
            <span className="font-bold text-xs text-white tracking-tight truncate max-w-[200px]">
              {projectTitle || 'Untitled'}
            </span>
            {!isViewerMode && (
              <Pencil className="w-2.5 h-2.5 text-neutral-400 opacity-60 group-hover:opacity-100" />
            )}
          </div>
        )}

        {/* Undo / Redo */}
        {!isViewerMode && (
          <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-white/10">
            <button
              onClick={onUndo}
              className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Center: ERDCloud Mode Switcher [논리] [물리] */}
      <div className="flex items-center bg-[#1f1f1f] border border-[#444] rounded-[3px] p-0.5 text-[11px]">
        <button
          onClick={() => setDisplayMode('logical')}
          className={`px-3 py-0.5 rounded-[2px] transition-all font-medium ${
            displayMode === 'logical'
              ? 'bg-[#1b5e20] text-white font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="논리명(한글) 중심 보기"
        >
          논리
        </button>
        <button
          onClick={() => setDisplayMode('physical')}
          className={`px-3 py-0.5 rounded-[2px] transition-all font-medium ${
            displayMode === 'physical'
              ? 'bg-[#1b5e20] text-white font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="물리명(영문 컬럼명) 중심 보기"
        >
          물리
        </button>
        <button
          onClick={() => setDisplayMode('both')}
          className={`px-2 py-0.5 rounded-[2px] transition-all font-medium ${
            displayMode === 'both'
              ? 'bg-[#1b5e20] text-white font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="논리명 + 물리명 동시 표기"
        >
          논리/물리
        </button>
      </div>

      {/* Right: ERDCloud Style Action Bar */}
      <div className="flex items-center gap-1.5 text-neutral-300">
        {/* Add Diagram Button (+) */}
        {onAddDiagram && (
          <button
            onClick={onAddDiagram}
            className="p-1 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="새 다이어그램 추가 (Mermaid/시퀀스)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Diagram List Panel Toggle */}
        {onToggleDiagramList && (
          <button
            onClick={onToggleDiagramList}
            className={`p-1 rounded transition-colors ${
              isDiagramListOpen
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 text-neutral-300 hover:text-white'
            }`}
            title="다이어그램 목록"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Lock / Viewer Mode Toggle */}
        {onToggleViewerMode && (
          <button
            onClick={onToggleViewerMode}
            className={`p-1 rounded transition-colors ${
              isViewerMode
                ? 'bg-amber-500/20 text-amber-400'
                : 'hover:bg-white/10 text-neutral-300 hover:text-white'
            }`}
            title={isViewerMode ? '편집 잠금됨 (클릭하여 편집 모드로 전환)' : '편집 모드 (클릭하여 잠금)'}
          >
            {isViewerMode ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>
        )}

        {/* Canvas Inspector / Settings */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`p-1 rounded transition-colors ${
              isInspectorOpen
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 text-neutral-300 hover:text-white'
            }`}
            title="캔버스 설정 (배경, 그리드, 줌 비율)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Export Button */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="p-1 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="DDL 내보내기 / 이미지 저장"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Import Button */}
        {onOpenImport && (
          <button
            onClick={onOpenImport}
            className="p-1 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="SQL DDL 불러오기"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Share / Invite Modal */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="p-1 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="프로젝트 멤버 및 공유"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Global Search Button (Ctrl + F) */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="p-1 hover:bg-white/10 rounded text-neutral-300 hover:text-white transition-colors"
            title="엔티티 / 다이어그램 검색 (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-3 w-[1px] bg-white/20 mx-0.5" />

        {/* Connection Indicator */}
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected && saveStatus !== 'error' ? 'bg-emerald-400' : 'bg-rose-500'
          }`}
          title={isConnected ? '실시간 동기화 정상' : '오프라인 / 연결 끊김'}
        />
      </div>
    </header>
  );
};
