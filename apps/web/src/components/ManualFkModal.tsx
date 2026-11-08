'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TableModel,
  ColumnModel,
  RelationshipModel,
  RelationshipType,
  CrowsFootMultiplicity,
} from '@/types/erd';
import { X, Link2, Unlink, Key, ArrowRight, Check, AlertCircle } from 'lucide-react';

interface ManualFkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTable: TableModel;
  currentColumn: ColumnModel;
  allTables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  onAttachFk: (params: {
    parentTableId: string;
    parentColumnId: string;
    relationshipType: RelationshipType;
    sourceMultiplicity?: CrowsFootMultiplicity;
    targetMultiplicity?: CrowsFootMultiplicity;
  }) => void;
  onDetachFk: () => void;
}

export const ManualFkModal: React.FC<ManualFkModalProps> = ({
  isOpen,
  onClose,
  currentTable,
  currentColumn,
  allTables,
  relationships,
  onAttachFk,
  onDetachFk,
}) => {
  const otherTables = useMemo(() => {
    return Object.values(allTables).filter((t) => t.id !== currentTable.id);
  }, [allTables, currentTable.id]);

  // Current relationship info if already FK
  const existingRel = useMemo(() => {
    if (!currentColumn.relationshipId) return null;
    return relationships[currentColumn.relationshipId] || null;
  }, [currentColumn.relationshipId, relationships]);

  const existingParentTable = useMemo(() => {
    if (!existingRel) return null;
    return allTables[existingRel.parentTableId] || null;
  }, [existingRel, allTables]);

  const existingParentCol = useMemo(() => {
    if (!existingRel || !existingParentTable) return null;
    const mapping = existingRel.columnMappings.find((m) => m.childColumnId === currentColumn.id);
    const pColId = mapping?.parentColumnId || currentColumn.sourceColumnId;
    return pColId ? existingParentTable.columnsById[pColId] : null;
  }, [existingRel, existingParentTable, currentColumn]);

  const [selectedParentTableId, setSelectedParentTableId] = useState<string>('');
  const [selectedParentColId, setSelectedParentColId] = useState<string>('');
  const [relType, setRelType] = useState<RelationshipType>('non-identifying');
  const [targetMultiplicity, setTargetMultiplicity] = useState<CrowsFootMultiplicity>('optional-many');

  // Initialize selected values
  useEffect(() => {
    if (isOpen) {
      if (existingRel && existingParentTable) {
        setSelectedParentTableId(existingParentTable.id);
        setSelectedParentColId(existingParentCol?.id || '');
        setRelType(existingRel.relationshipType || 'non-identifying');
        setTargetMultiplicity(existingRel.targetMultiplicity || 'optional-many');
      } else {
        const firstOther = otherTables[0];
        if (firstOther) {
          setSelectedParentTableId(firstOther.id);
          const firstPk = firstOther.primaryKeyId || firstOther.columnOrder[0];
          setSelectedParentColId(firstPk || '');
        } else {
          setSelectedParentTableId('');
          setSelectedParentColId('');
        }
        setRelType(currentColumn.isPk ? 'identifying' : 'non-identifying');
        setTargetMultiplicity('optional-many');
      }
    }
  }, [isOpen, existingRel, existingParentTable, existingParentCol, otherTables, currentColumn.isPk]);

  // When parent table changes, update default column
  const handleParentTableChange = (tableId: string) => {
    setSelectedParentTableId(tableId);
    const targetTable = allTables[tableId];
    if (targetTable) {
      const pkId = targetTable.primaryKeyId || targetTable.columnOrder[0];
      setSelectedParentColId(pkId || '');
    }
  };

  if (!isOpen) return null;

  const targetParentTable = allTables[selectedParentTableId];
  const targetParentColumns = targetParentTable
    ? targetParentTable.columnOrder.map((cId) => targetParentTable.columnsById[cId]).filter(Boolean)
    : [];

  const handleApply = () => {
    if (!selectedParentTableId || !selectedParentColId) return;
    onAttachFk({
      parentTableId: selectedParentTableId,
      parentColumnId: selectedParentColId,
      relationshipType: relType,
      sourceMultiplicity: 'one',
      targetMultiplicity,
    });
    onClose();
  };

  const handleDetach = () => {
    onDetachFk();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#222428] border border-white/10 rounded-[4px] w-[460px] max-h-[85vh] shadow-2xl flex flex-col font-sans text-xs text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1a1b1e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="font-semibold text-xs text-white">외래키(FK) 수동 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Target Column Summary Card */}
          <div className="p-2.5 bg-[#18191b] rounded-[2px] border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-neutral-400">대상 컬럼 (자식)</div>
              <div className="text-white font-semibold text-xs font-mono mt-0.5 flex items-center gap-1">
                <span className="text-emerald-400">{currentTable.physicalName}</span>
                <span className="text-neutral-500">.</span>
                <span className="text-white">{currentColumn.physicalName}</span>
                <span className="text-neutral-400 text-[11px] font-normal">
                  ({currentColumn.logicalName || currentColumn.physicalName})
                </span>
              </div>
            </div>
            <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {currentColumn.type.name}
            </div>
          </div>

          {/* Current Connected Info if already FK */}
          {currentColumn.isFk && existingParentTable && (
            <div className="p-2.5 bg-[#18191b] border border-sky-500/30 rounded-[2px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <div className="text-xs">
                  <span className="text-neutral-400">참조 중: </span>
                  <span className="font-mono font-bold text-sky-400">
                    {existingParentTable.physicalName}.{existingParentCol?.physicalName || 'PK'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetach}
                className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-[2px] text-[11px] font-medium transition-colors"
                title="외래키 연결 해제"
              >
                <Unlink className="w-3 h-3" />
                해제
              </button>
            </div>
          )}

          {otherTables.length === 0 ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[2px] flex items-start gap-2 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold">참조할 다른 테이블이 없습니다.</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  2개 이상의 테이블이 있어야 외래키를 연결할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Select Parent Table */}
              <div className="space-y-1">
                <label className="block text-neutral-400 font-medium text-[11px]">
                  1. 참조할 부모 테이블
                </label>
                <select
                  value={selectedParentTableId}
                  onChange={(e) => handleParentTableChange(e.target.value)}
                  className="w-full bg-[#18191b] border border-white/10 rounded-[2px] px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                >
                  {otherTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.physicalName} ({t.logicalName || t.physicalName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Parent Column */}
              <div className="space-y-1">
                <label className="block text-neutral-400 font-medium text-[11px]">
                  2. 참조할 부모 컬럼 (기본키 / Unique)
                </label>
                <select
                  value={selectedParentColId}
                  onChange={(e) => setSelectedParentColId(e.target.value)}
                  className="w-full bg-[#18191b] border border-white/10 rounded-[2px] px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                >
                  {targetParentColumns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.isPk ? '🔑 ' : ''}
                      {c.physicalName} ({c.type.name}) - {c.logicalName || c.physicalName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Relationship Type Selection */}
              <div className="space-y-1">
                <label className="block text-neutral-400 font-medium text-[11px]">
                  3. 관계 유형
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRelType('non-identifying')}
                    className={`py-1.5 px-2 rounded-[2px] border text-center font-medium text-xs transition-colors ${
                      relType === 'non-identifying'
                        ? 'bg-[#1b5e20] border-emerald-500 text-white'
                        : 'bg-[#18191b] border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    비식별 관계 (점선)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelType('identifying')}
                    className={`py-1.5 px-2 rounded-[2px] border text-center font-medium text-xs transition-colors ${
                      relType === 'identifying'
                        ? 'bg-[#1b5e20] border-emerald-500 text-white'
                        : 'bg-[#18191b] border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    식별 관계 (실선 / PK)
                  </button>
                </div>
              </div>

              {/* Relationship Preview Bar */}
              <div className="p-2 bg-[#18191b] rounded-[2px] border border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="text-sky-400 font-semibold">
                  {targetParentTable?.physicalName || 'Parent'}.
                  {targetParentColumns.find((c) => c.id === selectedParentColId)?.physicalName || 'id'}
                </div>
                <ArrowRight className="w-3 h-3 text-neutral-500" />
                <div className="text-emerald-400 font-semibold">
                  {currentTable.physicalName}.{currentColumn.physicalName} (FK)
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#1a1b1e] border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-[2px] border border-white/10 text-neutral-300 hover:bg-white/10 transition-colors text-[11px]"
          >
            취소
          </button>
          {otherTables.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 px-3.5 py-1 rounded-[2px] bg-[#1b5e20] hover:bg-[#257d2c] text-white font-medium shadow-sm transition-colors text-[11px]"
            >
              <Check className="w-3 h-3" />
              적용
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
