'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TableModel, ColumnModel } from '@/types/erd';
import { Search, Table2, Columns3, Key, ArrowRight, X } from 'lucide-react';

interface SearchResultItem {
  type: 'table' | 'column';
  tableId: string;
  tableName: string;
  tablePhysicalName: string;
  headerColor?: string;
  columnId?: string;
  columnLogicalName?: string;
  columnPhysicalName?: string;
  columnType?: string;
  isPk?: boolean;
  isFk?: boolean;
  isHighlighted?: boolean;
  matchScore: number;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Record<string, TableModel>;
  onSelectResult: (tableId: string, columnId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tables,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'table' | 'column'>('all');
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

  const results: SearchResultItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: SearchResultItem[] = [];

    Object.values(tables).forEach((tbl) => {
      const tblLogic = (tbl.logicalName || '').toLowerCase();
      const tblPhys = (tbl.physicalName || '').toLowerCase();
      const tblDisplay = tbl.logicalName || tbl.physicalName || 'Unnamed';

      // 1. Table Matching
      if (filterType === 'all' || filterType === 'table') {
        let isMatch = false;
        let score = 0;

        if (!q) {
          isMatch = true;
          score = 1;
        } else if (tblPhys === q || tblLogic === q) {
          isMatch = true;
          score = 100;
        } else if (tblPhys.startsWith(q) || tblLogic.startsWith(q)) {
          isMatch = true;
          score = 80;
        } else if (tblPhys.includes(q) || tblLogic.includes(q)) {
          isMatch = true;
          score = 50;
        }

        if (isMatch) {
          items.push({
            type: 'table',
            tableId: tbl.id,
            tableName: tblDisplay,
            tablePhysicalName: tbl.physicalName,
            headerColor: tbl.headerColor,
            matchScore: score,
          });
        }
      }

      // 2. Column Matching (논리명, 물리명, 코멘트, 타입)
      if (filterType === 'all' || filterType === 'column') {
        const columns = tbl.columnOrder
          .map((id) => tbl.columnsById[id])
          .filter(Boolean) as ColumnModel[];

        columns.forEach((col) => {
          const colLogic = (col.logicalName || '').toLowerCase();
          const colPhys = (col.physicalName || '').toLowerCase();
          const colComment = (col.comment || '').toLowerCase();
          const colTypeStr = `${col.type?.name || ''}${col.type?.length ? `(${col.type.length})` : ''}`.toLowerCase();

          let isMatch = false;
          let score = 0;

          if (!q) {
            if (filterType === 'column') {
              isMatch = true;
              score = 1;
            }
          } else if (colPhys === q || colLogic === q) {
            isMatch = true;
            score = 95;
          } else if (colPhys.startsWith(q) || colLogic.startsWith(q)) {
            isMatch = true;
            score = 75;
          } else if (colPhys.includes(q) || colLogic.includes(q)) {
            isMatch = true;
            score = 60;
          } else if (colComment.includes(q) || colTypeStr.includes(q)) {
            isMatch = true;
            score = 30;
          }

          if (isMatch) {
            items.push({
              type: 'column',
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
              matchScore: score,
            });
          }
        });
      }
    });

    items.sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.tableName.localeCompare(b.tableName, 'ko');
    });

    return items;
  }, [tables, query, filterType]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const item = results[selectedIndex];
      onSelectResult(item.tableId, item.columnId);
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-28 px-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#1e1e1e] border border-white/[0.15] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-white/[0.08] bg-[#252525] flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="테이블 또는 속성(논리명/물리명) 검색... (예: user, id, email, 회원)"
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
        <div className="px-3.5 py-2 bg-[#181818] border-b border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
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
          </div>

          <span className="text-[11px] text-neutral-400 font-mono">
            {results.length}개의 항목 발견
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-2 bg-[#1e1e1e] max-h-96"
        >
          {results.length === 0 ? (
            <div className="p-12 text-center text-neutral-500 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 text-neutral-600" />
              <p className="text-sm">일치하는 테이블 또는 속성이 없습니다.</p>
              <p className="text-xs text-neutral-600">논리명이나 물리명을 다시 확인해보세요.</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={`${item.type}_${item.tableId}_${item.columnId || 'tbl'}_${index}`}
                  onClick={() => {
                    onSelectResult(item.tableId, item.columnId);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-600/25 border border-emerald-500/50 shadow-md text-white'
                      : 'hover:bg-white/[0.04] border border-transparent text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Item Icon */}
                    <div
                      style={{
                        backgroundColor:
                          item.type === 'table'
                            ? item.headerColor || '#10b981'
                            : 'rgba(16, 185, 129, 0.2)',
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                    >
                      {item.type === 'table' ? (
                        <Table2 className="w-4 h-4 text-white" />
                      ) : (
                        <Columns3 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex flex-col min-w-0">
                      {item.type === 'table' ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {item.tableName}
                          </span>
                          {item.tablePhysicalName && (
                            <span className="font-mono text-xs text-neutral-400 truncate">
                              ({item.tablePhysicalName})
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/[0.08] text-emerald-300">
                            Table
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Highlight dot if active */}
                          {item.isHighlighted && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] shrink-0" />
                          )}

                          {/* Column Logical Name */}
                          <span className="font-bold text-sm text-white truncate">
                            {item.columnLogicalName || item.columnPhysicalName}
                          </span>

                          {/* Column Physical Name */}
                          {item.columnPhysicalName && (
                            <span className="font-mono text-xs text-neutral-400 truncate">
                              [{item.columnPhysicalName}]
                            </span>
                          )}

                          {/* PK / FK Badges */}
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

                          {/* Column Type */}
                          {item.columnType && (
                            <span className="font-mono text-[11px] text-emerald-300/80 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40">
                              {item.columnType}
                            </span>
                          )}

                          {/* Parent Table info */}
                          <span className="text-xs text-neutral-400 flex items-center gap-1">
                            in <strong className="text-neutral-200">{item.tableName}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Hint */}
                  <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium shrink-0 pl-2">
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
            Ctrl + F로 언제든 검색 가능
          </span>
        </div>
      </div>
    </div>
  );
};
