'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DisplayMode } from '@/types/erd';
import { ValidationIssue } from '@/validation/validator';
import { ProjectRole } from '@/lib/supabase/types';
import {
  Undo2,
  Redo2,
  AlertCircle,
  CheckCircle2,
  Database,
  Pencil,
  Check,
  ChevronLeft,
  Users,
  Share2,
  Eye,
  SlidersHorizontal,
  ListTree,
  History,
} from 'lucide-react';

interface ToolbarProps {
  projectTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  issues: ValidationIssue[];
  onToggleValidation: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isConnected: boolean;
  userRole?: ProjectRole;
  onOpenShareModal?: () => void;
  memberCount?: number;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
  onToggleEntityList?: () => void;
  isEntityListOpen?: boolean;
  onToggleVersionHistory?: () => void;
  isVersionHistoryOpen?: boolean;
  versionCount?: number;
  tableCount?: number;
  isViewerMode?: boolean;
  onToggleViewerMode?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectTitle,
  onUpdateTitle,
  displayMode,
  setDisplayMode,
  issues,
  onToggleValidation,
  onUndo,
  onRedo,
  isConnected,
  userRole = 'owner',
  onOpenShareModal,
  memberCount = 1,
  onToggleInspector,
  isInspectorOpen = false,
  onToggleEntityList,
  isEntityListOpen = false,
  onToggleVersionHistory,
  isVersionHistoryOpen = false,
  versionCount = 0,
  tableCount = 0,
  isViewerMode = false,
  onToggleViewerMode,
}) => {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(projectTitle);

  useEffect(() => {
    setTitle(projectTitle);
  }, [projectTitle]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const isReadOnly = userRole === 'viewer' || isViewerMode;

  const handleFinishEdit = () => {
    if (isReadOnly) return;
    setIsEditingTitle(false);
    if (title.trim()) {
      onUpdateTitle(title.trim());
    } else {
      setTitle(projectTitle);
    }
  };

  const getRoleBadge = () => {
    if (isViewerMode) {
      return (
        <span className="whitespace-nowrap shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
          <Eye className="w-3 h-3 text-purple-400" /> <span>뷰어 모드</span>
        </span>
      );
    }
    switch (userRole) {
      case 'owner':
        return (
          <span className="whitespace-nowrap shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            👑 Owner
          </span>
        );
      case 'editor':
        return (
          <span className="whitespace-nowrap shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
            ✏️ Editor
          </span>
        );
      case 'viewer':
        return (
          <span className="whitespace-nowrap shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-600/30 text-neutral-300 border border-neutral-500/40 flex items-center gap-1">
            <Eye className="w-3 h-3 text-neutral-400" /> <span className="hidden sm:inline">읽기 전용</span>
          </span>
        );
    }
  };

  return (
    <header className="h-11 bg-[#2c2c2c] border-b border-white/[0.08] px-2 sm:px-4 flex items-center justify-between z-30 select-none shadow-md shrink-0 w-full overflow-x-hidden">
      {/* Left Section: Back to Dashboard & Project Title & Role */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Back to Dashboard Button */}
        <button
          onClick={() => router.push('/dashboard')}
          title="대시보드로 이동"
          className="flex items-center justify-center w-7 h-7 sm:w-auto sm:px-2 rounded text-neutral-300 hover:text-white hover:bg-white/[0.08] text-xs font-semibold transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline ml-0.5">대시보드</span>
        </button>

        <div className="h-3.5 w-[1px] bg-white/[0.1] shrink-0" />

        {/* Brand Icon */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded bg-[#0c8ce9] flex items-center justify-center shadow-sm">
            <Database className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Project Title Inline Editor */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditingTitle && !isReadOnly ? (
            <div className="flex items-center gap-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleFinishEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishEdit();
                  if (e.key === 'Escape') {
                    setTitle(projectTitle);
                    setIsEditingTitle(false);
                  }
                }}
                className="bg-[#1e1e1e] text-white font-medium text-xs px-2 py-0.5 rounded border border-[#0c8ce9] outline-none w-28 sm:w-44 shadow-inner"
                autoFocus
              />
              <button
                onClick={handleFinishEdit}
                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors shrink-0"
                title="저장"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              disabled={isReadOnly}
              className={`group flex items-center gap-1 px-1.5 py-0.5 rounded transition-all text-neutral-200 min-w-0 max-w-[120px] sm:max-w-[220px] ${
                !isReadOnly ? 'hover:bg-white/[0.08]' : 'cursor-default'
              }`}
              title={!isReadOnly ? '클릭하여 프로젝트 이름 변경' : '읽기 전용'}
            >
              <span className="font-semibold text-xs text-white truncate">
                {projectTitle || 'Untitled_Schema'}
              </span>
              {!isReadOnly && (
                <Pencil className="w-2.5 h-2.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
              )}
            </button>
          )}

          {getRoleBadge()}
        </div>

        {/* Undo / Redo Actions */}
        {!isReadOnly && (
          <div className="hidden sm:flex items-center gap-0.5 pl-1.5 border-l border-white/[0.08] shrink-0">
            <button
              onClick={onUndo}
              className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white active:scale-95 transition-all"
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-400 hover:text-white active:scale-95 transition-all"
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right Section: Validation, Design Inspector Toggle, Share Button */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Validation Issues Trigger */}
        <button
          onClick={onToggleValidation}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all active:scale-[0.98] shrink-0 whitespace-nowrap ${
            errorCount > 0
              ? 'bg-rose-950/50 border-rose-800/80 text-rose-300 hover:bg-rose-900/50'
              : warningCount > 0
              ? 'bg-amber-950/50 border-amber-800/80 text-amber-300 hover:bg-amber-900/50'
              : 'bg-[#1e1e1e] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-[#262626]'
          }`}
          title="스키마 무결성 검증"
        >
          {errorCount > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : warningCount > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="hidden sm:inline">
            {issues.length > 0 ? `검증 (${issues.length})` : '정상'}
          </span>
        </button>

        {/* Entity List Toggle Button */}
        {onToggleEntityList && (
          <button
            onClick={onToggleEntityList}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all active:scale-[0.98] shrink-0 whitespace-nowrap ${
              isEntityListOpen
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'bg-[#1e1e1e] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-[#262626]'
            }`}
            title="엔티티 목록 (ENTITY)"
          >
            <ListTree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">엔티티</span>
            <span className="text-[10px] text-neutral-400">({tableCount})</span>
          </button>
        )}

        {/* Version History Toggle Button */}
        {onToggleVersionHistory && (
          <button
            onClick={onToggleVersionHistory}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all active:scale-[0.98] shrink-0 whitespace-nowrap ${
              isVersionHistoryOpen
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'bg-[#1e1e1e] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-[#262626]'
            }`}
            title="버전 기록 및 시점 저장 (Version History)"
          >
            <History className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">버전 기록</span>
            {versionCount > 0 && (
              <span className="text-[10px] text-emerald-400 font-bold">({versionCount})</span>
            )}
          </button>
        )}

        {/* Viewer Mode Toggle Button */}
        {onToggleViewerMode && (
          <button
            onClick={onToggleViewerMode}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded text-[11px] font-semibold border transition-all active:scale-[0.98] shrink-0 whitespace-nowrap ${
              isViewerMode
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md ring-1 ring-purple-400/50'
                : 'bg-[#1e1e1e] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-[#262626]'
            }`}
            title={isViewerMode ? '편집 모드로 전환 (클릭 시 편집 가능)' : '뷰어 모드로 전환 (편집 잠금)'}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{isViewerMode ? '뷰어 모드 ON' : '뷰어 모드'}</span>
          </button>
        )}

        {/* Figma Inspector Toggle Button */}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-all active:scale-[0.98] shrink-0 whitespace-nowrap ${
              isInspectorOpen
                ? 'bg-[#181818] border-[#0c8ce9] text-[#0c8ce9]'
                : 'bg-[#1e1e1e] border-white/[0.08] text-neutral-300 hover:text-white hover:bg-[#262626]'
            }`}
            title="디자인 / 캔버스 배경 설정 (Inspector)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">디자인</span>
          </button>
        )}

        {/* Figma Blue Share Button (Guaranteed No Wrap) */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 bg-[#0c8ce9] hover:bg-[#0a77c7] text-white rounded text-xs font-semibold shadow-sm transition-all active:scale-[0.98] shrink-0 whitespace-nowrap leading-none"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">공유 {memberCount > 1 ? `(${memberCount})` : ''}</span>
          </button>
        )}
      </div>
    </header>
  );
};

