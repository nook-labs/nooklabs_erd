'use client';

import React, { useState } from 'react';
import { DomainItem } from '@/types/erd';
import { X, Plus, Trash2, Tag, BookOpen } from 'lucide-react';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: DomainItem[];
  onAddDomain: (name: string, dataType: string) => void;
  onDeleteDomain: (id: string) => void;
}

const DEFAULT_PRESETS = [
  { name: '이메일 (EMAIL)', dataType: 'VARCHAR(255)' },
  { name: '휴대폰번호 (PHONE)', dataType: 'VARCHAR(20)' },
  { name: '금액/가격 (MONEY)', dataType: 'DECIMAL(18,2)' },
  { name: '설명/본문 (CONTENT)', dataType: 'TEXT' },
  { name: '여부 플래그 (FLAG)', dataType: 'BOOLEAN' },
  { name: '생성일시 (DATETIME)', dataType: 'TIMESTAMP' },
  { name: '고유 식별자 (UUID)', dataType: 'UUID' },
];

export const DomainModal: React.FC<DomainModalProps> = ({
  isOpen,
  onClose,
  domains,
  onAddDomain,
  onDeleteDomain,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('VARCHAR(255)');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dataType.trim()) return;
    onAddDomain(name.trim(), dataType.trim());
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#0d111a] border border-white/[0.12] rounded-xl w-[520px] shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden font-sans text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 bg-[#131926]/90 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-white">도메인 관리 (Domain Presets)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Add New Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="도메인명 (예: 회원 이메일)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-[#07090e] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500 shadow-inner"
            />
            <input
              type="text"
              placeholder="데이터 타입"
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-36 bg-[#07090e] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono outline-none focus:border-indigo-500 shadow-inner"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1 font-medium transition-colors text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" /> 추가
            </button>
          </form>

          {/* Quick Presets */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">추천 표준 도메인</div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onAddDomain(p.name, p.dataType)}
                  className="px-2.5 py-1 bg-[#07090e] border border-white/[0.08] hover:border-indigo-500/80 rounded-md text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Domain List */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
              등록된 도메인 목록 ({domains.length})
            </div>
            {domains.length === 0 ? (
              <div className="p-4 text-center text-slate-500 bg-[#07090e] rounded-lg border border-white/[0.06]">
                등록된 도메인이 없습니다. 위 추천 목록에서 추가해보세요.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] bg-[#07090e] rounded-lg border border-white/[0.06] shadow-inner">
                {domains.map((d) => (
                  <div key={d.id} className="px-3 py-2 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="font-medium text-slate-200">{d.name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{d.dataType}</div>
                    </div>
                    <button
                      onClick={() => onDeleteDomain(d.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#131926]/90 border-t border-white/[0.08] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 rounded-lg transition-colors font-medium text-[11px]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
