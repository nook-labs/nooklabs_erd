'use client';

import React from 'react';
import { ValidationIssue } from '@/validation/validator';
import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ValidationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  issues: ValidationIssue[];
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  isOpen,
  onClose,
  issues,
}) => {
  if (!isOpen) return null;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="absolute right-4 top-4 z-40 w-96 bg-[#0d111a]/95 border border-white/[0.12] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl font-sans text-xs text-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-[#131926]/90 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-white">스키마 검증 패널</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Status Bar */}
      <div className="px-4 py-2 bg-[#07090e] border-b border-white/[0.06] flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1 text-rose-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>오류 {errorCount}건</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>경고 {warningCount}건</span>
        </div>
      </div>

      {/* Issue Items List */}
      <div className="p-3 max-h-[380px] overflow-y-auto space-y-2">
        {issues.length === 0 ? (
          <div className="p-6 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="font-medium text-slate-200">스키마에 이상이 없습니다!</div>
            <div className="text-[11px] text-slate-500">모든 테이블과 기본키(PK)가 정상입니다.</div>
          </div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border flex items-start gap-2.5 transition-colors ${
                issue.severity === 'error'
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                  : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
              }`}
            >
              {issue.severity === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-xs">{issue.message}</div>
                {issue.suggestion && (
                  <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    💡 {issue.suggestion}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
