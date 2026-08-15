'use client';

import React, { useState } from 'react';
import { X, Copy, Download, Check, Database } from 'lucide-react';

export type Dialect = 'mssql' | 'postgres';

interface DDLModalProps {
  isOpen: boolean;
  onClose: () => void;
  mssqlSql: string;
  postgresSql: string;
}

export const DDLModal: React.FC<DDLModalProps> = ({ isOpen, onClose, mssqlSql, postgresSql }) => {
  const [dialect, setDialect] = useState<Dialect>('mssql');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSql = dialect === 'mssql' ? mssqlSql : postgresSql;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentSql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erd_export_${dialect}_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" /> DDL SQL Exporter
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                결정적(Deterministic) 포맷팅 규칙이 적용된 DDL 스크립트입니다.
              </p>
            </div>

            {/* Dialect Selector Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setDialect('mssql')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  dialect === 'mssql'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MS SQL Server
              </button>
              <button
                onClick={() => setDialect('postgres')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  dialect === 'postgres'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PostgreSQL
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? '복사됨' : '클립보드 복사'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>.sql 저장</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SQL Code View */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed">
          <pre className="whitespace-pre-wrap">{currentSql}</pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <span>{dialect === 'mssql' ? 'SQL Server 2016+ 호환 DDL' : 'PostgreSQL 12+ 호환 DDL'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
