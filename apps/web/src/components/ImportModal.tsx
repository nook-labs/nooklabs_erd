'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderInput,
  PlusCircle,
  FileJson,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  parseImportJSON,
  importReplaceAction,
  importMergeAction,
  ImportParsedResult,
} from '@/collaboration/importActions';
import { ERDDocManager } from '@/collaboration/doc';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: ERDDocManager | null;
  onSuccess?: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  manager,
  onSuccess,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ImportParsedResult | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleValidateJSON = (text: string) => {
    setErrorMsg(null);
    setParsedData(null);
    if (!text.trim()) return;

    try {
      const result = parseImportJSON(text);
      const tableCount = Object.keys(result.tables).length;
      if (tableCount === 0) {
        setErrorMsg('JSON에서 복원할 테이블 데이터를 찾을 수 없습니다.');
        return;
      }
      setParsedData(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'JSON 파싱 실패');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      handleValidateJSON(content);
    };
    reader.onerror = () => {
      setErrorMsg('파일을 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      handleValidateJSON(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteReplace = () => {
    if (!manager || !parsedData) return;
    if (!confirm('현재 캔버스의 모든 내용이 불러온 JSON 백업 데이터로 대체됩니다. 진행하시겠습니까?')) {
      return;
    }
    try {
      importReplaceAction(manager, parsedData);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg('복원 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const handleExecuteMerge = () => {
    if (!manager || !parsedData) return;
    try {
      importMergeAction(manager, parsedData);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMsg('병합 중 오류가 발생했습니다: ' + err.message);
    }
  };

  const tableCount = parsedData ? Object.keys(parsedData.tables).length : 0;
  const relCount = parsedData ? Object.keys(parsedData.relationships).length : 0;
  const memoCount = parsedData ? Object.keys(parsedData.memos).length : 0;
  const domainCount = parsedData ? parsedData.domains.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#0d111a] border border-white/[0.12] rounded-xl w-[640px] max-h-[85vh] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col font-sans text-xs text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#121722]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">JSON 백업 불러오기 (Import ERD)</h2>
              <p className="text-[11px] text-neutral-400">백업해 둔 ERD JSON 스키마를 캔버스에 즉시 복원합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/[0.08] px-5 bg-[#0e131d] gap-2 pt-2">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-medium transition-all ${
              activeTab === 'file'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            파일 업로드 (.json)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-medium transition-all ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            JSON 텍스트 직접 입력
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'file' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 bg-[#121620] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-indigo-500/[0.03] text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-white">
                  {fileName ? (
                    <span className="text-indigo-400 font-semibold">{fileName}</span>
                  ) : (
                    '클릭하여 .json 백업 파일 선택 또는 여기에 드래그 앤 드롭'
                  )}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  ExportModal에서 다운로드한 JSON 또는 버전 스냅샷 지원
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-neutral-300">JSON 데이터 붙여넣기</label>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  handleValidateJSON(e.target.value);
                }}
                placeholder='{\n  "tablesById": { ... },\n  "relationshipsById": { ... }\n}'
                className="w-full h-40 bg-[#121620] border border-white/10 rounded-lg p-3 text-[11px] font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/60 resize-none"
              />
            </div>
          )}

          {/* Validation Result / Preview Stats */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">JSON 데이터 검증 실패</p>
                <p className="text-[11px] text-red-300/80 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {parsedData && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>유효한 ERD 스키마가 확인되었습니다.</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="bg-[#121620] border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-white">{tableCount}</div>
                  <div className="text-[10px] text-neutral-400">테이블 수</div>
                </div>
                <div className="bg-[#121620] border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-white">{relCount}</div>
                  <div className="text-[10px] text-neutral-400">관계선 수</div>
                </div>
                <div className="bg-[#121620] border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-white">{memoCount}</div>
                  <div className="text-[10px] text-neutral-400">메모 수</div>
                </div>
                <div className="bg-[#121620] border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-white">{domainCount}</div>
                  <div className="text-[10px] text-neutral-400">도메인 수</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.08] bg-[#121722]">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors"
          >
            취소
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteMerge}
              disabled={!parsedData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              기존 캔버스에 병합 (Merge)
            </button>
            <button
              onClick={handleExecuteReplace}
              disabled={!parsedData}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              전체 덮어쓰기 복원 (Replace)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
