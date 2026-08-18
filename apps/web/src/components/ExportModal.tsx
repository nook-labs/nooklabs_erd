'use client';

import React, { useState } from 'react';
import { SchemaModel, NodeView, MemoModel, DomainItem } from '@/types/erd';
import { generatePostgreSQLDDL } from '@/ddl/postgres';
import { generateMSSQLDDL } from '@/ddl/mssql';
import { generateMySQLDDL } from '@/ddl/mysql';
import {
  X,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  FileCode2,
  FileJson2,
} from 'lucide-react';
import { toPng } from 'html-to-image';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: SchemaModel;
  projectTitle: string;
  nodes?: Record<string, NodeView>;
  memos?: Record<string, MemoModel>;
  domains?: DomainItem[];
}

type ExportTab = 'sql' | 'png' | 'json';
type SqlDialect = 'postgresql' | 'mysql' | 'mssql';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  schema,
  projectTitle,
  nodes,
  memos,
  domains,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<ExportTab>('sql');
  const [dialect, setDialect] = useState<SqlDialect>('postgresql');
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  const getSqlContent = () => {
    switch (dialect) {
      case 'postgresql':
        return generatePostgreSQLDDL(schema);
      case 'mysql':
        return generateMySQLDDL(schema);
      case 'mssql':
        return generateMSSQLDDL(schema);
      default:
        return '';
    }
  };

  const sqlContent = getSqlContent();
  
  // Full backup JSON snapshot (including tables, relationships, coordinates, memos, and domains)
  const fullBackupObject = {
    projectTitle,
    version: '2.0',
    exportedAt: new Date().toISOString(),
    tables: schema.tablesById,
    relationships: schema.relationshipsById,
    nodes: nodes || {},
    memos: memos || {},
    domains: domains || [],
  };
  const jsonContent = JSON.stringify(fullBackupObject, null, 2);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    const canvasElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!canvasElement) return;

    try {
      setIsExportingImage(true);
      const dataUrl = await toPng(canvasElement, {
        backgroundColor: '#07090e',
        quality: 1,
        pixelRatio: 2,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${projectTitle || 'erd_diagram'}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#0d111a] border border-white/[0.12] rounded-xl w-[720px] max-h-[85vh] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col font-sans text-xs text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#131926]/90 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-white">ERD 내보내기 (Export)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] bg-[#07090e] px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              activeTab === 'sql'
                ? 'border-indigo-500 text-indigo-400 bg-[#131926]/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>SQL DDL 스크립트</span>
          </button>

          <button
            onClick={() => setActiveTab('png')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              activeTab === 'png'
                ? 'border-indigo-500 text-indigo-400 bg-[#131926]/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PNG 이미지</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-all ${
              activeTab === 'json'
                ? 'border-indigo-500 text-indigo-400 bg-[#131926]/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson2 className="w-3.5 h-3.5" />
            <span>JSON 백업</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          {activeTab === 'sql' && (
            <div className="space-y-3">
              {/* Dialect Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium text-[11px]">DBMS 선택:</span>
                  <div className="flex bg-[#07090e] p-0.5 rounded-lg border border-white/[0.08]">
                    {(['postgresql', 'mysql', 'mssql'] as SqlDialect[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDialect(d)}
                        className={`px-3 py-1 rounded text-[11px] uppercase font-mono font-semibold transition-all ${
                          dialect === d
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(sqlContent)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 rounded-lg transition-colors font-medium text-[11px]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 복사됨!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> 클립보드 복사
                      </>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        sqlContent,
                        `${projectTitle || 'schema'}_${dialect}.sql`,
                        'text/sql'
                      )
                    }
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-[11px] shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> .sql 다운로드
                  </button>
                </div>
              </div>

              {/* Code Viewer */}
              <pre className="p-4 bg-[#07090e] rounded-lg border border-white/[0.06] font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[350px] leading-relaxed shadow-inner">
                <code>{sqlContent}</code>
              </pre>
            </div>
          )}

          {activeTab === 'png' && (
            <div className="space-y-4 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-xl">
                <ImageIcon className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-semibold text-sm text-white">고화질 ERD 캔버스 이미지 저장</h4>
                <p className="text-slate-400 mt-1 text-xs leading-relaxed">
                  다크 테마가 적용된 캔버스의 모든 테이블과 관계선을 고해상도 PNG 이미지로 저장합니다.
                </p>
              </div>

              <div className="pt-2">
                <button
                  disabled={isExportingImage}
                  onClick={handleDownloadPNG}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs rounded-lg shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExportingImage ? '이미지 생성 중...' : 'PNG 이미지로 다운로드'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-[11px]">
                  프로젝트의 모든 테이블, 컬럼, 관계 정보를 JSON 스키마로 백업합니다.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(jsonContent)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 rounded-lg transition-colors font-medium text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    복사
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        jsonContent,
                        `${projectTitle || 'erd_backup'}.json`,
                        'application/json'
                      )
                    }
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" /> .json 다운로드
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-[#07090e] rounded-lg border border-white/[0.06] font-mono text-[11px] text-slate-300 overflow-x-auto max-h-[350px] shadow-inner">
                <code>{jsonContent}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#131926]/90 border-t border-white/[0.08] flex justify-end">
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
