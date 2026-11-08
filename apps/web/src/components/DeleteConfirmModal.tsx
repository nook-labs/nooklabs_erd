'use client';

import React, { useEffect } from 'react';
import { Node } from '@xyflow/react';
import { TableModel, MemoModel, DiagramModel, RelationshipModel } from '@/types/erd';
import { AlertTriangle, Trash2, X, Table2, FileText, Workflow, Undo2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetNodes: Node[];
  tables: Record<string, TableModel>;
  memos: Record<string, MemoModel>;
  diagrams?: Record<string, DiagramModel>;
  relationships: Record<string, RelationshipModel>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetNodes,
  tables,
  memos,
  diagrams = {},
  relationships,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen || targetNodes.length === 0) return null;

  const tableNodes = targetNodes.filter((n) => n.type === 'tableNode');
  const memoNodes = targetNodes.filter((n) => n.type === 'memoNode');
  const diagramNodes = targetNodes.filter((n) => n.type === 'mermaidNode');

  const deletingTableIds = new Set(tableNodes.map((n) => n.id));
  const affectedRelationships = Object.values(relationships).filter(
    (rel) => deletingTableIds.has(rel.parentTableId) || deletingTableIds.has(rel.childTableId)
  );

  const totalCount = targetNodes.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1f2023] border border-white/10 rounded-lg shadow-2xl overflow-hidden text-neutral-200 select-none transform transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#26282d]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                {totalCount > 1 ? `선택한 ${totalCount}개 항목 삭제` : '항목 삭제'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                선택된 요소를 캔버스에서 제거합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="닫기 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Summary Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tableNodes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                <Table2 className="w-3 h-3" />
                테이블 {tableNodes.length}개
              </span>
            )}
            {memoNodes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                <FileText className="w-3 h-3" />
                메모 {memoNodes.length}개
              </span>
            )}
            {diagramNodes.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
                <Workflow className="w-3 h-3" />
                다이어그램 {diagramNodes.length}개
              </span>
            )}
            {affectedRelationships.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                관계선 {affectedRelationships.length}개 함께 제거
              </span>
            )}
          </div>

          {/* Target Items List Preview */}
          <div className="bg-[#17181a] border border-white/5 rounded-md p-2.5 max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px]">
            {targetNodes.slice(0, 6).map((node) => {
              if (node.type === 'tableNode') {
                const tbl = tables[node.id];
                return (
                  <div
                    key={node.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] text-neutral-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-white truncate">
                        {tbl?.physicalName || node.id}
                      </span>
                      {tbl?.logicalName && (
                        <span className="text-neutral-500 truncate">({tbl.logicalName})</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-2">테이블</span>
                  </div>
                );
              }
              if (node.type === 'memoNode') {
                const memo = memos[node.id];
                return (
                  <div
                    key={node.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] text-neutral-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{memo?.content?.slice(0, 30) || '메모'}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-2">메모</span>
                  </div>
                );
              }
              if (node.type === 'mermaidNode') {
                const diag = diagrams[node.id];
                return (
                  <div
                    key={node.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] text-neutral-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Workflow className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{diag?.title || '다이어그램'}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-2">다이어그램</span>
                  </div>
                );
              }
              return null;
            })}

            {targetNodes.length > 6 && (
              <div className="text-center py-1 text-neutral-500 text-[10px]">
                ...외 {targetNodes.length - 6}개 항목 더 있음
              </div>
            )}
          </div>

          {/* Undo Safe Guarantee Note */}
          <div className="flex items-start gap-2 p-2.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px] leading-relaxed">
            <Undo2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
            <div>
              <span className="font-semibold text-sky-200">안심하고 작업하세요:</span>{' '}
              실수로 삭제하더라도 단축키 <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px] text-white">Ctrl + Z</kbd>를 누르면 모든 테이블 및 관계선이 즉시 복원됩니다.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/10 bg-[#26282d]/50">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs text-neutral-300 hover:text-white hover:bg-white/10 font-medium transition-colors"
          >
            취소 <span className="text-[10px] text-neutral-500">(Esc)</span>
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-all active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>삭제 확인</span>
            <span className="text-[10px] opacity-80 font-mono">(Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

