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
  Sparkles,
  Bot,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { generateAiSchemaPrompt } from '@/lib/aiPromptGenerator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: SchemaModel;
  projectTitle: string;
  nodes?: Record<string, NodeView>;
  memos?: Record<string, MemoModel>;
  domains?: DomainItem[];
}

type ExportTab = 'sql' | 'png' | 'json' | 'ai';
type SqlDialect = 'postgresql' | 'mysql' | 'mssql';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  schema,
  projectTitle,
  nodes,
  memos,
  domains = [],
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

  // Optimized AI Schema Prompt in Markdown
  const aiPromptContent = generateAiSchemaPrompt({
    tables: schema.tablesById || {},
    relationships: schema.relationshipsById || {},
    domains: domains || [],
    projectTitle,
  });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#222428] border border-white/10 rounded-[4px] w-[700px] max-h-[85vh] shadow-2xl flex flex-col font-sans text-xs text-neutral-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-2.5 bg-[#1a1b1e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="font-semibold text-xs text-white">ERD 내보내기 (Export)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#18191b] px-4 pt-1.5 gap-1">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors text-xs ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400 bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>SQL DDL 스크립트</span>
          </button>

          <button
            onClick={() => setActiveTab('png')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors text-xs ${
              activeTab === 'png'
                ? 'border-emerald-500 text-emerald-400 bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PNG 이미지</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors text-xs ${
              activeTab === 'json'
                ? 'border-emerald-500 text-emerald-400 bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileJson2 className="w-3.5 h-3.5" />
            <span>JSON 백업</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium transition-colors text-xs ${
              activeTab === 'ai'
                ? 'border-[#38bdf8] text-[#38bdf8] bg-white/5 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI 전달용 프롬프트</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'sql' && (
            <div className="space-y-3">
              {/* Dialect Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-medium text-[11px]">DBMS:</span>
                  <div className="flex bg-[#18191b] p-0.5 rounded-[2px] border border-white/10">
                    {(['postgresql', 'mysql', 'mssql'] as SqlDialect[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDialect(d)}
                        className={`px-2.5 py-0.5 rounded-[2px] text-[11px] uppercase font-mono font-semibold transition-colors ${
                          dialect === d
                            ? 'bg-[#1b5e20] text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
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
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-[2px] border border-white/10 transition-colors font-medium text-[11px]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> 복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> 복사
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
                    className="flex items-center gap-1 px-3 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] transition-colors font-medium text-[11px] shadow-sm"
                  >
                    <Download className="w-3 h-3" /> .sql 다운로드
                  </button>
                </div>
              </div>

              {/* Code Viewer */}
              <pre className="p-3 bg-[#18191b] rounded-[2px] border border-white/10 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[350px] leading-relaxed">
                <code>{sqlContent}</code>
              </pre>
            </div>
          )}

          {activeTab === 'png' && (
            <div className="space-y-4 py-6 text-center">
              <div className="w-12 h-12 rounded-[4px] bg-[#18191b] border border-white/10 flex items-center justify-center mx-auto text-emerald-400 shadow-md">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-semibold text-xs text-white">고화질 ERD 캔버스 이미지 저장</h4>
                <p className="text-neutral-400 mt-1 text-[11px] leading-relaxed">
                  캔버스의 모든 테이블과 관계선을 PNG 이미지로 저장합니다.
                </p>
              </div>

              <div className="pt-2">
                <button
                  disabled={isExportingImage}
                  onClick={handleDownloadPNG}
                  className="px-5 py-2 bg-[#1b5e20] hover:bg-[#257d2c] active:scale-95 text-white font-medium text-xs rounded-[2px] shadow transition-colors inline-flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingImage ? '이미지 생성 중...' : 'PNG 이미지로 다운로드'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-neutral-400 text-[11px]">
                  프로젝트 스키마를 JSON 파일로 백업합니다.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(jsonContent)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-[2px] border border-white/10 transition-colors font-medium text-[11px]"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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
                    className="flex items-center gap-1 px-3 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] transition-colors font-medium text-[11px]"
                  >
                    <Download className="w-3 h-3" /> .json 다운로드
                  </button>
                </div>
              </div>

              <pre className="p-3 bg-[#18191b] rounded-[2px] border border-white/10 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[350px]">
                <code>{jsonContent}</code>
              </pre>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    AI 최적화 마크다운 스키마 (Claude / Cursor / ChatGPT 전달용)
                  </p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    테이블, 컬럼, 관계선, 도메인이 최소 토큰으로 요약되어 있어 AI 질문 시 완벽한 컨텍스트가 됩니다.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(aiPromptContent)}
                    className="flex items-center gap-1 px-3 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] transition-colors font-medium text-[11px] shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" /> 복사 완료!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> AI 프롬프트 복사
                      </>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadFile(
                        aiPromptContent,
                        `${projectTitle || 'schema'}_ai_context.md`,
                        'text/markdown'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-[2px] border border-white/10 transition-colors font-medium text-[11px]"
                  >
                    <Download className="w-3 h-3" /> .md 저장
                  </button>
                </div>
              </div>

              <pre className="p-3 bg-[#18191b] rounded-[2px] border border-white/10 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[350px] whitespace-pre-wrap select-all">
                <code>{aiPromptContent}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 bg-[#1a1b1e] border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-[2px] border border-white/10 transition-colors font-medium text-[11px]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
