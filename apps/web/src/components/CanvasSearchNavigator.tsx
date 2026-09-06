'use client';

import React, { useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Workflow, Layers } from 'lucide-react';

interface CanvasSearchNavigatorProps {
  isOpen: boolean;
  query: string;
  currentIndex: number;
  totalMatches: number;
  currentDiagramTitle?: string;
  currentPageName?: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const CanvasSearchNavigator: React.FC<CanvasSearchNavigatorProps> = ({
  isOpen,
  query,
  currentIndex,
  totalMatches,
  currentDiagramTitle,
  currentPageName,
  onPrev,
  onNext,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          onPrev();
        } else {
          onNext();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  if (!isOpen || totalMatches === 0) return null;

  return (
    <aside
      aria-label="다이어그램 검색 결과 순회 도구"
      className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-[#1e1e1e]/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl px-4 py-2 flex items-center gap-3 select-none animate-in fade-in slide-in-from-top-3 duration-200 text-white"
    >
      {/* Icon & Query Badge */}
      <div className="flex items-center gap-2 pr-2 border-r border-white/10">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Workflow className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-200">다이어그램 검색:</span>
            <span className="text-xs font-bold text-emerald-400 max-w-[120px] truncate">
              "{query}"
            </span>
          </div>
          {(currentDiagramTitle || currentPageName) && (
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              {currentPageName && (
                <span className="flex items-center gap-0.5 text-indigo-300 font-medium truncate max-w-[90px]">
                  <Layers className="w-2.5 h-2.5" /> {currentPageName}
                </span>
              )}
              {currentDiagramTitle && (
                <span className="truncate max-w-[110px] text-neutral-300 font-medium">
                  • {currentDiagramTitle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Match Index / Total Counter */}
      <div className="flex items-center gap-1 text-xs font-mono font-bold text-neutral-300 px-1">
        <span className="text-emerald-400">{currentIndex + 1}</span>
        <span className="text-neutral-500">/</span>
        <span>{totalMatches}</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/10">
        <button
          onClick={onPrev}
          title="이전 다이어그램 (Shift + Enter)"
          className="p-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          title="다음 다이어그램 (Enter)"
          className="p-1 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-all active:scale-95"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Shortcuts hint */}
      <div className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
        <kbd className="px-1 py-0.5 bg-black/40 border border-white/10 rounded">Enter</kbd> 다음
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        title="탐색 바 닫기 (Esc)"
        className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
};
