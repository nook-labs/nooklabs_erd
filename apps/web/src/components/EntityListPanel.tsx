'use client';

import React, { useState, useMemo } from 'react';
import { TableModel, NodeView } from '@/types/erd';
import {
  Search,
  X,
  Trash2,
  Table2,
  ArrowUpDown,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface EntityListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Record<string, TableModel>;
  nodes: Record<string, NodeView>;
  onFocusTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onAddTable?: () => void;
  isReadOnly?: boolean;
}

type SortField = 'logicalName' | 'physicalName';
type SortOrder = 'asc' | 'desc';

export const EntityListPanel: React.FC<EntityListPanelProps> = ({
  isOpen,
  onClose,
  tables,
  nodes,
  onFocusTable,
  onDeleteTable,
  onAddTable,
  isReadOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('logicalName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const tableList = useMemo(() => Object.values(tables), [tables]);

  // Filter & Sort
  const filteredTables = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = tableList.filter((tbl) => {
      if (!q) return true;
      const logicMatch = (tbl.logicalName || '').toLowerCase().includes(q);
      const physMatch = (tbl.physicalName || '').toLowerCase().includes(q);
      const colMatch = Object.values(tbl.columnsById || {}).some(
        (c) =>
          (c.logicalName || '').toLowerCase().includes(q) ||
          (c.physicalName || '').toLowerCase().includes(q)
      );
      return logicMatch || physMatch || colMatch;
    });

    list.sort((a, b) => {
      const valA = (sortField === 'logicalName' ? (a.logicalName || a.physicalName) : a.physicalName) || '';
      const valB = (sortField === 'logicalName' ? (b.logicalName || b.physicalName) : b.physicalName) || '';

      const comparison = valA.localeCompare(valB, 'ko', { sensitivity: 'base', numeric: true });
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [tableList, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#262626] border-l border-white/[0.1] shadow-2xl z-40 flex flex-col font-sans select-none animate-in slide-in-from-right-5 duration-200 backdrop-blur-md">
      {/* 1. Header (ERD Cloud ENTITY style) */}
      <div className="h-11 px-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#2d2d2d] text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-600/80 flex items-center justify-center shadow-sm">
            <Table2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-xs tracking-wider uppercase text-neutral-100">
            ENTITY ({tableList.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onAddTable && !isReadOnly && (
            <button
              onClick={onAddTable}
              className="p-1 rounded text-neutral-400 hover:text-emerald-400 hover:bg-white/[0.08] transition-colors"
              title="새 테이블 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Search Input */}
      <div className="p-2 border-b border-white/[0.08] bg-[#222222]">
        <div className="relative flex items-center bg-white text-black rounded px-2.5 py-1.5 shadow-inner">
          <input
            type="text"
            placeholder="Search entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-900 placeholder:text-neutral-500 outline-none font-medium pr-5"
            autoFocus
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-2 pointer-events-none" />
          )}
        </div>
      </div>

      {/* 3. Table Column Sorting Headers */}
      <div className="grid grid-cols-[1fr_1fr_32px] items-center bg-[#1e1e1e] border-b border-white/[0.08] text-[11px] font-semibold text-neutral-400 px-3 py-2">
        <button
          onClick={() => toggleSort('logicalName')}
          className="flex items-center gap-1 hover:text-white text-left transition-colors truncate"
          title="논리명 정렬"
        >
          <span>Logical Name</span>
          <ArrowUpDown className={`w-3 h-3 ${sortField === 'logicalName' ? 'text-emerald-400' : 'opacity-40'}`} />
        </button>

        <button
          onClick={() => toggleSort('physicalName')}
          className="flex items-center gap-1 hover:text-white text-left transition-colors truncate pl-2"
          title="물리명 정렬"
        >
          <span>Physical Name</span>
          <ArrowUpDown className={`w-3 h-3 ${sortField === 'physicalName' ? 'text-emerald-400' : 'opacity-40'}`} />
        </button>

        <div className="text-center text-neutral-500 text-[10px]">
          <Trash2 className="w-3 h-3 mx-auto opacity-50" />
        </div>
      </div>

      {/* 4. Entity Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] bg-[#222222]">
        {filteredTables.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-xs">
            {searchQuery ? '검색된 엔티티가 없습니다.' : '생성된 테이블이 없습니다.'}
          </div>
        ) : (
          filteredTables.map((tbl) => {
            const colCount = tbl.columnOrder?.length || 0;
            const headerColor = tbl.headerColor || '#10b981';

            return (
              <div
                key={tbl.id}
                onClick={() => onFocusTable(tbl.id)}
                className="grid grid-cols-[1fr_1fr_32px] items-center px-3 py-2 hover:bg-white/[0.06] cursor-pointer group transition-colors text-xs text-neutral-200"
                title="클릭하여 캔버스 내 해당 테이블로 이동"
              >
                {/* Logical Name with color badge */}
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <div
                    style={{ backgroundColor: headerColor }}
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                  />
                  <span className="font-bold text-white truncate text-[12px] group-hover:text-emerald-300 transition-colors">
                    {tbl.logicalName || tbl.physicalName}
                  </span>
                </div>

                {/* Physical Name */}
                <div className="font-mono text-neutral-400 group-hover:text-neutral-200 truncate pl-2 text-[11px] flex items-center justify-between">
                  <span className="truncate">{tbl.physicalName}</span>
                  <span className="text-[9.5px] text-neutral-500 font-sans shrink-0 mr-1">
                    ({colCount})
                  </span>
                </div>

                {/* Delete Button */}
                <div className="flex items-center justify-center">
                  {!isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`'${tbl.logicalName || tbl.physicalName}' 테이블을 삭제하시겠습니까?`)) {
                          onDeleteTable(tbl.id);
                        }
                      }}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                      title="테이블 삭제"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Footer Summary */}
      <div className="p-2.5 bg-[#1e1e1e] border-t border-white/[0.08] text-[11px] text-neutral-400 flex items-center justify-between shrink-0">
        <span>총 {filteredTables.length}개 엔티티</span>
        <span className="text-[10px] text-neutral-500">클릭 시 해당 테이블로 이동</span>
      </div>
    </div>
  );
};
