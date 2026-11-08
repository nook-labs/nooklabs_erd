'use client';

import React, { useState } from 'react';
import { ProjectVersion, TableModel, RelationshipModel } from '@/types/erd';
import {
  History,
  X,
  Plus,
  RotateCcw,
  Trash2,
  Table as TableIcon,
  Link2,
  Calendar,
  User,
  Sparkles,
  AlertTriangle,
  Check,
  Copy,
} from 'lucide-react';
import { generateSchemaDiffPrompt } from '@/lib/aiPromptGenerator';

interface VersionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ProjectVersion[];
  onCreateVersion: (name: string, description?: string) => void;
  onRestoreVersion: (version: ProjectVersion) => void;
  onDeleteVersion: (versionId: string) => void;
  currentTableCount: number;
  currentRelationshipCount: number;
  currentTables?: Record<string, TableModel>;
  currentRelationships?: Record<string, RelationshipModel>;
  projectTitle?: string;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  isOpen,
  onClose,
  versions,
  onCreateVersion,
  onRestoreVersion,
  onDeleteVersion,
  currentTableCount,
  currentRelationshipCount,
  currentTables = {},
  currentRelationships = {},
  projectTitle = 'ERD Project',
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState<ProjectVersion | null>(null);
  const [diffCopiedVersionId, setDiffCopiedVersionId] = useState<string | null>(null);
  const [diffFeedback, setDiffFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyDiff = (ver: ProjectVersion) => {
    if (!ver.snapshot) return;

    const diffText = generateSchemaDiffPrompt({
      baseSnapshot: ver.snapshot,
      currentTables,
      currentRelationships,
      projectTitle,
      versionName: ver.name,
      versionCreatedAt: ver.createdAt ? new Date(ver.createdAt).toLocaleString('ko-KR') : undefined,
    });

    navigator.clipboard.writeText(diffText);
    setDiffCopiedVersionId(ver.id);
    setDiffFeedback(`'${ver.name}' 시점 대비 변경점(Diff) 복사 완료! Cursor나 Claude에 붙여넣어 마이그레이션을 요청하세요.`);

    setTimeout(() => {
      setDiffCopiedVersionId(null);
      setDiffFeedback(null);
    }, 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;

    onCreateVersion(versionName.trim(), description.trim() || undefined);
    setVersionName('');
    setDescription('');
    setIsCreating(false);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <aside className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#262626] border-l border-white/[0.1] flex flex-col z-40 text-xs text-white shadow-2xl animate-in slide-in-from-right-4 duration-200 select-none">
        {/* Header */}
        <div className="h-11 border-b border-white/[0.08] flex items-center justify-between px-3.5 bg-[#2d2d2d] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <History className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-xs tracking-wider uppercase text-neutral-100">
                버전 히스토리
              </h3>
              <span className="text-[10px] text-neutral-400 font-normal">
                ({versions.length})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diff Copied Toast Feedback */}
        {diffFeedback && (
          <div className="bg-[#1b5e20] text-white px-3.5 py-2 flex items-center justify-between text-[11px] font-medium animate-in fade-in slide-in-from-top-1 duration-150 shrink-0 select-text">
            <span className="flex items-center gap-1.5 min-w-0 pr-2">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
              <span className="truncate">{diffFeedback}</span>
            </span>
            <button onClick={() => setDiffFeedback(null)} className="text-white/80 hover:text-white shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action: Create New Version */}
        <div className="p-3 border-b border-white/[0.08] bg-[#222222]">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-1.5 px-3 rounded-[2px] bg-[#1b5e20] hover:bg-[#257d2c] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              현재 시점 스냅샷 저장
            </button>
          ) : (
            <form onSubmit={handleSave} className="flex flex-col gap-2 bg-[#1c1c1c] p-2.5 rounded-[2px] border border-white/15">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[11px] text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> 스냅샷 이름 지정
                </span>
                <span className="text-[10px] text-neutral-400">
                  테이블 {currentTableCount}개 · 관계 {currentRelationshipCount}개
                </span>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="예: 결제 모듈 추가 전 백업"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                className="bg-[#141414] text-white px-2.5 py-1 rounded-[2px] border border-white/20 focus:border-[#38bdf8] outline-none text-xs"
              />
              <input
                type="text"
                placeholder="설명 또는 메모 (선택)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-[#141414] text-neutral-300 px-2.5 py-1 rounded-[2px] border border-white/10 focus:border-[#38bdf8] outline-none text-[11px]"
              />
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 rounded-[2px] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!versionName.trim()}
                  className="px-3 py-1 rounded-[2px] bg-[#1b5e20] hover:bg-[#257d2c] disabled:opacity-50 text-white font-medium transition-colors"
                >
                  저장
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Versions Timeline List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
              <div className="p-3 rounded-full bg-white/[0.04] mb-3">
                <History className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="font-semibold text-neutral-300">저장된 시점이 없습니다.</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
                위의 &apos;현재 시점 저장하기&apos; 버튼을 눌러 언제든 되돌릴 수 있는 스냅샷을 생성하세요.
              </p>
            </div>
          ) : (
            versions.map((ver, index) => (
              <div
                key={ver.id}
                className="group relative bg-[#202024] hover:bg-[#27272c] border border-white/[0.08] hover:border-white/20 rounded-xl p-3 transition-all flex flex-col gap-2"
              >
                {/* Top: Title & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-neutral-100 text-[12.5px] truncate">
                      {ver.name}
                    </h4>
                    {ver.description && (
                      <p className="text-[10.5px] text-neutral-400 mt-0.5 line-clamp-2">
                        {ver.description}
                      </p>
                    )}
                  </div>
                  {ver.isAutoSnapshot ? (
                    <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      자동 백업
                    </span>
                  ) : index === 0 ? (
                    <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      최신
                    </span>
                  ) : null}
                </div>

                {/* Metadata info */}
                <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono">
                  <span className="flex items-center gap-1">
                    <TableIcon className="w-3 h-3 text-emerald-400" />
                    테이블 {ver.tableCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3 text-indigo-400" />
                    관계 {ver.relationshipCount}
                  </span>
                  <span className="flex items-center gap-1 text-neutral-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ver.createdAt)}
                  </span>
                </div>

                {/* Bottom Actions */}
                <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{ver.creatorName || '사용자'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Copy Schema Diff for AI */}
                    <button
                      onClick={() => handleCopyDiff(ver)}
                      className="px-2 py-1 rounded-[2px] bg-[#333] hover:bg-[#3d3d3d] text-amber-300 hover:text-amber-200 border border-amber-400/30 font-medium text-[10.5px] flex items-center gap-1 transition-all"
                      title="이 버전 대비 현재 스키마의 변경점(Diff)을 AI 프롬프트로 복사"
                    >
                      {diffCopiedVersionId === ver.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Diff 복사</span>
                        </>
                      )}
                    </button>

                    {/* Restore Button */}
                    <button
                      onClick={() => setPendingRestoreVersion(ver)}
                      className="px-2 py-1 rounded-[2px] bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 font-medium text-[10.5px] flex items-center gap-1 transition-all"
                      title="이 시점으로 ERD 캔버스 복원"
                    >
                      <RotateCcw className="w-3 h-3" />
                      되돌리기
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteVersion(ver.id)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="버전 기록 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Confirmation Modal for Restore */}
      {pendingRestoreVersion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f1f23] border border-white/20 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">시점 되돌리기 확인</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  &apos;{pendingRestoreVersion.name}&apos; 시점으로 복원합니다.
                </p>
              </div>
            </div>

            <div className="p-3 bg-black/30 rounded-lg border border-white/10 text-neutral-300 text-[11px] leading-relaxed">
              현재 캔버스의 모든 테이블 및 관계선이 <span className="text-emerald-300 font-bold">{formatDate(pendingRestoreVersion.createdAt)}</span> 시점의 상태(테이블 {pendingRestoreVersion.tableCount}개, 관계 {pendingRestoreVersion.relationshipCount}개)로 교체됩니다.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingRestoreVersion(null)}
                className="px-3 py-1.5 rounded-lg text-neutral-300 hover:bg-white/10 text-xs font-semibold transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  onRestoreVersion(pendingRestoreVersion);
                  setPendingRestoreVersion(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                네, 되돌리기 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
