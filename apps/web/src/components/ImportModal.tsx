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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#222428] border border-white/10 rounded-[4px] w-[620px] max-h-[85vh] shadow-2xl flex flex-col font-sans text-xs text-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#1a1b1e]">
          <div className="flex items-center gap-2">
            <FolderInput className="w-3.5 h-3.5 text-emerald-400" />
            <h2 className="text-xs font-semibold text-white">JSON 백업 불러오기 (Import ERD)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/10 px-4 bg-[#18191b] gap-1 pt-1.5">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 text-xs font-medium transition-colors ${
              activeTab === 'file'
                ? 'border-emerald-500 text-emerald-400 bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            파일 업로드 (.json)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 text-xs font-medium transition-colors ${
              activeTab === 'paste'
                ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI 응답 / JSON 직접 붙여넣기</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
          {activeTab === 'file' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/20 hover:border-emerald-500/50 bg-[#18191b] rounded-[2px] p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 rounded-[2px] bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-white">
                  {fileName ? (
                    <span className="text-emerald-400 font-semibold">{fileName}</span>
                  ) : (
                    '클릭하여 .json 백업 파일 선택 또는 여기에 드래그 앤 드롭'
                  )}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  내보내기에서 다운로드한 JSON 백업 스키마 파일
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-white flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  JSON 데이터 또는 AI 답변 텍스트 붙여넣기
                </label>
                <span className="text-[10px] text-neutral-400">
                  (AI 마크다운 코드 블록 자동 감지 및 추출)
                </span>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  handleValidateJSON(e.target.value);
                }}
                placeholder={`AI(Claude, Cursor 등)가 출력한 JSON 코드나 답변 텍스트 전체를 붙여넣으세요.\n\n예시:\n\`\`\`json\n{\n  "tables": [\n    {\n      "physicalName": "coupons",\n      "logicalName": "쿠폰 마스터",\n      "columns": [\n        { "physicalName": "id", "type": "uuid", "isPk": true },\n        { "physicalName": "name", "type": "varchar(100)" }\n      ]\n    }\n  ]\n}\n\`\`\``}
                className="w-full h-40 bg-[#18191b] border border-white/10 rounded-[2px] p-2.5 text-[11px] font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#38bdf8] resize-none"
              />
            </div>
          )}

          {/* Validation Result / Preview Stats */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-[2px] p-2.5 flex items-start gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">JSON 데이터 검증 실패</p>
                <p className="text-[11px] text-red-300/80 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {parsedData && (
            <div className="bg-[#18191b] border border-white/10 rounded-[2px] p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>유효한 ERD 스키마가 확인되었습니다.</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                <div className="bg-[#222428] border border-white/10 rounded-[2px] p-2 text-center">
                  <div className="text-sm font-bold text-white">{tableCount}</div>
                  <div className="text-[10px] text-neutral-400">테이블</div>
                </div>
                <div className="bg-[#222428] border border-white/10 rounded-[2px] p-2 text-center">
                  <div className="text-sm font-bold text-white">{relCount}</div>
                  <div className="text-[10px] text-neutral-400">관계선</div>
                </div>
                <div className="bg-[#222428] border border-white/10 rounded-[2px] p-2 text-center">
                  <div className="text-sm font-bold text-white">{memoCount}</div>
                  <div className="text-[10px] text-neutral-400">메모</div>
                </div>
                <div className="bg-[#222428] border border-white/10 rounded-[2px] p-2 text-center">
                  <div className="text-sm font-bold text-white">{domainCount}</div>
                  <div className="text-[10px] text-neutral-400">도메인</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-[#1a1b1e]">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-[2px] border border-white/10 text-neutral-300 hover:bg-white/10 transition-colors text-[11px]"
          >
            취소
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteMerge}
              disabled={!parsedData}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] bg-[#0284c7] hover:bg-[#0369a1] text-white font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs shadow-sm"
              title="기존 ERD를 유지하면서 AI가 제안한 새 테이블/관계선만 추가합니다"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>새 테이블 추가 (병합)</span>
            </button>
            <button
              onClick={handleExecuteReplace}
              disabled={!parsedData}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[2px] bg-[#333] hover:bg-[#444] text-neutral-300 hover:text-white font-medium disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs"
              title="기존 ERD 전체를 지우고 불러온 내용으로 대체합니다"
            >
              <RefreshCw className="w-3 h-3" />
              전체 덮어쓰기 복원
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
