'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TableModel, ColumnModel, DiagramModel, MemoModel, PageModel } from '@/types/erd';
import {
  Search,
  Table2,
  Columns3,
  Key,
  ArrowRight,
  X,
  Workflow,
  FileText,
  Layers,
} from 'lucide-react';

export interface SearchResultItem {
  type: 'table' | 'column' | 'diagram' | 'memo';
  id: string;
  tableId?: string;
  tableName?: string;
  tablePhysicalName?: string;
  headerColor?: string;
  columnId?: string;
  columnLogicalName?: string;
  columnPhysicalName?: string;
  columnType?: string;
  isPk?: boolean;
  isFk?: boolean;
  isHighlighted?: boolean;
  // Diagram specific
  diagramId?: string;
  diagramTitle?: string;
  diagramType?: string;
  matchingLines?: { lineNum: number; text: string }[];
  matchCount?: number;
  // Memo specific
  memoId?: string;
  memoContent?: string;
  // Page info
  pageId?: string;
  pageName?: string;
  matchScore: number;
}

export interface SearchSelectionPayload {
  type: 'table' | 'column' | 'diagram' | 'memo';
  id: string;
  columnId?: string;
  pageId?: string;
  matchedDiagramIds?: string[];
  query?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Record<string, TableModel>;
  diagrams?: Record<string, DiagramModel>;
  memos?: Record<string, MemoModel>;
  pages?: Record<string, PageModel>;
  onSelectResult: (payload: SearchSelectionPayload) => void;
}

// 1. Obsidian-style Token Parser: supports "exact phrase" and whitespace separation
export const parseSearchTokens = (query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    const token = (match[1] || match[2] || '').trim().toLowerCase();
    if (token) {
      tokens.push(token);
    }
  }

  return Array.from(new Set(tokens));
};

