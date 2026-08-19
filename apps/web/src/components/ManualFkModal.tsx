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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-[#141824] border border-white/[0.12] rounded-xl w-[480px] max-h-[85vh] shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col font-sans text-xs text-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1a2234] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">외래키(FK) 수동 설정</h3>
              <p className="text-[11px] text-neutral-400">
                선택한 컬럼을 다른 테이블의 기본키/컬럼과 외래키로 연결합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Column Summary Card */}
          <div className="p-3 bg-[#0c101c] rounded-lg border border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">대상 컬럼 (자식)</div>
              <div className="text-white font-semibold text-xs font-mono mt-0.5 flex items-center gap-1.5">
                <span className="text-emerald-400">{currentTable.physicalName}</span>
                <span className="text-neutral-500">.</span>
                <span className="text-white">{currentColumn.physicalName}</span>
                <span className="text-neutral-400 text-[11px] font-normal">
                  ({currentColumn.logicalName || currentColumn.physicalName})
                </span>
              </div>
            </div>
            <div className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {currentColumn.type.name}
            </div>
          </div>

          {/* Current Connected Info if already FK */}
          {currentColumn.isFk && existingParentTable && (
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <div className="text-xs">
                  <span className="text-sky-200">현재 참조 중: </span>
                  <span className="font-mono font-bold text-sky-400">
                    {existingParentTable.physicalName}.{existingParentCol?.physicalName || 'PK'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetach}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded text-[11px] font-medium transition-colors"
                title="외래키 연결 해제"
              >
                <Unlink className="w-3 h-3" />
                연결 해제
              </button>
            </div>
          )}

          {otherTables.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">참조할 다른 테이블이 없습니다.</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  캔버스에 2개 이상의 테이블이 있어야 외래키를 연결할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Select Parent Table */}
              <div className="space-y-1.5">
                <label className="block text-neutral-300 font-semibold text-xs">
                  1. 참조할 부모 테이블 선택
                </label>
                <select
                  value={selectedParentTableId}
                  onChange={(e) => handleParentTableChange(e.target.value)}
                  className="w-full bg-[#0c101c] border border-white/[0.12] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-sky-500 font-mono"
                >
                  {otherTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.physicalName} ({t.logicalName || t.physicalName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Parent Column */}
              <div className="space-y-1.5">
                <label className="block text-neutral-300 font-semibold text-xs">
                  2. 참조할 부모 컬럼 선택 (PK / Unique)
                </label>
                <select
                  value={selectedParentColId}
                  onChange={(e) => setSelectedParentColId(e.target.value)}
                  className="w-full bg-[#0c101c] border border-white/[0.12] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-sky-500 font-mono"
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
              <div className="space-y-1.5">
                <label className="block text-neutral-300 font-semibold text-xs">
                  3. 관계 유형 (식별 / 비식별)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRelType('non-identifying')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                      relType === 'non-identifying'
                        ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                        : 'bg-[#0c101c] border-white/[0.08] text-neutral-400 hover:text-white'
                    }`}
                  >
                    비식별 관계 (점선)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelType('identifying')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                      relType === 'identifying'
                        ? 'bg-sky-600 border-sky-500 text-white shadow-sm'
                        : 'bg-[#0c101c] border-white/[0.08] text-neutral-400 hover:text-white'
                    }`}
                  >
                    식별 관계 (실선 / PK)
                  </button>
                </div>
              </div>

              {/* Relationship Preview Bar */}
              <div className="p-3 bg-[#0c101c] rounded-lg border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <div className="text-indigo-400 font-semibold">
                  {targetParentTable?.physicalName || 'Parent'}.
                  {targetParentColumns.find((c) => c.id === selectedParentColId)?.physicalName || 'id'}
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                <div className="text-emerald-400 font-semibold">
                  {currentTable.physicalName}.{currentColumn.physicalName} (FK)
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#1a2234] border-t border-white/[0.08] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-white/[0.1] text-neutral-300 hover:bg-white/[0.06] transition-colors"
          >
            취소
          </button>
          {otherTables.length > 0 && (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md transition-all active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5" />
              외래키(FK) 연결 적용
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
