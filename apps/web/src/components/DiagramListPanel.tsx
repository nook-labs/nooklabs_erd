'use client';

import React, { useState, useMemo } from 'react';
import { DiagramModel, PageModel, DiagramType } from '@/types/erd';
import { parseSearchTokens, highlightTokens } from './GlobalSearchModal';
import {
  Search,
  X,
  Trash2,
  Workflow,
  ArrowUpDown,
  Plus,
  Code2,
  Copy,
  Layers,
  FileCode2,
} from 'lucide-react';

interface DiagramListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  diagrams: Record<string, DiagramModel>;
  pages: Record<string, PageModel>;
  onFocusDiagram: (diagramId: string, pageId?: string) => void;
  onDeleteDiagram: (diagramId: string) => void;
  onDuplicateDiagram?: (diagramId: string) => void;
  onOpenDiagramEditor?: (diagram: DiagramModel) => void;
  onAddDiagram?: () => void;
  isReadOnly?: boolean;
}

type SortField = 'title' | 'page' | 'type';
type SortOrder = 'asc' | 'desc';

export const DiagramListPanel: React.FC<DiagramListPanelProps> = ({
  isOpen,
  onClose,
  diagrams,
  pages,
  onFocusDiagram,
  onDeleteDiagram,
  onDuplicateDiagram,
  onOpenDiagramEditor,
  onAddDiagram,
  isReadOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DiagramType>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const diagramList = useMemo(() => Object.values(diagrams || {}), [diagrams]);
  const searchTokens = useMemo(() => parseSearchTokens(searchQuery), [searchQuery]);

  // Obsidian-style Multi-Token Filter & Search
  const filteredDiagrams = useMemo(() => {
    const tokens = searchTokens;
    const isBlank = tokens.length === 0;

    return diagramList
      .filter((diag) => {
        // 1. Type filter
        if (typeFilter !== 'all' && diag.type !== typeFilter) {
          return false;
        }

        // 2. Search query filter
        if (isBlank) return true;

        const titleLower = (diag.title || '').toLowerCase();
        const typeLower = (diag.type || '').toLowerCase();
        const codeLower = (diag.code || '').toLowerCase();
        const pageName = diag.pageId ? pages[diag.pageId]?.name?.toLowerCase() || '' : '';

        const fullPool = `${titleLower} ${typeLower} ${codeLower} ${pageName}`;

        // Obsidian rule: all tokens must exist in the diagram text pool
        return tokens.every((token) => fullPool.includes(token));
      })
      .sort((a, b) => {
        let valA = '';
        let valB = '';

        if (sortField === 'title') {
          valA = a.title || '제목 없음';
          valB = b.title || '제목 없음';
        } else if (sortField === 'page') {
          valA = (a.pageId && pages[a.pageId]?.name) || '메인 ERD';
          valB = (b.pageId && pages[b.pageId]?.name) || '메인 ERD';
        } else if (sortField === 'type') {
          valA = a.type || 'sequence';
          valB = b.type || 'sequence';
        }

        const comparison = valA.localeCompare(valB, 'ko', { sensitivity: 'base', numeric: true });
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [diagramList, searchTokens, typeFilter, sortField, sortOrder, pages]);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="다이어그램 목록 및 검색"
      className="absolute top-0 left-8 sm:left-8.5 z-20 w-72 sm:w-80 h-full bg-[#1e1e1e] border-r border-white/[0.08] flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-none text-white"
    >
      {/* 1. Header */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between bg-[#252525]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Workflow className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-white">다이어그램 (Mermaid)</span>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded-full border border-indigo-500/30">
            {filteredDiagrams.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!isReadOnly && onAddDiagram && (
            <button
              onClick={onAddDiagram}
              className="p-1 hover:bg-white/[0.08] rounded text-emerald-400 hover:text-emerald-300 transition-colors"
              title="새 다이어그램 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/[0.08] rounded text-neutral-400 hover:text-white transition-colors"
            title="패널 닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search Box */}
      <div className="p-2 border-b border-white/[0.06] bg-[#1a1a1a]">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="다중 키워드 검색 (예: 결제 토큰)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#252525] border border-white/[0.08] rounded-md px-2.5 py-1.5 pr-8 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-neutral-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2 pointer-events-none" />
          )}
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors ${
              typeFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setTypeFilter('sequence')}
            className={`px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors ${
              typeFilter === 'sequence'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            시퀀스
          </button>
          <button
            onClick={() => setTypeFilter('flowchart')}
            className={`px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors ${
              typeFilter === 'flowchart'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            플로우차트
          </button>
          <button
            onClick={() => setTypeFilter('class')}
            className={`px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors ${
              typeFilter === 'class'
                ? 'bg-amber-600 text-white'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            클래스
          </button>
          <button
            onClick={() => setTypeFilter('er')}
            className={`px-2 py-0.5 rounded-full font-medium shrink-0 transition-colors ${
              typeFilter === 'er'
                ? 'bg-rose-600 text-white'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            ERD
          </button>
        </div>
      </div>

      {/* 3. Sort Options Bar */}
      <div className="px-3 py-1.5 bg-[#181818] border-b border-white/[0.04] flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-1">
          <span>정렬:</span>
          <button
            onClick={() => {
              if (sortField === 'title') {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField('title');
                setSortOrder('asc');
              }
            }}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              sortField === 'title' ? 'text-indigo-400 font-bold bg-white/[0.06]' : 'hover:text-white'
            }`}
          >
            제목 {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => {
              if (sortField === 'page') {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortField('page');
                setSortOrder('asc');
              }
            }}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              sortField === 'page' ? 'text-indigo-400 font-bold bg-white/[0.06]' : 'hover:text-white'
            }`}
          >
            페이지 {sortField === 'page' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
        <span className="font-mono text-[10px] text-neutral-500">
          총 {diagramList.length}개
        </span>
      </div>

      {/* 4. Diagram Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredDiagrams.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 flex flex-col items-center gap-2">
            <Workflow className="w-8 h-8 text-neutral-600" />
            <p className="text-xs">
              {searchQuery ? '검색 결과가 없습니다.' : '생성된 다이어그램이 없습니다.'}
            </p>
          </div>
        ) : (
          filteredDiagrams.map((diag) => {
            const pageName = (diag.pageId && pages[diag.pageId]?.name) || '메인 ERD';
            const tokens = searchTokens;

            // Extract matching lines ranked by token density
            const lines = (diag.code || '').split('\n');
            interface CandidateLine {
              num: number;
              text: string;
              density: number;
            }
            const candidates: CandidateLine[] = [];

            if (tokens.length > 0) {
              lines.forEach((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const lineLower = trimmed.toLowerCase();
                const matched = tokens.filter((t) => lineLower.includes(t));
                if (matched.length > 0) {
                  candidates.push({ num: idx + 1, text: trimmed, density: matched.length });
                }
              });
            }

            candidates.sort((a, b) => b.density - a.density || a.num - b.num);
            const matchingLines = candidates.slice(0, 3).sort((a, b) => a.num - b.num);

            return (
              <div
                key={diag.id}
                onClick={() => onFocusDiagram(diag.id, diag.pageId)}
                className="group p-2 rounded-lg bg-[#252525]/60 hover:bg-[#2a2a2a] border border-white/[0.06] hover:border-indigo-500/40 cursor-pointer transition-all"
              >
                {/* Title & Actions Row */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                      {diag.type || 'diagram'}
                    </span>
                    <span className="font-bold text-xs text-white truncate">
                      {highlightTokens(diag.title || '제목 없음', searchTokens)}
                    </span>
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onOpenDiagramEditor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDiagramEditor(diag);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-indigo-400 transition-colors"
                        title="에디터 열기"
                      >
                        <Code2 className="w-3 h-3" />
                      </button>
                    )}
                    {!isReadOnly && onDuplicateDiagram && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateDiagram(diag.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
                        title="복제"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    {!isReadOnly && onDeleteDiagram && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDiagram(diag.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-400 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Page info badge */}
                <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
                  <Layers className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{pageName}</span>
                </div>

                {/* Matching Code Snippets Preview */}
                {matchingLines.length > 0 && (
                  <div className="mt-1.5 p-1.5 rounded bg-black/40 border border-white/[0.06] text-[10px] font-mono space-y-0.5">
                    <div className="text-neutral-400 text-[9px] font-sans pb-0.5 border-b border-white/[0.04]">
                      코드 내 매칭 ({matchingLines.length}곳):
                    </div>
                    {matchingLines.map((m, i) => (
                      <div key={i} className="flex items-start gap-1 text-neutral-300 truncate">
                        <span className="text-neutral-500 shrink-0 select-none">{m.num}:</span>
                        <span className="truncate">{highlightTokens(m.text, searchTokens)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
