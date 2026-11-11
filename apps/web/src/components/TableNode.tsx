'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps, useViewport } from '@xyflow/react';
import { TableModel, ColumnModel, DisplayMode, DomainItem } from '@/types/erd';
import { parseDataType, formatDataType } from '@/lib/dataType';
import { Key, Plus, Trash2, Palette, Check, GripVertical, Sparkles, MessageSquareText } from 'lucide-react';

// Helper to convert hex color to rgba for body tinting
function hexToRgba(hex: string, alpha: number): string {
  try {
    let c = hex.replace('#', '').trim();
    if (c.length === 3) {
      c = c.split('').map((x) => x + x).join('');
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(27, 94, 32, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(27, 94, 32, ${alpha})`;
  }
}

export interface TableNodeData {
  table: TableModel;
  displayMode: DisplayMode;
  isViewerMode?: boolean;
  isDirectlySelected?: boolean;
  domains?: DomainItem[];
  zoomLabelScale?: number;
  showZoomLabels?: boolean;
  showDefaultColumn?: boolean;
  expandAllComments?: boolean;
  onUpdateTable: (tableId: string, updates: Partial<TableModel>) => void;
  onDeleteTable: (tableId: string) => void;
  /** 생성된 컬럼 ID를 반환하면 해당 행 이름 칸이 바로 편집 상태가 됨 */
  onAddColumn: (
    tableId: string,
    columnData?: Partial<ColumnModel>,
    insertIndex?: number
  ) => string | null | false | void;
  onUpdateColumn: (tableId: string, columnId: string, updates: Partial<ColumnModel>) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onReorderColumns?: (tableId: string, newOrder: string[]) => void;
  onCopyAiScript?: (tableId: string) => Promise<boolean> | boolean;
  onTableClick?: (tableId: string) => void;
}

const ERDCLOUD_THEME_COLORS = [
  '#1b5e20', // ERDCloud Forest Green (대표)
  '#2e7d32', // Green
  '#4a148c', // Deep Purple
  '#6a1b9a', // Purple
  '#5d4037', // Brown
  '#795548', // Warm Brown
  '#0d47a1', // Deep Blue
  '#1565c0', // Blue
  '#bf360c', // Rust Red
  '#c62828', // Red
  '#37474f', // Blue Grey
  '#212121', // Dark Charcoal
];

// Clean Inline Column Input for IME (Korean) Stability + Floating Expansion & Smart Tooltip
interface MiniInputProps {
  initialValue?: string;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  list?: string;
  expandOnEdit?: boolean;
  tooltipContent?: string;
  onCommit: (val: string) => void;
  /** Ctrl/Cmd + Enter: 현재 행 아래에 새 행 삽입 */
  onInsertBelow?: () => void;
  /** 마운트 시 바로 편집 상태로 시작 (새로 추가된 행) */
  autoEdit?: boolean;
}

const MiniInput: React.FC<MiniInputProps> = ({
  initialValue = '',
  placeholder,
  className,
  readOnly = false,
  list,
  expandOnEdit = false,
  tooltipContent,
  onCommit,
  onInsertBelow,
  autoEdit = false,
}) => {
  const [isEditing, setIsEditing] = useState(autoEdit && !readOnly);
  const [val, setVal] = useState(initialValue || '');
  const [isHovered, setIsHovered] = useState(false);
  const isComposingRef = useRef(false);
  const editorRef = useRef<HTMLDivElement | HTMLInputElement | null>(null);
  const valRef = useRef(val);
  valRef.current = val;

  useEffect(() => {
    setVal(initialValue || '');
  }, [initialValue]);

  const isEditingRef = useRef(isEditing);
  isEditingRef.current = isEditing;

  const finishEdit = useCallback(
    (commit: boolean) => {
      // pointerdown/Enter/Esc 이후 blur가 한 번 더 들어와도 중복 처리하지 않음
      if (!isEditingRef.current) return;
      isEditingRef.current = false;
      setIsEditing(false);
      setIsHovered(false);
      if (commit) onCommit(valRef.current);
      else setVal(initialValue || '');
    },
    [onCommit, initialValue]
  );

  // 캔버스(React Flow)는 mousedown 기본동작을 막아 blur가 발생하지 않는 경우가 있어
  // 편집 중에는 바깥 클릭을 직접 감지하여 편집창을 닫는다.
  useEffect(() => {
    if (!isEditing) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        finishEdit(true);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isEditing, finishEdit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      finishEdit(true);
      if (e.ctrlKey || e.metaKey) onInsertBelow?.();
    } else if (e.key === 'Escape') {
      finishEdit(false);
    }
  };

  if (!isEditing || readOnly) {
    return (
      <div
        className="relative w-full group/mini"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          onClick={(e) => {
            if (!readOnly) {
              e.stopPropagation();
              setIsHovered(false);
              setIsEditing(true);
            }
          }}
          className={`cursor-text select-text truncate block leading-tight ${className}`}
        >
          {val || <span className="opacity-30">{placeholder}</span>}
        </span>

        {/* Instant Dark Tooltip on Hover for truncated or long text */}
        {isHovered && val && !isEditing && (
          <div className="absolute right-0 bottom-full mb-1.5 z-50 pointer-events-none animate-in fade-in duration-100">
            <div className="bg-[#18191c]/95 border border-white/20 text-neutral-100 text-[11px] leading-snug px-2.5 py-1.5 rounded-[3px] shadow-2xl backdrop-blur-md max-w-[280px] whitespace-normal break-words font-sans">
              {tooltipContent && (
                <div className="text-[9.5px] text-sky-400 font-mono mb-0.5 font-semibold">
                  {tooltipContent}
                </div>
              )}
              <div>{val}</div>
            </div>
            {/* Tooltip Caret */}
            <div className="w-2 h-2 bg-[#18191c] border-r border-b border-white/20 rotate-45 ml-auto mr-3 -mt-1" />
          </div>
        )}
      </div>
    );
  }

  // Floating Expanded Popover Editor when editing comments/long text
  if (expandOnEdit) {
    return (
      <div
        ref={(el) => {
          editorRef.current = el;
        }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-50 min-w-[260px] max-w-[340px] bg-[#1a1b1e] border border-sky-400/90 shadow-2xl rounded-[3px] p-1 nodrag flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
      >
        <input
          type="text"
          autoFocus
          value={val}
          placeholder={placeholder}
          className="w-full bg-[#111214] text-white text-[11px] px-2 py-1 outline-none rounded-[2px] border border-white/10 nodrag font-sans"
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => finishEdit(true)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
        />
        <span
          className="text-[9px] text-neutral-400 font-mono shrink-0 pr-1 select-none"
          title="Enter: 저장 · Ctrl+Enter: 아래에 행 추가 · Esc: 취소"
        >
          Enter⏎
        </span>
      </div>
    );
  }

  return (
    <input
      ref={(el) => {
        editorRef.current = el;
      }}
      type="text"
      autoFocus
      list={list}
      value={val}
      placeholder={placeholder}
      title="Enter: 저장 · Ctrl+Enter: 아래에 행 추가 · Esc: 취소"
      onFocus={(e) => {
        if (autoEdit) e.currentTarget.select();
      }}
      className={`bg-black/80 text-white outline-none border border-emerald-400/80 px-1 py-0 m-0 leading-tight rounded-none nodrag ${className}`}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => finishEdit(true)}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
    />
  );
};

const TableNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as TableNodeData;
  const {
    table,
    displayMode = 'physical',
    isViewerMode = false,
    isDirectlySelected = false,
    domains = [],
    zoomLabelScale = 1.0,
    showZoomLabels = true,
    showDefaultColumn = true,
    expandAllComments = false,
    onUpdateTable,
    onDeleteTable,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    onReorderColumns,
    onCopyAiScript,
    onTableClick,
  } = nodeData;

  // 행 드래그 순서 변경 상태
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<number | null>(null); // 이 인덱스 "앞"에 삽입
  const [aiCopied, setAiCopied] = useState(false);

  // 테이블 설명 패널
  // 전역 "모두 펼치기" 값으로 시작하고, 전역 값이 바뀌면 개별 상태도 따라감
  const [showComment, setShowComment] = useState(expandAllComments);
  useEffect(() => {
    setShowComment(expandAllComments);
  }, [expandAllComments]);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const commentEditorRef = useRef<HTMLTextAreaElement>(null);

  const isEditingCommentRef = useRef(false);
  isEditingCommentRef.current = isEditingComment;

  const commitComment = useCallback(() => {
    if (!isEditingCommentRef.current) return; // Esc 취소 후 blur 등 중복 처리 방지
    isEditingCommentRef.current = false;
    setIsEditingComment(false);
    const next = commentEditorRef.current?.value ?? commentDraft;
    if (next !== (table.comment || '')) {
      onUpdateTable(table.id, { comment: next });
    }
  }, [commentDraft, table.comment, table.id, onUpdateTable]);

  // 캔버스 클릭 시 blur가 안 생기는 경우 대비: 바깥 클릭 감지로 저장
  useEffect(() => {
    if (!isEditingComment) return;
    const handle = (e: PointerEvent) => {
      if (commentEditorRef.current && !commentEditorRef.current.contains(e.target as Node)) {
        commitComment();
      }
    };
    document.addEventListener('pointerdown', handle, true);
    return () => document.removeEventListener('pointerdown', handle, true);
  }, [isEditingComment, commitComment]);

  // 새로 추가된 행은 이름 칸을 바로 편집 상태로
  const [autoEditColId, setAutoEditColId] = useState<string | null>(null);
  const addColumnAndEdit = (insertIndex?: number) => {
    const newId = onAddColumn(table.id, undefined, insertIndex);
    if (typeof newId === 'string') setAutoEditColId(newId);
  };

  const handleRowDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!dragColId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setDropIndicator(after ? index + 1 : index);
  };

  const handleRowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragColId && dropIndicator !== null && onReorderColumns) {
      const order = [...table.columnOrder];
      const from = order.indexOf(dragColId);
      if (from !== -1) {
        order.splice(from, 1);
        const to = dropIndicator > from ? dropIndicator - 1 : dropIndicator;
        order.splice(to, 0, dragColId);
        if (order.join('|') !== table.columnOrder.join('|')) {
          onReorderColumns(table.id, order);
        }
      }
    }
    setDragColId(null);
    setDropIndicator(null);
  };

  const handleCopyAiScript = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCopyAiScript) return;
    const ok = await onCopyAiScript(table.id);
    if (ok) {
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1500);
    }
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const { zoom } = useViewport();

  const isSelected = selected || isDirectlySelected;
  const headerColor = table.headerColor || '#1b5e20'; // ERDCloud Dark Green Default

  // ERDCloud Silhouette: Dynamic Body Tint & Border from Header Color
  const bodyBgColor = useMemo(() => {
    return hexToRgba(headerColor, 0.16);
  }, [headerColor]);

  const bodyBorderColor = useMemo(() => {
    if (isSelected) return '#10b981';
    return hexToRgba(headerColor, 0.45);
  }, [isSelected, headerColor]);

  // Semantic Zoom Threshold: When zoomed out, show high-visibility large map badge
  const isZoomedOut = zoom < 0.85 && showZoomLabels;

  // Exact Counter-Scale Factor: Maintains constant large crisp screen font (~16px~20px) at ANY zoom level
  const counterScale = useMemo(() => {
    if (!isZoomedOut) return 1;
    // (1 / zoom) perfectly counteracts canvas zoom so badge stays huge on screen
    const raw = (1 / Math.max(zoom, 0.1)) * (zoomLabelScale || 1.15);
    return Math.min(7.5, Math.max(1.0, raw));
  }, [zoom, isZoomedOut, zoomLabelScale]);

  // Column order resolution
  const columns: ColumnModel[] = (table.columnOrder || [])
    .map((colId) => table.columnsById?.[colId])
    .filter(Boolean) as ColumnModel[];

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handleOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showColorPicker]);

  const handleStartTitleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isViewerMode) return;
    setTitleValue(
      displayMode === 'logical'
        ? table.logicalName || table.physicalName
        : table.physicalName || table.logicalName
    );
    setIsEditingTitle(true);
  };

  const handleFinishTitleEdit = () => {
    setIsEditingTitle(false);
    if (!titleValue.trim()) return;
    if (displayMode === 'logical') {
      onUpdateTable(table.id, { logicalName: titleValue.trim() });
    } else {
      onUpdateTable(table.id, { physicalName: titleValue.trim() });
    }
  };

  const tableNameDisplay =
    displayMode === 'logical'
      ? table.logicalName || table.physicalName || '테이블'
      : displayMode === 'both'
      ? `${table.physicalName || 'table'}${table.logicalName ? ` (${table.logicalName})` : ''}`
      : table.physicalName || table.logicalName || 'table';

  return (
    <div
      onClick={() => onTableClick?.(table.id)}
      style={{
        backgroundColor: '#16171a',
        backgroundImage: `linear-gradient(to bottom, ${bodyBgColor}, rgba(18, 19, 21, 0.95))`,
        borderColor: bodyBorderColor,
      }}
      className={`min-w-[220px] max-w-[460px] w-max text-white rounded-[2px] border text-[11px] font-sans shadow-lg select-none relative transition-colors ${
        isSelected
          ? 'ring-1 ring-emerald-400/80 shadow-2xl'
          : 'hover:border-opacity-90'
      }`}
    >
      {/* Semantic Zoom: Pure Minimal White Text (No background box & No bold) */}
      {isZoomedOut && (
        <div
          style={{
            transform: `scale(${counterScale})`,
            transformOrigin: 'bottom center',
          }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none flex flex-col items-center justify-center text-center select-none"
        >
          <span className="font-normal text-[15px] text-white tracking-tight leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {displayMode === 'logical'
              ? table.logicalName || table.physicalName
              : table.physicalName || table.logicalName}
          </span>
          {displayMode === 'both' && table.logicalName && table.physicalName && (
            <span className="text-[12px] font-normal text-white/85 leading-none mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              ({table.logicalName})
            </span>
          )}
        </div>
      )}

      {/* React Flow Handles for Connection Lines */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!bg-[#10b981] !w-2 !h-2 !border !border-black opacity-0"
      />

      {/* ERDCloud Style Table Header */}
      <div
        style={{ backgroundColor: headerColor }}
        className="px-2 py-1 min-h-[24px] flex items-center justify-between text-white font-bold text-xs leading-tight group/header relative cursor-grab active:cursor-grabbing"
      >
        {isEditingTitle && !isViewerMode ? (
          <input
            type="text"
            value={titleValue}
            autoFocus
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleFinishTitleEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishTitleEdit();
              if (e.key === 'Escape') setIsEditingTitle(false);
            }}
            className="bg-black/80 text-white px-1 py-0 text-xs font-bold outline-none w-full border border-white/40 rounded-none nodrag"
          />
        ) : (
          <span
            onDoubleClick={handleStartTitleEdit}
            className="truncate tracking-tight font-black text-xs text-white select-none cursor-grab active:cursor-grabbing opacity-100 drop-shadow-sm"
            title="더블클릭하여 테이블 이름 수정 (드래그하여 이동)"
          >
            {tableNameDisplay}
          </span>
        )}

        {/* Table Comment Toggle (설명이 있으면 항상 표시) */}
        {!isZoomedOut && (table.comment || !isViewerMode) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComment((v) => !v);
            }}
            className={`ml-auto p-0.5 rounded hover:bg-black/30 nodrag shrink-0 transition-opacity ${
              showComment
                ? 'text-white opacity-100 bg-black/25'
                : table.comment
                ? 'text-white/75 hover:text-white opacity-100'
                : 'text-white/60 hover:text-white opacity-0 group-hover/header:opacity-100'
            }`}
            title={table.comment ? `테이블 설명 ${showComment ? '접기' : '펼치기'}` : '테이블 설명 추가'}
          >
            <MessageSquareText className="w-2.5 h-2.5" />
          </button>
        )}

        {/* Minimal Actions on Hover */}
        {!isZoomedOut && (
          <div
            className={`flex items-center gap-0.5 transition-opacity nodrag shrink-0 ml-1 ${
              aiCopied ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-100'
            }`}
          >
            {onCopyAiScript && (
              <button
                onClick={handleCopyAiScript}
                className={`p-0.5 hover:bg-black/30 rounded flex items-center gap-0.5 ${
                  aiCopied ? 'text-emerald-300' : 'text-amber-200/90 hover:text-amber-100'
                }`}
                title="이 테이블의 AI 설명용 스크립트 복사 (컬럼 + 연관 테이블 + 관계)"
              >
                {aiCopied ? (
                  <>
                    <Check className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-normal">복사됨</span>
                  </>
                ) : (
                  <Sparkles className="w-2.5 h-2.5" />
                )}
              </button>
            )}
            {!isViewerMode && (
            <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-0.5 hover:bg-black/30 rounded text-white/80 hover:text-white"
              title="테이블 색상 변경"
            >
              <Palette className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addColumnAndEdit();
              }}
              className="p-0.5 hover:bg-black/30 rounded text-white/90 hover:text-white"
              title="컬럼 추가"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTable(table.id);
              }}
              className="p-0.5 hover:bg-rose-900/60 rounded text-white/70 hover:text-rose-300"
              title="테이블 삭제"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
            </>
            )}
          </div>
        )}

        {/* Color Palette Popover */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-6 z-50 bg-[#252525] border border-white/20 p-1.5 shadow-2xl grid grid-cols-4 gap-1 w-28 nodrag"
          >
            {ERDCLOUD_THEME_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onUpdateTable(table.id, { headerColor: c });
                  setShowColorPicker(false);
                }}
                style={{ backgroundColor: c }}
                className="w-4 h-4 rounded-none border border-black/40 hover:scale-110 transition-transform"
              />
            ))}
          </div>
        )}
      </div>

      {/* Table Comment Panel */}
      {showComment && !isZoomedOut && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1.5 border-b border-white/10 bg-black/30 text-[10.5px] leading-snug nodrag cursor-default"
        >
          {isEditingComment && !isViewerMode ? (
            <textarea
              ref={commentEditorRef}
              autoFocus
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onBlur={commitComment}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  isEditingCommentRef.current = false;
                  setCommentDraft(table.comment || '');
                  setIsEditingComment(false);
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              rows={Math.min(8, Math.max(2, Math.ceil((commentDraft.length || 1) / 40)))}
              placeholder="테이블 설명 (Ctrl+Enter 저장, Esc 취소)"
              className="w-full bg-[#111214] text-white text-[10.5px] px-1.5 py-1 outline-none rounded-[2px] border border-sky-400/80 resize-y nodrag nowheel font-sans"
            />
          ) : (
            <div
              onClick={() => {
                if (isViewerMode) return;
                setCommentDraft(table.comment || '');
                setIsEditingComment(true);
              }}
              className={`whitespace-pre-wrap break-words max-h-[160px] overflow-y-auto nowheel ${
                table.comment ? 'text-neutral-200' : 'text-neutral-500 italic'
              } ${isViewerMode ? '' : 'cursor-text hover:bg-white/[0.04] rounded-[2px]'}`}
              title={isViewerMode ? undefined : '클릭하여 설명 수정'}
            >
              {table.comment || '설명이 없습니다. 클릭하여 추가'}
            </div>
          )}
        </div>
      )}

      {/* ERDCloud Columns Body (Strict 3~4 Columns Layout) */}
      <div className="divide-y divide-white/[0.04]">
        {columns.map((col, index) => {
          const colName =
            displayMode === 'logical'
              ? col.logicalName || col.physicalName
              : col.physicalName || col.logicalName;

          const typeStr = formatDataType(col.type);

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleRowDragOver(e, index)}
              onDrop={handleRowDrop}
              className={`relative px-1.5 py-0.5 h-[22px] flex items-center text-[11px] hover:bg-white/[0.06] group/row transition-colors ${
                dragColId === col.id ? 'opacity-40' : ''
              } ${dropIndicator === index ? 'shadow-[inset_0_2px_0_#34d399]' : ''} ${
                dropIndicator === index + 1 && index === columns.length - 1
                  ? 'shadow-[inset_0_-2px_0_#34d399]'
                  : ''
              }`}
            >
              {/* 0. Drag Handle (행 순서 변경) */}
              {!isViewerMode && onReorderColumns && (
                <div
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', col.id);
                    setDragColId(col.id);
                  }}
                  onDragEnd={() => {
                    setDragColId(null);
                    setDropIndicator(null);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute -left-[2px] top-0 h-full w-[10px] flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/row:opacity-60 hover:!opacity-100 text-neutral-400 nodrag"
                  title="드래그하여 행 순서 변경"
                >
                  <GripVertical className="w-2.5 h-2.5" />
                </div>
              )}

              {/* 1. Key Column (PK / FK) */}
              <div className="w-[18px] shrink-0 flex items-center justify-center">
                {col.isPk ? (
                  <button
                    disabled={isViewerMode}
                    onClick={() =>
                      !isViewerMode &&
                      onUpdateColumn(table.id, col.id, { isPk: false })
                    }
                    className="text-[#f59e0b] hover:opacity-80 transition-opacity nodrag"
                    title="기본키 (PK, 클릭 시 해제)"
                  >
                    <Key className="w-2.5 h-2.5" />
                  </button>
                ) : col.isFk ? (
                  <span
                    className="text-[#38bdf8] text-[8.5px] font-bold font-mono select-none"
                    title="외래키 (FK)"
                  >
                    FK
                  </span>
                ) : (
                  <button
                    disabled={isViewerMode}
                    onClick={() =>
                      !isViewerMode &&
                      onUpdateColumn(table.id, col.id, { isPk: true })
                    }
                    className="w-2.5 h-2.5 opacity-0 group-hover/row:opacity-40 hover:!opacity-100 text-neutral-500 nodrag"
                    title="기본키(PK)로 설정"
                  >
                    <Key className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* 2. Column Name (물리명 또는 논리명) */}
              <div className="flex-1 min-w-[70px] pr-1.5">
                <MiniInput
                  initialValue={colName}
                  placeholder="컬럼명"
                  readOnly={isViewerMode}
                  autoEdit={autoEditColId === col.id}
                  className="w-full text-white font-semibold text-[11px]"
                  onCommit={(val) => {
                    if (autoEditColId === col.id) setAutoEditColId(null);
                    if (val === colName) return;
                    if (displayMode === 'logical') {
                      onUpdateColumn(table.id, col.id, { logicalName: val });
                    } else {
                      onUpdateColumn(table.id, col.id, { physicalName: val });
                    }
                  }}
                  onInsertBelow={() =>
                    !isViewerMode && addColumnAndEdit(index + 1)
                  }
                />
              </div>

              {/* 3. Data Type (bigint(20), varchar(255)... or Domain) */}
              <div className="w-[70px] shrink-0 pr-1">
                <MiniInput
                  initialValue={typeStr}
                  placeholder="type"
                  list={`type_list_${table.id}`}
                  readOnly={isViewerMode}
                  className="w-full text-[#4ade80] font-mono text-[10px] text-right font-semibold"
                  onCommit={(val) => {
                    const trimmed = val.trim();
                    // 값이 비었거나 바뀌지 않았으면 아무것도 하지 않음 (도메인/기본값 보존)
                    if (!trimmed || trimmed.toLowerCase() === typeStr.toLowerCase()) return;

                    // 1. Domain matching (이름 정확히 일치할 때만 — 부분일치는 오적용 위험)
                    const matchedDomain = domains.find(
                      (d) => d.name.trim().toLowerCase() === trimmed.toLowerCase()
                    );

                    if (matchedDomain) {
                      onUpdateColumn(table.id, col.id, {
                        type: parseDataType(matchedDomain.dataType),
                        defaultExpression: matchedDomain.defaultValue || col.defaultExpression,
                        domain: matchedDomain.name,
                        domainId: matchedDomain.id,
                      });
                      return;
                    }

                    // 2. Standard SQL type parse ("decimal(18,2)" 정밀도/스케일 포함)
                    onUpdateColumn(table.id, col.id, {
                      type: parseDataType(trimmed),
                      domain: undefined,
                      domainId: undefined,
                    });
                  }}
                  onInsertBelow={() =>
                    !isViewerMode && addColumnAndEdit(index + 1)
                  }
                />
              </div>

              {/* 4. NULL Status (NOT NULL or NULL) */}
              <div className="w-[50px] shrink-0 text-right">
                <button
                  disabled={isViewerMode}
                  onClick={() =>
                    !isViewerMode &&
                    onUpdateColumn(table.id, col.id, { nullable: !col.nullable })
                  }
                  className={`text-[9px] font-mono tracking-tight font-semibold transition-colors nodrag ${
                    !col.nullable
                      ? 'text-white'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                  title={col.nullable ? 'NULL 허용' : 'NOT NULL (필수)'}
                >
                  {!col.nullable ? 'NOT NULL' : 'NULL'}
                </button>
              </div>

              {/* 4-1. Default Value (기본값) */}
              {showDefaultColumn && (
              <div className="w-[72px] shrink-0 pl-1.5 relative">
                <MiniInput
                  initialValue={col.defaultExpression || ''}
                  placeholder="기본값"
                  readOnly={isViewerMode}
                  tooltipContent={col.defaultExpression ? `기본값: ${colName}` : undefined}
                  className="w-full text-amber-200/80 placeholder:text-neutral-600/70 font-mono text-[9.5px] truncate"
                  onCommit={(val) => {
                    const next = val.trim();
                    if (next !== (col.defaultExpression || '')) {
                      onUpdateColumn(table.id, col.id, { defaultExpression: next });
                    }
                  }}
                  onInsertBelow={() =>
                    !isViewerMode && addColumnAndEdit(index + 1)
                  }
                />
              </div>
              )}

              {/* 5. Comment (설명 - 긴 텍스트 호버 툴팁 + 플로팅 확장 인풋) */}
              <div className="w-[75px] shrink-0 pl-1.5 relative">
                <MiniInput
                  initialValue={col.comment}
                  placeholder="설명"
                  readOnly={isViewerMode}
                  expandOnEdit={true}
                  tooltipContent={col.comment ? `설명: ${colName}` : undefined}
                  className="w-full text-neutral-300 placeholder:text-neutral-600/70 text-[9.5px] truncate"
                  onCommit={(val) => {
                    if (val !== (col.comment || '')) {
                      onUpdateColumn(table.id, col.id, { comment: val });
                    }
                  }}
                  onInsertBelow={() =>
                    !isViewerMode && addColumnAndEdit(index + 1)
                  }
                />
              </div>

              {/* Insert Row Below on hover */}
              {!isViewerMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addColumnAndEdit(index + 1);
                  }}
                  className="ml-1 opacity-0 group-hover/row:opacity-60 hover:!opacity-100 text-emerald-400 p-0.5 nodrag"
                  title="아래에 행 추가 (Ctrl+Enter)"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Row Delete on hover */}
              {!isViewerMode && (
                <button
                  onClick={() => onDeleteColumn(table.id, col.id)}
                  className="opacity-0 group-hover/row:opacity-60 hover:!opacity-100 text-rose-400 p-0.5 nodrag"
                  title="컬럼 삭제"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Minimal Add Column on hover */}
      {!isViewerMode && (
        <button
          onClick={() => addColumnAndEdit()}
          className="w-full py-0.5 bg-[#141414] hover:bg-[#202020] text-neutral-500 hover:text-emerald-400 text-[9.5px] flex items-center justify-center gap-1 border-t border-white/[0.04] transition-colors nodrag opacity-0 hover:opacity-100 focus:opacity-100"
          title="컬럼 추가 (Enter)"
        >
          <Plus className="w-2 h-2" /> 추가
        </button>
      )}

      {/* Native Datalist for Fast SQL Type & Domain Autocomplete */}
      <datalist id={`type_list_${table.id}`}>
        {domains.map((d) => (
          <option key={d.id} value={d.name}>
            {d.dataType}
          </option>
        ))}
        <option value="varchar(255)">가변 문자열</option>
        <option value="bigint">정수 (64bit)</option>
        <option value="int">정수 (32bit)</option>
        <option value="uuid">고유 식별자</option>
        <option value="boolean">불리언 (참/거짓)</option>
        <option value="text">긴 본문 텍스트</option>
        <option value="timestamptz">날짜 및 시간</option>
        <option value="date">날짜</option>
        <option value="decimal(18,2)">금액 / 소수점</option>
        <option value="jsonb">JSON 객체</option>
      </datalist>
    </div>
  );
};

export const TableNode = React.memo(TableNodeComponent);
