'use client';

import React, { useState, useEffect } from 'react';
import {
  RelationshipModel,
  RelationshipType,
  Cardinality,
  ReferentialAction,
  CrowsFootMultiplicity,
} from '@/types/erd';
import { X, Trash2, Check, ArrowRight } from 'lucide-react';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: RelationshipModel | null;
  parentTableName: string;
  childTableName: string;
  onSave: (updates: Partial<RelationshipModel>) => void;
  onDelete: (relId: string) => void;
}

const CROWS_FOOT_OPTIONS: { value: CrowsFootMultiplicity; label: string; desc: string; icon: string }[] = [
  { value: 'optional-many', label: 'Optional many', desc: '없거나 여러개 (0 or N)', icon: '○--<' },
  { value: 'optional-one-many', label: 'Optional one+many', desc: '없거나 1개 또는 여러개', icon: '○-|-<' },
  { value: 'optional-one', label: 'Optional one', desc: '없거나 한개 (0 or 1)', icon: '○-|' },
  { value: 'mandatory-many', label: 'Mandatory many', desc: '1개 또는 여러개 (1 or N)', icon: '|-<' },
  { value: 'mandatory-one', label: 'Mandatory one', desc: '무조건 1개 (Only one)', icon: '||' },
  { value: 'many', label: 'Many', desc: '여러개 (N)', icon: '--<' },
  { value: 'one', label: 'One', desc: '한개 (1)', icon: '-|' },
];

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  relationship,
  parentTableName,
  childTableName,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !relationship) return null;

  const [relType, setRelType] = useState<RelationshipType>(relationship.relationshipType);
  const [cardinality, setCardinality] = useState<Cardinality>(relationship.cardinality);
  const [sourceMultiplicity, setSourceMultiplicity] = useState<CrowsFootMultiplicity>(
    relationship.sourceMultiplicity || 'one'
  );
  const [targetMultiplicity, setTargetMultiplicity] = useState<CrowsFootMultiplicity>(
    relationship.targetMultiplicity || 'optional-many'
  );
  const [onDeleteAction, setOnDeleteAction] = useState<ReferentialAction>(relationship.onDelete || 'NO ACTION');
  const [onUpdateAction, setOnUpdateAction] = useState<ReferentialAction>(relationship.onUpdate || 'NO ACTION');

  // Synchronize state when relationship prop updates
  useEffect(() => {
    if (relationship) {
      setRelType(relationship.relationshipType);
      setCardinality(relationship.cardinality);
      setSourceMultiplicity(relationship.sourceMultiplicity || 'one');
      setTargetMultiplicity(relationship.targetMultiplicity || 'optional-many');
      setOnDeleteAction(relationship.onDelete || 'NO ACTION');
      setOnUpdateAction(relationship.onUpdate || 'NO ACTION');
    }
  }, [relationship]);

  const handleSave = () => {
    onSave({
      relationshipType: relType,
      cardinality,
      sourceMultiplicity,
      targetMultiplicity,
      onDelete: onDeleteAction,
      onUpdate: onUpdateAction,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(relationship.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#0d111a] border border-white/[0.12] rounded-xl w-[540px] max-h-[85vh] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col font-sans text-xs text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#131926]/90 border-b border-white/[0.08] flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white">ERD 관계선 및 표기법 설정</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Table Connection Summary */}
          <div className="p-3 bg-[#07090e] rounded-lg border border-white/[0.06] flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-400 font-mono">{parentTableName} (부모)</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-emerald-400 font-mono">{childTableName} (자식)</span>
          </div>

          {/* Relationship Type (Identifying vs Non-Identifying) */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium text-[11px]">
              관계 유형 (식별 / 비식별)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRelType('non-identifying')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                  relType === 'non-identifying'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-[#07090e] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                비식별 관계 (점선)
              </button>
              <button
                type="button"
                onClick={() => setRelType('identifying')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                  relType === 'identifying'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-[#07090e] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                식별 관계 (실선)
              </button>
            </div>
          </div>

          {/* Crow's Foot Multiplicity Selection */}
          <div className="grid grid-cols-2 gap-3">
            {/* Source Multiplicity (Parent side) */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">
                부모측 기호 ({parentTableName})
              </label>
              <select
                value={sourceMultiplicity}
                onChange={(e) => setSourceMultiplicity(e.target.value as CrowsFootMultiplicity)}
                className="w-full bg-[#07090e] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                {CROWS_FOOT_OPTIONS.map((opt) => (
                  <option key={`src_${opt.value}`} value={opt.value}>
                    {opt.icon} {opt.label} ({opt.desc})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Multiplicity (Child side) */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">
                자식측 기호 ({childTableName})
              </label>
              <select
                value={targetMultiplicity}
                onChange={(e) => setTargetMultiplicity(e.target.value as CrowsFootMultiplicity)}
                className="w-full bg-[#07090e] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                {CROWS_FOOT_OPTIONS.map((opt) => (
                  <option key={`tgt_${opt.value}`} value={opt.value}>
                    {opt.icon} {opt.label} ({opt.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Notation Guide Reference */}
          <div className="p-3 bg-[#07090e] rounded-lg border border-white/[0.06] space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              ERD-Cloud 까마귀발(Crow's Foot) 표기법 가이드
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400">
              <div><span className="font-mono text-indigo-300">○--&lt;</span> Optional many (0 or N)</div>
              <div><span className="font-mono text-indigo-300">○-|-&lt;</span> Optional 1+many (0,1,N)</div>
              <div><span className="font-mono text-indigo-300">○-|</span> Optional one (0 or 1)</div>
              <div><span className="font-mono text-indigo-300">|-&lt;</span> Mandatory many (1 or N)</div>
              <div><span className="font-mono text-indigo-300">||</span> Mandatory one (무조건 1)</div>
              <div><span className="font-mono text-indigo-300">--&lt;</span> Many (N)</div>
            </div>
          </div>

          {/* Referential Actions (CASCADE, SET NULL, etc.) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">ON DELETE</label>
              <select
                value={onDeleteAction}
                onChange={(e) => setOnDeleteAction(e.target.value as ReferentialAction)}
                className="w-full bg-[#07090e] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
              >
                <option value="NO ACTION">NO ACTION</option>
                <option value="CASCADE">CASCADE</option>
                <option value="SET NULL">SET NULL</option>
                <option value="RESTRICT">RESTRICT</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium text-[11px]">ON UPDATE</label>
              <select
                value={onUpdateAction}
                onChange={(e) => setOnUpdateAction(e.target.value as ReferentialAction)}
                className="w-full bg-[#07090e] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
              >
                <option value="NO ACTION">NO ACTION</option>
                <option value="CASCADE">CASCADE</option>
                <option value="SET NULL">SET NULL</option>
                <option value="RESTRICT">RESTRICT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#131926]/90 border-t border-white/[0.08] flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 rounded-lg transition-colors font-medium text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" /> 관계 삭제
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-lg transition-colors font-medium text-[11px]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-[11px] shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
