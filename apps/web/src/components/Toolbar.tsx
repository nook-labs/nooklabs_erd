'use client';

import React, { useState, useEffect } from 'react';
import { DisplayMode } from '@/types/erd';
import { ValidationIssue } from '@/validation/validator';
import {
  Undo2,
  Redo2,
  AlertCircle,
  CheckCircle2,
  Database,
  Pencil,
  Check,
  Activity,
  Layers,
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
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(projectTitle);

  useEffect(() => {
    setTitle(projectTitle);
  }, [projectTitle]);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const handleFinishEdit = () => {
    setIsEditingTitle(false);
    if (title.trim()) {
      onUpdateTitle(title.trim());
    } else {
      setTitle(projectTitle);
    }
  };

  return (
    <header className="h-12 bg-[#090d16] border-b border-white/[0.08] px-4 flex items-center justify-between z-30 select-none shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      {/* Left Section: Brand & Project Name & History */}
      <div className="flex items-center gap-3">
        {/* Brand Monogram */}
        <div className="flex items-center gap-2 pr-3.5 border-r border-white/[0.08]">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Database className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-xs text-slate-200 tracking-tight flex items-center gap-1">
            ERD<span className="text-indigo-400 font-bold">Studio</span>
          </span>
        </div>

        {/* Project Title Editor */}
        <div className="flex items-center gap-1">
          {isEditingTitle ? (
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
              onClick={() => setIsEditingTitle(true)}
              className="group flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.04] transition-all text-slate-200"
              title="클릭하여 프로젝트 이름 변경"
            >
              <span className="font-semibold text-xs text-slate-200 group-hover:text-white transition-colors">
                {projectTitle || 'Untitled_Schema'}
              </span>
              <Pencil className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          )}
        </div>

        {/* Undo / Redo Actions */}
        <div className="flex items-center gap-0.5 pl-2 border-l border-white/[0.08]">
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
      </div>

      {/* Center Section: View Mode Switcher (Segmented Control) */}
      <div className="flex items-center bg-[#07090e] p-0.5 rounded-lg border border-white/[0.08] shadow-inner">
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
          물리+논리 동시 보기
        </button>
      </div>

      {/* Right Section: Validation & Live Connection */}
      <div className="flex items-center gap-2">
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
          <span>{issues.length > 0 ? `검증 이슈 (${issues.length})` : '검증 정상'}</span>
        </button>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0e131f] border border-white/[0.08] text-[11px] text-slate-300 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>실시간 동기화</span>
        </div>
      </div>
    </header>
  );
};
