import React, { useState } from 'react';
import { TargetDialect } from '@/lib/supabase/types';
import { X, Plus, Database, Layers, CheckCircle2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, dialect: TargetDialect) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dialect, setDialect] = useState<TargetDialect>('mssql');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), dialect);
    setName('');
    setDescription('');
    setDialect('mssql');
    onClose();
  };

  const dialects: { id: TargetDialect; name: string; tag: string; desc: string }[] = [
    { id: 'mssql', name: 'Microsoft SQL Server', tag: 'P0 First-Class', desc: 'IDENTITY, NVARCHAR, DATETIME2 표준 지원' },
    { id: 'postgres', name: 'PostgreSQL', tag: 'Extended', desc: 'UUID, SERIAL, TIMESTAMPTZ, JSONB 완벽 지원' },
    { id: 'mysql', name: 'MySQL / MariaDB', tag: 'Extended', desc: 'AUTO_INCREMENT, VARCHAR, DATETIME 지원' },
    { id: 'oracle', name: 'Oracle Database', tag: 'P2 Planned', desc: 'NUMBER, VARCHAR2, TIMESTAMP 지원' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#161b22] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">새 ERD 프로젝트 생성</h2>
              <p className="text-xs text-slate-400">실시간 협업 룸 및 DB 스키마 캔버스를 초기화합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              프로젝트 이름 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="예: Billing_Service_ERD, Order_System_DB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              프로젝트 설명 (선택)
            </label>
            <textarea
              rows={2}
              placeholder="프로젝트 목적 또는 설계 도메인에 대한 간단한 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>기본 대상 Database Dialect</span>
              <span className="text-[11px] text-indigo-400 font-normal">DDL 내보내기 기본값</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {dialects.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDialect(d.id)}
                  className={`cursor-pointer p-3 rounded-xl border text-left transition-all relative ${
                    dialect === d.id
                      ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white">{d.name}</span>
                    {dialect === d.id && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> 프로젝트 생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
