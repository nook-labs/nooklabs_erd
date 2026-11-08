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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#222428] border border-white/10 rounded-[4px] w-[460px] max-h-[85vh] shadow-2xl flex flex-col font-sans text-xs text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 bg-[#1a1b1e] border-b border-white/10 flex items-center justify-between">
          <h3 className="font-semibold text-xs text-white">관계선 속성 설정</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Table Connection Summary */}
          <div className="p-2.5 bg-[#18191b] rounded-[2px] border border-white/10 flex items-center justify-between text-xs">
            <span className="font-semibold text-sky-400 font-mono">{parentTableName} (부모)</span>
            <ArrowRight className="w-3 h-3 text-neutral-500" />
            <span className="font-semibold text-emerald-400 font-mono">{childTableName} (자식)</span>
          </div>

          {/* Relationship Type (Identifying vs Non-Identifying) */}
          <div>
            <label className="block text-neutral-400 mb-1 font-medium text-[11px]">
              관계 유형
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRelType('non-identifying')}
                className={`py-1.5 px-2.5 rounded-[2px] border text-center font-medium text-xs transition-colors ${
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
                className={`py-1.5 px-2.5 rounded-[2px] border text-center font-medium text-xs transition-colors ${
                  relType === 'identifying'
                    ? 'bg-[#1b5e20] border-emerald-500 text-white'
                    : 'bg-[#18191b] border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                식별 관계 (실선)
              </button>
            </div>
          </div>

          {/* Crow's Foot Multiplicity Selection */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Source Multiplicity (Parent side) */}
            <div>
              <label className="block text-neutral-400 mb-1 font-medium text-[11px]">
                부모측 기호 ({parentTableName})
              </label>
              <select
                value={sourceMultiplicity}
                onChange={(e) => setSourceMultiplicity(e.target.value as CrowsFootMultiplicity)}
                className="w-full bg-[#18191b] border border-white/10 rounded-[2px] px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500 font-mono"
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
              <label className="block text-neutral-400 mb-1 font-medium text-[11px]">
                자식측 기호 ({childTableName})
              </label>
              <select
                value={targetMultiplicity}
                onChange={(e) => setTargetMultiplicity(e.target.value as CrowsFootMultiplicity)}
                className="w-full bg-[#18191b] border border-white/10 rounded-[2px] px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500 font-mono"
              >
                {CROWS_FOOT_OPTIONS.map((opt) => (
                  <option key={`tgt_${opt.value}`} value={opt.value}>
                    {opt.icon} {opt.label} ({opt.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Referential Actions (CASCADE, SET NULL, etc.) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium text-[11px]">ON DELETE</label>
              <select
                value={onDeleteAction}
                onChange={(e) => setOnDeleteAction(e.target.value as ReferentialAction)}
                className="w-full bg-[#18191b] border border-white/10 rounded-[2px] px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500 font-mono"
              >
                <option value="NO ACTION">NO ACTION</option>
                <option value="CASCADE">CASCADE</option>
                <option value="SET NULL">SET NULL</option>
                <option value="RESTRICT">RESTRICT</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-400 mb-1 font-medium text-[11px]">ON UPDATE</label>
              <select
                value={onUpdateAction}
                onChange={(e) => setOnUpdateAction(e.target.value as ReferentialAction)}
                className="w-full bg-[#18191b] border border-white/10 rounded-[2px] px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-500 font-mono"
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
        <div className="px-4 py-2.5 bg-[#1a1b1e] border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 rounded-[2px] transition-colors font-medium text-[11px]"
          >
            <Trash2 className="w-3 h-3" /> 관계 삭제
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-[2px] border border-white/10 transition-colors font-medium text-[11px]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3.5 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] transition-colors font-medium text-[11px] shadow-sm"
            >
              <Check className="w-3 h-3" /> 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
