'use client';

import React from 'react';
import { CrowsFootMultiplicity, RelationshipType } from '@/types/erd';
import { X, ArrowRight, ShieldCheck, Link2 } from 'lucide-react';

interface CreateRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTableName: string;
  childTableName: string;
  multiplicity: CrowsFootMultiplicity;
  onConfirm: (relType: RelationshipType) => void;
}

export const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({
  isOpen,
  onClose,
  parentTableName,
  childTableName,
  multiplicity,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="bg-[#0d111a] border border-white/[0.14] rounded-2xl w-[440px] shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden font-sans text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#131926]/90 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">관계 유형 선택</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">테이블 간의 외래키(FK) 및 식별 방식을 선택하세요.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Connection summary bar */}
          <div className="p-3 bg-[#07090e] rounded-xl border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-indigo-400">{parentTableName} (부모)</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-emerald-400">{childTableName} (자식)</span>
          </div>

          {/* 2 Big Choice Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {/* Non-identifying Choice */}
            <button
              onClick={() => onConfirm('non-identifying')}
              className="group p-3.5 bg-[#07090e] hover:bg-[#131926] border border-white/[0.08] hover:border-indigo-500/80 rounded-xl text-left transition-all active:scale-[0.99] flex items-start gap-3.5"
            >
              <div className="p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                    비식별 관계 (점선)
                  </span>
                  <span className="text-[10px] text-slate-400 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">
                    일반적 / 추천
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  자식 테이블에 <strong>외래키(FK) 컬럼만 생성</strong>되며 기본키(PK)에는 포함되지 않습니다. (부모가 없어도 되거나 독립적인 엔티티)
                </p>
              </div>
            </button>

            {/* Identifying Choice */}
            <button
              onClick={() => onConfirm('identifying')}
              className="group p-3.5 bg-[#07090e] hover:bg-[#131926] border border-white/[0.08] hover:border-sky-500/80 rounded-xl text-left transition-all active:scale-[0.99] flex items-start gap-3.5"
            >
              <div className="p-2 rounded-lg bg-sky-950/50 border border-sky-500/30 text-sky-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
                    식별 관계 (실선)
                  </span>
                  <span className="text-[10px] text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded font-mono border border-sky-700/40">
                    복합 PK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  자식 테이블의 <strong>외래키(FK)가 기본키(PK)의 일부로 포함</strong>됩니다. (부모가 존재해야만 자식이 존재할 수 있는 종속적 관계)
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#131926]/90 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-lg transition-colors font-medium text-xs"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