// 2. Obsidian-style Multi-Token Highlighter
export const highlightTokens = (text: string, tokens: string[]) => {
  if (!tokens || tokens.length === 0 || !text) return text;

  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  const pattern = sortedTokens
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  if (!pattern) return text;

  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  const lowerTokens = new Set(tokens.map((t) => t.toLowerCase()));

  return parts.map((part, i) =>
    lowerTokens.has(part.toLowerCase()) ? (
      <mark key={i} className="bg-amber-400/30 text-amber-200 px-0.5 rounded font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tables,
  diagrams = {},
  memos = {},
  pages = {},
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'table' | 'column' | 'diagram' | 'memo'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const searchTokens = useMemo(() => parseSearchTokens(query), [query]);

  const results: SearchResultItem[] = useMemo(() => {
    const items: SearchResultItem[] = [];
    const tokens = searchTokens;
    const isBlank = tokens.length === 0;

    // 1. Tables & Columns Matching
    Object.values(tables).forEach((tbl) => {
      const tblLogic = (tbl.logicalName || '').toLowerCase();
      const tblPhys = (tbl.physicalName || '').toLowerCase();
      const tblDisplay = tbl.logicalName || tbl.physicalName || 'Unnamed';
      const tblComment = (tbl.comment || '').toLowerCase();
      const tblPageName = (tbl.pageId && pages[tbl.pageId]?.name) || '메인 ERD';

      // Table Matching
      if (filterType === 'all' || filterType === 'table') {
        let isMatch = false;
        let score = 0;

        if (isBlank) {
          isMatch = true;
          score = 1;
        } else {
          // Table text pool
          const tableTextPool = `${tblLogic} ${tblPhys} ${tblComment} ${tblPageName.toLowerCase()}`;
          // Obsidian AND check: all tokens must be present in the table pool
          const allTokensPresent = tokens.every((token) => tableTextPool.includes(token));

          if (allTokensPresent) {
            isMatch = true;
            score = 60;
            if (tokens.every((t) => tblLogic.includes(t) || tblPhys.includes(t))) {
              score += 40;
            }
            if (tblLogic === query.toLowerCase().trim() || tblPhys === query.toLowerCase().trim()) {
              score += 50;
            }
          }
        }

        if (isMatch) {
          items.push({
            type: 'table',
            id: tbl.id,
            tableId: tbl.id,
            tableName: tblDisplay,
            tablePhysicalName: tbl.physicalName,
            headerColor: tbl.headerColor,
            pageId: tbl.pageId,
            pageName: tblPageName,
            matchScore: score,
          });
        }
      }

      // Column Matching
      if (filterType === 'all' || filterType === 'column') {
        const columns = (tbl.columnOrder || [])
          .map((id) => tbl.columnsById?.[id])
          .filter(Boolean) as ColumnModel[];

        columns.forEach((col) => {
          const colLogic = (col.logicalName || '').toLowerCase();
          const colPhys = (col.physicalName || '').toLowerCase();
          const colComment = (col.comment || '').toLowerCase();
          const colTypeStr = `${col.type?.name || ''}${col.type?.length ? `(${col.type.length})` : ''}`.toLowerCase();

          let isMatch = false;
          let score = 0;

          if (isBlank) {
            if (filterType === 'column') {
              isMatch = true;
              score = 1;
            }
          } else {
            // Column text pool includes parent table context
            const colTextPool = `${colLogic} ${colPhys} ${colComment} ${colTypeStr} ${tblLogic} ${tblPhys}`;
            const allTokensPresent = tokens.every((token) => colTextPool.includes(token));

            if (allTokensPresent) {
              isMatch = true;
              score = 55;
              if (tokens.every((t) => colLogic.includes(t) || colPhys.includes(t))) {
                score += 35;
              }
              if (colLogic === query.toLowerCase().trim() || colPhys === query.toLowerCase().trim()) {
                score += 45;
              }
            }
          }

          if (isMatch) {
            items.push({
              type: 'column',
              id: tbl.id,
              tableId: tbl.id,
              tableName: tblDisplay,
              tablePhysicalName: tbl.physicalName,
              headerColor: tbl.headerColor,
              columnId: col.id,
              columnLogicalName: col.logicalName,
              columnPhysicalName: col.physicalName,
              columnType: col.type?.name ? `${col.type.name.toLowerCase()}${col.type.length ? `(${col.type.length})` : ''}` : '',
              isPk: col.isPk,
              isFk: col.isFk,
              isHighlighted: col.isHighlighted,
              pageId: tbl.pageId,
              pageName: tblPageName,
              matchScore: score,
            });
          }
        });
      }
    });

    // 2. Diagrams (Mermaid) Matching (Obsidian-style Multi-token AND Search)
    if (filterType === 'all' || filterType === 'diagram') {
      Object.values(diagrams).forEach((diag) => {
        const title = diag.title || '제목 없음';
        const titleLower = title.toLowerCase();
        const typeStr = (diag.type || 'sequence').toLowerCase();
        const code = diag.code || '';
        const lines = code.split('\n');
        const diagPageName = (diag.pageId && pages[diag.pageId]?.name) || '메인 ERD';

        let isMatch = false;
        let score = 0;
        let finalMatchingLines: { lineNum: number; text: string }[] = [];

        if (isBlank) {
          if (filterType === 'diagram') {
            isMatch = true;
            score = 1;
          }
        } else {
          // Full text pool of the diagram
          const fullPool = `${titleLower} ${typeStr} ${diagPageName.toLowerCase()} ${code.toLowerCase()}`;

          // Obsidian rule: All tokens must exist somewhere in the diagram
          const allTokensPresent = tokens.every((token) => fullPool.includes(token));

          if (allTokensPresent) {
            isMatch = true;
            score = 65;

            // Score boost if tokens match title
            const titleMatchCount = tokens.filter((t) => titleLower.includes(t)).length;
            score += titleMatchCount * 25;
            if (titleLower === query.toLowerCase().trim()) {
              score += 50;
            }

            // Find matching lines and rank by token density (how many query tokens appear in the same line)
            interface CandidateLine {
              lineNum: number;
              text: string;
              tokenDensity: number;
            }
            const candidates: CandidateLine[] = [];

            lines.forEach((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return;
              const lineLower = trimmed.toLowerCase();
              const matchedTokensInLine = tokens.filter((t) => lineLower.includes(t));

              if (matchedTokensInLine.length > 0) {
                candidates.push({
                  lineNum: idx + 1,
                  text: trimmed,
                  tokenDensity: matchedTokensInLine.length,
                });
              }
            });

            // If a single line contains multiple query tokens, boost score!
            const maxDensity = candidates.reduce((max, c) => Math.max(max, c.tokenDensity), 0);
            if (maxDensity > 1) {
              score += maxDensity * 20;
            }

            // Sort candidate lines by density descending, take top 4, then re-sort by line number
            candidates.sort((a, b) => b.tokenDensity - a.tokenDensity || a.lineNum - b.lineNum);
            finalMatchingLines = candidates
              .slice(0, 4)
              .sort((a, b) => a.lineNum - b.lineNum)
              .map((c) => ({ lineNum: c.lineNum, text: c.text }));
          }
        }

        if (isMatch) {
          items.push({
            type: 'diagram',
            id: diag.id,
            diagramId: diag.id,
            diagramTitle: title,
            diagramType: diag.type || 'sequence',
            matchingLines: finalMatchingLines,
            matchCount: finalMatchingLines.length,
            pageId: diag.pageId,
            pageName: diagPageName,
            matchScore: score,
          });
        }
      });
    }

    // 3. Memo Matching
    if (filterType === 'all' || filterType === 'memo') {
      Object.values(memos).forEach((memo) => {
        const content = memo.content || '';
        const contentLower = content.toLowerCase();
        const memoPageName = (memo.pageId && pages[memo.pageId]?.name) || '메인 ERD';

        let isMatch = false;
        let score = 0;

        if (isBlank) {
          if (filterType === 'memo') {
            isMatch = true;
            score = 1;
          }
        } else {
          const memoPool = `${contentLower} ${memoPageName.toLowerCase()}`;
          const allTokensPresent = tokens.every((token) => memoPool.includes(token));

          if (allTokensPresent) {
            isMatch = true;
            score = 50 + tokens.length * 10;
          }
        }

        if (isMatch) {
          items.push({
            type: 'memo',
            id: memo.id,
            memoId: memo.id,
            memoContent: content,
            pageId: memo.pageId,
            pageName: memoPageName,
            matchScore: score,
          });
        }
      });
    }

    items.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      const nameA = a.tableName || a.diagramTitle || a.memoContent || '';
      const nameB = b.tableName || b.diagramTitle || b.memoContent || '';
      return nameA.localeCompare(nameB, 'ko');
    });

    return items;
  }, [tables, diagrams, memos, pages, searchTokens, filterType, query]);

  // Extract all matched diagram IDs for in-canvas navigation
  const matchedDiagramIds = useMemo(() => {
    return results
      .filter((r) => r.type === 'diagram' && r.diagramId)
      .map((r) => r.diagramId as string);
  }, [results]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  const handleSelect = (item: SearchResultItem) => {
    onSelectResult({
      type: item.type,
      id: item.type === 'column' ? (item.tableId || item.id) : item.id,
      columnId: item.columnId,
      pageId: item.pageId,
      matchedDiagramIds: item.type === 'diagram' ? matchedDiagramIds : undefined,
      query: query.trim(),
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1e1e1e] border border-white/[0.15] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-white/[0.08] bg-[#252525] flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="다중 키워드 검색 (예: 결제 토큰, user id, &quot;kakao pay&quot;)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-400 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-neutral-400">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-3.5 py-2 bg-[#181818] border-b border-white/[0.06] flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              전체 ({results.length})
            </button>
            <button
              onClick={() => setFilterType('diagram')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'diagram'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              <Workflow className="w-3 h-3" />
              다이어그램 (Mermaid)
            </button>
            <button
              onClick={() => setFilterType('table')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'table'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              <Table2 className="w-3 h-3" />
              테이블
            </button>
            <button
              onClick={() => setFilterType('column')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'column'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              <Columns3 className="w-3 h-3" />
              속성(컬럼)
            </button>
            <button
              onClick={() => setFilterType('memo')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                filterType === 'memo'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.1]'
              }`}
            >
              <FileText className="w-3 h-3" />
              메모
            </button>
          </div>

          <span className="text-[11px] text-neutral-400 font-mono shrink-0 hidden sm:inline">
            {results.length}개의 항목 발견
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-2 bg-[#1e1e1e] max-h-[55vh]"
        >
          {results.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-neutral-600" />
              <p className="text-sm">일치하는 결과가 없습니다.</p>
              <p className="text-xs text-neutral-600">여러 단어를 띄어쓰기로 입력하거나 따옴표 구문(&quot;...&quot;)을 사용해보세요.</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={`${item.type}_${item.id}_${item.columnId || ''}_${index}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2.5 rounded-xl flex items-start justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/25 border border-indigo-500/50 shadow-md text-white'
                      : 'hover:bg-white/[0.04] border border-transparent text-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Item Icon */}
                    <div
                      style={{
                        backgroundColor:
                          item.type === 'table'
                            ? item.headerColor || '#10b981'
                            : item.type === 'diagram'
                            ? 'rgba(99, 102, 241, 0.25)'
                            : item.type === 'memo'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5"
                    >
                      {item.type === 'table' ? (
                        <Table2 className="w-4 h-4 text-white" />
                      ) : item.type === 'diagram' ? (
                        <Workflow className="w-4 h-4 text-indigo-400" />
                      ) : item.type === 'memo' ? (
                        <FileText className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Columns3 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex flex-col min-w-0 flex-1">
                      {/* Diagram Item View */}
                      {item.type === 'diagram' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">
                              {highlightTokens(item.diagramTitle || '제목 없음', searchTokens)}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {item.diagramType || 'diagram'}
                            </span>
                            {item.pageName && (
                              <span className="text-[11px] text-neutral-400 flex items-center gap-1 bg-white/[0.04] px-1.5 py-0.2 rounded">
                                <Layers className="w-3 h-3 text-indigo-400" />
                                {item.pageName}
                              </span>
                            )}
                            {item.matchingLines && item.matchingLines.length > 0 && (
                              <span className="text-[10px] text-emerald-400 font-medium">
                                • {item.matchingLines.length}개 핵심 라인
                              </span>
                            )}
                          </div>

                          {/* Matching Lines Snippets */}
                          {item.matchingLines && item.matchingLines.length > 0 && (
                            <div className="mt-1 p-2 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono space-y-1">
                              {item.matchingLines.map((line, lIdx) => (
                                <div key={lIdx} className="flex items-start gap-1.5 text-neutral-300">
                                  <span className="text-neutral-500 shrink-0 select-none text-[10px]">
                                    L{line.lineNum}:
                                  </span>
                                  <span className="truncate">
                                    {highlightTokens(line.text, searchTokens)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Table Item View */}
                      {item.type === 'table' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">
                            {highlightTokens(item.tableName || '', searchTokens)}
                          </span>
                          {item.tablePhysicalName && (
                            <span className="font-mono text-xs text-neutral-400 truncate">
                              ({highlightTokens(item.tablePhysicalName, searchTokens)})
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/[0.08] text-emerald-300">
                            Table
                          </span>
                          {item.pageName && (
                            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-emerald-400" />
                              {item.pageName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Column Item View */}
                      {item.type === 'column' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.isHighlighted && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] shrink-0" />
                          )}
                          <span className="font-bold text-sm text-white truncate">
                            {highlightTokens(item.columnLogicalName || item.columnPhysicalName || '', searchTokens)}
                          </span>
                          {item.columnPhysicalName && (
                            <span className="font-mono text-xs text-neutral-400 truncate">
                              [{highlightTokens(item.columnPhysicalName, searchTokens)}]
                            </span>
                          )}
                          {item.isPk && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <Key className="w-2.5 h-2.5" /> PK
                            </span>
                          )}
                          {item.isFk && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              FK
                            </span>
                          )}
                          {item.columnType && (
                            <span className="font-mono text-[11px] text-emerald-300/80 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40">
                              {item.columnType}
                            </span>
                          )}
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            in <strong className="text-neutral-200">{item.tableName}</strong>
                          </span>
                        </div>
                      )}

                      {/* Memo Item View */}
                      {item.type === 'memo' && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Memo
                            </span>
                            {item.pageName && (
                              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                                <Layers className="w-3 h-3 text-amber-400" />
                                {item.pageName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-300 line-clamp-2 mt-1">
                            {highlightTokens(item.memoContent || '', searchTokens)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Hint */}
                  <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium shrink-0 pl-2 mt-1">
                    <span className="hidden sm:inline">이동</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Keyboard Shortcuts */}
        <div className="p-3 bg-[#181818] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-[10px]">
                ↓
              </kbd>
              <span>이동</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 font-mono text-[10px]">
                Enter
              </kbd>
              <span>선택 및 캔버스 이동</span>
            </span>
          </div>
          <span className="text-neutral-500 text-[10px]">
            공백으로 여러 단어를 조합하여 검색 가능
          </span>
        </div>
      </div>
    </div>
  );
};
