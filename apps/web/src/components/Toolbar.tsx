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
  Shield,
  Eye,
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
}) => {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(projectTitle);

  useEffect(() => {
    setTitle(projectTitle);
  }, [projectTitle]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const isReadOnly = userRole === 'viewer';

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
    switch (userRole) {
      case 'owner':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            👑 Owner
          </span>
        );
      case 'editor':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            ✏️ Editor
          </span>
        );
      case 'viewer':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 border border-slate-600/40 flex items-center gap-1">
            <Eye className="w-3 h-3 text-slate-400" /> 읽기 전용 (Viewer)
          </span>
        );
    }
  };

  return (
    <header className="h-12 bg-[#090d16] border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between z-30 select-none shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      {/* Left Section: Back to Dashboard & Brand & Project Name & History */}
      <div className="flex items-center gap-2.5">
        {/* Back to Dashboard Button */}
        <button
          onClick={() => router.push('/dashboard')}
          title="대시보드로 이동"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] text-xs font-semibold transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">대시보드</span>
        </button>

        <div className="h-4 w-[1px] bg-white/[0.08]" />

        {/* Brand Monogram */}
        <div className="flex items-center gap-2 pr-2">
          <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Database className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-xs text-slate-200 tracking-tight hidden md:flex items-center gap-0.5">
            NookLabs<span className="text-indigo-400 font-black">ERD</span>
          </span>
        </div>

        {/* Project Title Editor */}
        <div className="flex items-center gap-2">
          {isEditingTitle && !isReadOnly ? (
            <div className="flex items-center gap-1">
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
                className="bg-[#131926] text-white font-medium text-xs px-2 py-0.5 rounded border border-indigo-500/80 outline-none w-44 shadow-inner"
                autoFocus
              />
              <button
                onClick={handleFinishEdit}
                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors"
                title="저장"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              disabled={isReadOnly}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded transition-all text-slate-200 ${
                !isReadOnly ? 'hover:bg-white/[0.04]' : 'cursor-default'
              }`}
              title={!isReadOnly ? '클릭하여 프로젝트 이름 변경' : '읽기 전용'}
            >
              <span className="font-semibold text-xs text-slate-200 group-hover:text-white transition-colors max-w-[180px] truncate">
                {projectTitle || 'Untitled_Schema'}
              </span>
              {!isReadOnly && (
                <Pencil className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
              )}
            </button>
          )}

          {getRoleBadge()}
        </div>

        {/* Undo / Redo Actions */}
        {!isReadOnly && (
          <div className="hidden sm:flex items-center gap-0.5 pl-2 border-l border-white/[0.08]">
            <button
              onClick={onUndo}
              className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              className="p-1.5 rounded hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Center Section: View Mode Switcher */}
      <div className="hidden md:flex items-center bg-[#07090e] p-0.5 rounded-lg border border-white/[0.08] shadow-inner">
        <button
          onClick={() => setDisplayMode('physical')}
          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
            displayMode === 'physical'
              ? 'bg-[#1a2234] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)] border border-white/[0.08]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          물리명
        </button>
        <button
          onClick={() => setDisplayMode('logical')}
          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
            displayMode === 'logical'
              ? 'bg-[#1a2234] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)] border border-white/[0.08]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          논리명
        </button>
        <button
          onClick={() => setDisplayMode('both')}
          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
            displayMode === 'both'
              ? 'bg-[#1a2234] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.3)] border border-white/[0.08]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
        >
          물리+논리 동시
        </button>
      </div>

      {/* Right Section: Validation & Share & Sync */}
      <div className="flex items-center gap-2">
        {/* Share Button */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <Users className="w-3.5 h-3.5" />
            <span>공유 ({memberCount})</span>
          </button>
        )}

        {/* Validation Issues Trigger */}
        <button
          onClick={onToggleValidation}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all active:scale-[0.98] ${
            errorCount > 0
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40'
              : warningCount > 0
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
              : 'bg-[#0e131f] border-white/[0.08] text-slate-300 hover:text-white hover:bg-[#141b2c]'
          }`}
        >
          {errorCount > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          ) : warningCount > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="hidden sm:inline">
            {issues.length > 0 ? `검증 (${issues.length})` : '정상'}
          </span>
        </button>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0e131f] border border-white/[0.08] text-[11px] text-slate-300 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden sm:inline">동기화</span>
        </div>
      </div>
    </header>
  );
};
