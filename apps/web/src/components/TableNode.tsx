'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { TableModel, ColumnModel, DisplayMode, DomainItem } from '@/types/erd';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Palette,
  ChevronDown,
  ChevronUp,
  GripVertical,
  CornerDownRight,
} from 'lucide-react';

export interface TableNodeData {
  table: TableModel;
  displayMode: DisplayMode;
  domains?: DomainItem[];
  zoomLabelScale?: number;
  isSourceCandidate?: boolean;
  isTargetCandidate?: boolean;
  isViewerMode?: boolean;
  onOpenManualFk?: (table: TableModel, column: ColumnModel) => void;
  onUpdateTable: (tableId: string, updates: Partial<TableModel>) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onAddColumn: (tableId: string, columnData?: Partial<ColumnModel>, insertIndex?: number) => void;
  onUpdateColumn: (tableId: string, columnId: string, updates: Partial<ColumnModel>) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onReorderColumns?: (tableId: string, newOrder: string[]) => void;
  onMoveColumn?: (tableId: string, columnId: string, direction: 'up' | 'down') => void;
  onTableClick?: (tableId: string) => void;
}

const COMMON_DATA_TYPES = [
  'uuid',
  'text',
  'enum',
  'integer[]',
  'int',
  'bigint',
  'timestamptz',
  'boolean',
  'double_precision',
  'varchar(255)',
  'varchar(50)',
  'decimal(18,2)',
  'date',
  'json',
];

const THEME_COLORS = [
  '#10b981', // ERD Cloud Emerald Green
  '#0c8ce9', // Figma Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#71717a', // Zinc
];

// Isolated Column Input with Local State to prevent Korean/CJK IME Composition Breaks
interface ColumnInputProps {
  initialValue?: string;
  placeholder?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  onCommit: (val: string) => void;
  onEnterPress?: () => void;
  onShiftEnterPress?: () => void;
  onFocus?: () => void;
}

const ColumnInput: React.FC<ColumnInputProps> = ({
  initialValue = '',
  placeholder,
  className,
  title,
  disabled = false,
  onCommit,
  onEnterPress,
  onShiftEnterPress,
  onFocus,
}) => {
  const [val, setVal] = useState(initialValue || '');
  const isFocusedRef = useRef(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setVal(initialValue || '');
    }
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const next = e.target.value;
    setVal(next);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (!disabled) {
      onCommit(val);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    onFocus?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' && !isComposingRef.current) {
      onCommit(val);
      if (e.shiftKey) {
        e.preventDefault();
        onShiftEnterPress?.();
      } else {
        onEnterPress?.();
      }
    }
  };

  return (
    <input
      type="text"
      value={val}
      disabled={disabled}
      placeholder={placeholder}
      title={title || placeholder}
      className={`${className} ${disabled ? 'cursor-default select-text opacity-90' : ''}`}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
        if (!disabled) {
          onCommit(val);
        }
      }}
    />
  );
};

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  logicalName: 120,
  physicalName: 120,
  domain: 120,
  type: 110,
  defaultValue: 100,
  comment: 130,
};

const measureOptimalColumnWidth = (
  colKey: string,
  columns: ColumnModel[],
  headerLabel: string,
  extraPadding = 28
): number => {
  const getColText = (col: ColumnModel): string => {
    switch (colKey) {
      case 'logicalName':
        return col.logicalName || '';
      case 'physicalName':
        return col.physicalName || '';
      case 'domain':
        return col.domain || '';
      case 'type':
        return col.type.name
          ? `${col.type.name.toLowerCase()}${col.type.length ? `(${col.type.length})` : ''}`
          : '';
      case 'defaultValue':
        return col.defaultExpression || '';
      case 'comment':
        return col.comment || '';
      default:
        return '';
    }
  };

  const sampleTexts = [headerLabel, ...columns.map(getColText)];
  let maxCalculatedWidth = 0;

  for (const text of sampleTexts) {
    if (!text) continue;
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 127) {
        w += 10.5; // 한글/전각 문자
      } else if (code >= 65 && code <= 90) {
        w += 8.2; // 대문자
      } else {
        w += 7.2; // 소문자, 숫자, 기호
      }
    }
    if (w > maxCalculatedWidth) {
      maxCalculatedWidth = w;
    }
  }

  // Add extra room for dropdown arrows, input borders, paddings
  const basePadding = (colKey === 'domain' || colKey === 'type') ? extraPadding + 20 : extraPadding;
  const optimal = Math.ceil(maxCalculatedWidth + basePadding);
  const minWidth = DEFAULT_COLUMN_WIDTHS[colKey] ? Math.min(80, DEFAULT_COLUMN_WIDTHS[colKey]) : 60;
  return Math.max(minWidth, Math.min(650, optimal));
};

const TableNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as TableNodeData;
  const {
    table,
    displayMode,
    domains = [],
    isSourceCandidate,
    isTargetCandidate,
    isViewerMode = false,
    onOpenManualFk,
    onUpdateTable,
    onDuplicateTable,
    onDeleteTable,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    onReorderColumns,
    onMoveColumn,
    onTableClick,
  } = nodeData;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [activeTypeDropdown, setActiveTypeDropdown] = useState<string | null>(null);
  const [activeDomainDropdown, setActiveDomainDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  // Drag and drop state for column rows
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below'>('above');

  // Column Widths State (Excel-like dynamic & persistent resizing)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => ({
    ...DEFAULT_COLUMN_WIDTHS,
    ...(table.columnWidths || {}),
  }));

  // Sync external table.columnWidths updates
  useEffect(() => {
    if (table.columnWidths) {
      setColumnWidths((prev) => ({
        ...prev,
        ...table.columnWidths,
      }));
    }
  }, [table.columnWidths]);

  const columns = table.columnOrder
    .map((id) => table.columnsById[id])
    .filter((col): col is ColumnModel => col !== undefined);

  // Column Row Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, colId: string) => {
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColId(colId);
  };

  const handleDragOver = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const isBelow = e.clientY - rect.top > rect.height / 2;
    setDragOverColId(targetColId);
    setDragOverPosition(isBelow ? 'below' : 'above');
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const currentOrder = [...table.columnOrder];
    const fromIndex = currentOrder.indexOf(draggedColId);
    if (fromIndex === -1) return;

    currentOrder.splice(fromIndex, 1);
    let toIndex = currentOrder.indexOf(targetColId);
    if (toIndex === -1) return;
    if (dragOverPosition === 'below') {
      toIndex += 1;
    }

    currentOrder.splice(toIndex, 0, draggedColId);

    if (onReorderColumns) {
      onReorderColumns(table.id, currentOrder);
    } else {
      onUpdateTable(table.id, { columnOrder: currentOrder });
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  // Move Column Up/Down
  const handleMove = (colId: string, direction: 'up' | 'down') => {
    if (onMoveColumn) {
      onMoveColumn(table.id, colId, direction);
      return;
    }
    const idx = table.columnOrder.indexOf(colId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= table.columnOrder.length) return;

    const nextOrder = [...table.columnOrder];
    const [removed] = nextOrder.splice(idx, 1);
    nextOrder.splice(targetIdx, 0, removed);
    onUpdateTable(table.id, { columnOrder: nextOrder });
  };

  // Excel-like Drag Resize Handler
  const handleResizeStart = (colKey: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 100;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, Math.min(700, startWidth + deltaX));
      setColumnWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      const deltaX = upEvent.clientX - startX;
      const finalWidth = Math.max(50, Math.min(700, startWidth + deltaX));
      const next = { ...columnWidths, [colKey]: finalWidth };
      setColumnWidths(next);
      queueMicrotask(() => {
        onUpdateTable(table.id, { columnWidths: next });
      });
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Excel-like Double Click Auto-Fit Column Width Handler
  const handleAutoFit = (colKey: string, headerLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const optimalWidth = measureOptimalColumnWidth(colKey, columns, headerLabel);
    const nextWidths = { ...columnWidths, [colKey]: optimalWidth };
    setColumnWidths(nextWidths);
    queueMicrotask(() => {
      onUpdateTable(table.id, { columnWidths: nextWidths });
    });
  };

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handleOutsideClick = (e: PointerEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showColorPicker]);

  // Close active dropdowns on outside click or Escape key
  useEffect(() => {
    if (!activeTypeDropdown && !activeDomainDropdown) return;
    const handleOutsideDropdownClick = (e: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setActiveTypeDropdown(null);
      }
      if (
        domainDropdownRef.current &&
        !domainDropdownRef.current.contains(e.target as Node)
      ) {
        setActiveDomainDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTypeDropdown(null);
        setActiveDomainDropdown(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideDropdownClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideDropdownClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTypeDropdown, activeDomainDropdown]);

  // Title Local State for IME support
  const [localPhysicalName, setLocalPhysicalName] = useState(table.physicalName);
  const [localLogicalName, setLocalLogicalName] = useState(table.logicalName);

  useEffect(() => {
    setLocalPhysicalName(table.physicalName);
    setLocalLogicalName(table.logicalName);
  }, [table.physicalName, table.logicalName]);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const headerColor = table.headerColor || '#10b981';

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false);
    onUpdateTable(table.id, {
      physicalName: localPhysicalName,
      logicalName: localLogicalName,
    });
  }, [table.id, localPhysicalName, localLogicalName, onUpdateTable]);

  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Helper component for Resizer Handle
  const renderResizer = (colKey: string, headerLabel: string) => (
    <div
      onPointerDown={(e) => handleResizeStart(colKey, e)}
      onDoubleClick={(e) => handleAutoFit(colKey, headerLabel, e)}
      className="nodrag absolute right-0 top-0 bottom-0 w-2 cursor-col-resize select-none flex items-center justify-center group/resizer z-20"
      title="드래그하여 너비 조절, 더블 클릭 시 글자수에 맞게 자동 조정"
    >
      <div className="w-[1.5px] h-3.5 bg-emerald-700/60 group-hover/resizer:bg-emerald-400 group-hover/resizer:w-[2.5px] group-hover/resizer:h-full transition-all" />
    </div>
  );

  const getWidth = (key: string) => columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] || 100;

  return (
    <div
      onClickCapture={() => {
        onTableClick?.(table.id);
      }}
      onPointerDownCapture={() => {
        onTableClick?.(table.id);
      }}
      onPointerDown={(e) => {
        pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const dist = Math.hypot(
          e.clientX - pointerDownPosRef.current.x,
          e.clientY - pointerDownPosRef.current.y
        );
        if (dist < 6 && onTableClick) {
          onTableClick(table.id);
        }
      }}
      className={`w-max min-w-[460px] bg-[#1e2420] text-white rounded-lg border font-sans text-xs shadow-2xl backdrop-blur-md transition-all overflow-visible relative transform-gpu [text-rendering:geometricPrecision] [backface-visibility:hidden] ${
        isSourceCandidate
          ? 'ring-2 ring-amber-400 border-amber-400/80 scale-[1.01]'
          : isTargetCandidate
          ? 'ring-2 ring-emerald-400 border-emerald-400/80 scale-[1.01]'
          : selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-2xl'
          : 'border-white/[0.12] hover:border-white/[0.25]'
      }`}
    >

      {/* React Flow Handles for Drag Connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!bg-[#10b981] !w-2.5 !h-2.5 !border-2 !border-[#1e2420] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />

      {/* Table Header */}
      <div
        style={{ backgroundColor: headerColor }}
        className="px-3 py-2 flex items-center justify-between rounded-t-lg group text-white shadow-sm"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <div
              className="flex flex-col gap-1 w-full nodrag py-0.5"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as HTMLElement)) {
                  handleSaveTitle();
                }
              }}
            >
              <input
                ref={titleInputRef}
                type="text"
                className="bg-black/40 text-white px-2 py-1 rounded border border-white/40 text-xs font-bold outline-none w-full shadow-inner focus:ring-1 focus:ring-white"
                placeholder="물리명 (e.g. routine)"
                value={localPhysicalName}
                onChange={(e) => setLocalPhysicalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <input
                type="text"
                className="bg-black/30 text-white/90 px-2 py-1 rounded border border-white/20 text-xs outline-none w-full shadow-inner focus:border-white"
                placeholder="논리명 (e.g. 루틴)"
                value={localLogicalName}
                onChange={(e) => setLocalLogicalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
            </div>
          ) : (
            <div
              className="font-bold text-white truncate cursor-pointer hover:opacity-90 flex items-center gap-2 transition-opacity"
              onDoubleClick={() => !isViewerMode && Boolean(selected) && setIsEditingTitle(true)}
              title={isViewerMode ? table.physicalName : selected ? '더블 클릭하여 테이블 이름 수정' : '테이블을 클릭하여 선택 후 편집'}
            >
              {displayMode === 'logical' ? (
                <span className="tracking-tight text-white font-extrabold text-[13px]">
                  {table.logicalName || table.physicalName}
                </span>
              ) : displayMode === 'both' ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-white font-extrabold text-[13px] tracking-tight">
                    {table.logicalName || table.physicalName}
                  </span>
                  {table.physicalName && (
                    <span className="text-white/80 font-medium text-[11px]">
                      ({table.physicalName})
                    </span>
                  )}
                </div>
              ) : (
                <span className="tracking-tight font-extrabold text-white text-[13px]">{table.physicalName}</span>
              )}

              {/* Table Total Column/Row Count Badge */}
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-white/90 shadow-sm shrink-0">
                {columns.length} cols
              </span>
            </div>
          )}
        </div>

        {/* Action Icons in Header (Only when table is selected and not viewer mode) */}
        {!isViewerMode && selected && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity nodrag">
            {/* Color Picker */}
            <div className="relative" ref={colorPickerRef}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 hover:bg-black/20 rounded text-white/80 hover:text-white transition-colors"
                title="테마 색상 변경"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-7 z-50 bg-[#1e1e1e] border border-white/[0.15] p-2 rounded-lg shadow-2xl grid grid-cols-4 gap-1.5 w-36 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onUpdateTable(table.id, { headerColor: c });
                        setShowColorPicker(false);
                      }}
                      style={{ backgroundColor: c }}
                      className="w-5 h-5 rounded-full border border-white/20 hover:scale-125 transition-transform"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate */}
            <button
              onClick={() => onDuplicateTable(table.id)}
              className="p-1 hover:bg-black/20 rounded text-white/80 hover:text-white transition-colors"
              title="테이블 복제"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Add Column to bottom */}
            <button
              onClick={() => onAddColumn(table.id)}
              className="p-1 hover:bg-black/20 rounded text-white/90 hover:text-white transition-colors"
              title="컬럼 추가 (Shift+Enter)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Delete Table */}
            <button
              onClick={() => onDeleteTable(table.id)}
              className="p-1 hover:bg-rose-900/60 rounded text-white/80 hover:text-rose-200 transition-colors"
              title="테이블 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ERD Cloud Style Columns Table Header (Excel-like Resizable) */}
      <div className="bg-[#193223]/90 px-2 py-1 text-[10px] text-emerald-300/80 border-b border-emerald-900/40 flex items-center font-mono tracking-tight select-none">
        {/* Highlight Dot Gutter */}
        <div className="w-4 shrink-0 text-center" title="속성 강조/체크 표시">●</div>
        {/* Grip Handle & Row Number Header */}
        <div className="w-6 shrink-0 text-center font-bold text-emerald-400">#</div>
        {/* KEY Header */}
        <div className="w-10 shrink-0 text-center font-bold text-emerald-400">KEY</div>
        
        {displayMode !== 'physical' && (
          <div
            style={{ width: `${getWidth('logicalName')}px` }}
            className="shrink-0 px-1 font-semibold relative flex items-center justify-between"
          >
            <span className="truncate">논리명</span>
            {!isViewerMode && Boolean(selected) && renderResizer('logicalName', '논리명')}
          </div>
        )}

        {displayMode !== 'logical' && (
          <div
            style={{ width: `${getWidth('physicalName')}px` }}
            className="shrink-0 px-1 font-semibold relative flex items-center justify-between"
          >
            <span className="truncate">물리명</span>
            {!isViewerMode && Boolean(selected) && renderResizer('physicalName', '물리명')}
          </div>
        )}

        <div
          style={{ width: `${getWidth('domain')}px` }}
          className="shrink-0 px-1 font-semibold text-emerald-300/70 relative flex items-center justify-between"
        >
          <span className="truncate">Domain</span>
          {!isViewerMode && Boolean(selected) && renderResizer('domain', 'Domain')}
        </div>

        <div
          style={{ width: `${getWidth('type')}px` }}
          className="shrink-0 px-1 font-semibold text-emerald-300/70 relative flex items-center justify-between"
        >
          <span className="truncate">Type</span>
          {!isViewerMode && Boolean(selected) && renderResizer('type', 'Type')}
        </div>

        <div className="w-16 shrink-0 text-center font-semibold">NOT NULL</div>

        <div
          style={{ width: `${getWidth('defaultValue')}px` }}
          className="shrink-0 px-1 font-semibold text-emerald-300/70 relative flex items-center justify-between"
        >
          <span className="truncate">Default value</span>
          {!isViewerMode && Boolean(selected) && renderResizer('defaultValue', 'Default value')}
        </div>

        <div
          style={{ width: `${getWidth('comment')}px` }}
          className="shrink-0 px-1 font-semibold text-emerald-300/70 relative flex items-center justify-between"
        >
          <span className="truncate">Comment</span>
          {!isViewerMode && Boolean(selected) && renderResizer('comment', 'Comment')}
        </div>

        {/* Row actions space */}
        {!isViewerMode && selected && <div className="w-14 shrink-0"></div>}
      </div>

      {/* Columns List (ERD Cloud Grid Row with Drag & Drop Reordering) */}
      <div className="divide-y divide-white/[0.04]">
        {columns.map((col, index) => {
          const isDragTarget = dragOverColId === col.id;
          const isBeingDragged = draggedColId === col.id;
          const isRowEditable = !isViewerMode && Boolean(selected);

          return (
            <div
              key={col.id}
              draggable={isRowEditable}
              onDragStart={(e) => isRowEditable && handleDragStart(e, col.id)}
              onDragOver={(e) => isRowEditable && handleDragOver(e, col.id)}
              onDrop={(e) => isRowEditable && handleDrop(e, col.id)}
              onDragEnd={handleDragEnd}
              onDoubleClick={(e) => e.stopPropagation()}
              className={`px-2 py-0.5 flex items-center gap-0.5 hover:bg-white/[0.04] group/col transition-colors text-white relative ${
                isBeingDragged ? 'opacity-30 bg-emerald-950/40' : ''
              } ${
                isDragTarget && dragOverPosition === 'above'
                  ? 'border-t-2 !border-t-emerald-400'
                  : isDragTarget && dragOverPosition === 'below'
                  ? 'border-b-2 !border-b-emerald-400'
                  : ''
              } ${col.isHighlighted ? 'bg-rose-950/20' : ''}`}
            >
              {/* Highlight / Breakpoint Red Dot Marker */}
              <div className="w-4 shrink-0 flex items-center justify-center nodrag">
                <button
                  type="button"
                  disabled={isViewerMode}
                  onClick={() =>
                    !isViewerMode &&
                    onUpdateColumn(table.id, col.id, { isHighlighted: !col.isHighlighted })
                  }
                  className={`w-3.5 h-3.5 flex items-center justify-center rounded-full transition-all ${
                    col.isHighlighted
                      ? 'opacity-100'
                      : isViewerMode
                      ? 'opacity-0'
                      : 'opacity-0 group-hover/col:opacity-40 hover:!opacity-90'
                  }`}
                  title={
                    col.isHighlighted
                      ? '체크/강조 해제 (클릭)'
                      : '체크/검토 필요 표시 (VS Code 스타일 중단점 클릭)'
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-all ${
                      col.isHighlighted
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.95)] ring-2 ring-rose-500/40 scale-110'
                        : 'bg-rose-400/70 hover:bg-rose-500'
                    }`}
                  />
                </button>
              </div>

              {/* Excel-like Row Number (1, 2, 3...) & Drag Handle on Hover (when selected) */}
              <div
                className={`w-6 shrink-0 flex items-center justify-center text-[10px] font-mono font-semibold text-neutral-400 ${
                  isRowEditable ? 'group-hover/col:text-emerald-300 cursor-grab active:cursor-grabbing' : ''
                } nodrag select-none`}
                title={`${index + 1}번째 행${isRowEditable ? ' (드래그하여 순서 변경)' : ''}`}
              >
                <span className={isRowEditable ? 'group-hover/col:hidden' : ''}>{index + 1}</span>
                {isRowEditable && (
                  <GripVertical className="w-3.5 h-3.5 hidden group-hover/col:block text-emerald-400" />
                )}
              </div>

              {/* Key Indicators (PK / FK) */}
              <div className="w-10 shrink-0 flex items-center justify-center gap-0.5 nodrag">
                <button
                  disabled={!isRowEditable}
                  onClick={() => isRowEditable && onUpdateColumn(table.id, col.id, { isPk: !col.isPk })}
                  className={`p-0.5 rounded transition-all ${
                    col.isPk
                      ? 'text-amber-300 bg-amber-400/20 border border-amber-400/40 shadow-sm'
                      : !isRowEditable
                      ? 'text-transparent cursor-default'
                      : 'text-neutral-600 hover:text-neutral-400 opacity-25 hover:opacity-100'
                  }`}
                  title={!isRowEditable ? (col.isPk ? '기본키 (PK)' : '') : '기본키 (Primary Key) 설정/해제'}
                >
                  <Key className="w-3 h-3" />
                </button>

                {/* FK Button / Badge (Interactive) */}
                {col.isFk ? (
                  <button
                    disabled={!isRowEditable}
                    onClick={() => isRowEditable && onOpenManualFk?.(table, col)}
                    className={`text-sky-300 font-bold text-[8.5px] bg-sky-500/20 hover:bg-sky-500/35 px-1 py-0.2 rounded border border-sky-400/40 shadow-sm transition-all ${
                      !isRowEditable ? 'cursor-default opacity-85' : ''
                    }`}
                    title={!isRowEditable ? '외래키 (FK)' : '외래키(FK) 설정 보기 / 수정'}
                  >
                    FK
                  </button>
                ) : (
                  isRowEditable && (
                    <button
                      onClick={() => onOpenManualFk?.(table, col)}
                      className="text-neutral-500 hover:text-sky-300 font-bold text-[8px] opacity-0 group-hover/col:opacity-70 hover:!opacity-100 px-0.5 py-0.2 rounded border border-white/10 hover:border-sky-400/30 hover:bg-sky-500/15 transition-all"
                      title="수동 외래키(FK) 지정"
                    >
                      FK
                    </button>
                  )
                )}
              </div>

              {/* Logical Name (논리명) */}
              {displayMode !== 'physical' && (
                <div
                  style={{ width: `${getWidth('logicalName')}px` }}
                  className="shrink-0 nodrag px-0.5"
                >
                  <ColumnInput
                    key={`logic_${col.id}`}
                    initialValue={col.logicalName}
                    disabled={!isRowEditable}
                    placeholder="논리명"
                    className={`bg-transparent text-white/95 px-1 py-0.5 rounded border outline-none w-full text-[11px] font-medium transition-colors ${
                      isRowEditable
                        ? 'focus:bg-black/40 border-transparent focus:border-emerald-500'
                        : 'border-transparent cursor-default'
                    }`}
                    onCommit={(val) => onUpdateColumn(table.id, col.id, { logicalName: val })}
                    onShiftEnterPress={() => isRowEditable && onAddColumn(table.id, undefined, index + 1)}
                  />
                </div>
              )}

              {/* Physical Name (물리명) */}
              {displayMode !== 'logical' && (
                <div
                  style={{ width: `${getWidth('physicalName')}px` }}
                  className="shrink-0 nodrag px-0.5"
                >
                  <ColumnInput
                    key={`phys_${col.id}`}
                    initialValue={col.physicalName}
                    disabled={!isRowEditable}
                    placeholder="물리명"
                    className={`bg-transparent text-white px-1 py-0.5 rounded border outline-none w-full text-[11px] font-semibold font-mono transition-colors ${
                      isRowEditable
                        ? 'focus:bg-black/40 border-transparent focus:border-emerald-500'
                        : 'border-transparent cursor-default'
                    }`}
                    onCommit={(val) => onUpdateColumn(table.id, col.id, { physicalName: val })}
                    onShiftEnterPress={() => isRowEditable && onAddColumn(table.id, undefined, index + 1)}
                  />
                </div>
              )}

              {/* Domain (도메인 값/설명 & 자동완성 드롭다운) */}
              <div
                style={{ width: `${getWidth('domain')}px` }}
                className="shrink-0 relative nodrag px-0.5"
              >
                <div
                  className={`flex items-center bg-transparent rounded border transition-colors ${
                    isRowEditable
                      ? 'border-transparent hover:border-white/10 focus-within:border-emerald-500 focus-within:bg-black/40'
                      : 'border-transparent'
                  }`}
                >
                  <ColumnInput
                    key={`domain_${col.id}`}
                    initialValue={col.domain}
                    disabled={!isRowEditable}
                    placeholder="Domain"
                    className="bg-transparent text-emerald-200/90 placeholder:text-neutral-500/60 px-1 py-0.5 outline-none w-full text-[10.5px] italic"
                    onCommit={(val) => onUpdateColumn(table.id, col.id, { domain: val })}
                    onShiftEnterPress={() => isRowEditable && onAddColumn(table.id, undefined, index + 1)}
                    onFocus={() => {
                      if (isRowEditable && domains.length > 0) {
                        setActiveDomainDropdown(col.id);
                      }
                    }}
                  />
                  {isRowEditable && domains.length > 0 && (
                    <button
                      onClick={() =>
                        setActiveDomainDropdown(activeDomainDropdown === col.id ? null : col.id)
                      }
                      className="text-neutral-500 hover:text-emerald-300 p-0.5 transition-colors shrink-0"
                      title="도메인 목록에서 선택"
                    >
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Domain Autocomplete Dropdown */}
                {isRowEditable && activeDomainDropdown === col.id && domains.length > 0 && (
                  <div
                    ref={domainDropdownRef}
                    onWheel={(e) => e.stopPropagation()}
                    className="nowheel nodrag absolute left-0 top-7 z-50 bg-[#162219] border border-emerald-500/40 rounded-lg shadow-2xl py-1 w-48 max-h-52 overflow-y-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2.5 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>도메인 선택 (자동 완성)</span>
                      <span className="text-neutral-400 font-normal">{domains.length}개</span>
                    </div>
                    {domains.map((dom) => (
                      <button
                        key={dom.id}
                        onClick={() => {
                          const match = dom.dataType.match(/^([a-zA-Z0-9_\[\]]+)(?:\((\d+)\))?/);
                          const nextType = match
                            ? { name: match[1], length: match[2] ? parseInt(match[2], 10) : undefined }
                            : { name: dom.dataType };
                          onUpdateColumn(table.id, col.id, {
                            domain: dom.name,
                            domainId: dom.id,
                            type: nextType,
                            defaultExpression: dom.defaultValue !== undefined && dom.defaultValue !== '' ? dom.defaultValue : col.defaultExpression,
                          });
                          setActiveDomainDropdown(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-emerald-600 hover:text-white transition-colors flex flex-col gap-0.5 border-b border-white/[0.04] last:border-0"
                      >
                        <div className="font-semibold text-neutral-100 flex items-center justify-between">
                          <span className="truncate">{dom.name}</span>
                          {col.domain === dom.name && (
                            <span className="text-[10px] text-emerald-300">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9.5px] font-mono text-emerald-300/80">
                          <span>{dom.dataType}</span>
                          {dom.defaultValue && (
                            <span className="text-amber-300/80">def: {dom.defaultValue}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Type & Dropdown */}
              <div
                style={{ width: `${getWidth('type')}px` }}
                className="shrink-0 relative nodrag px-0.5"
              >
                <div
                  className={`flex items-center bg-transparent rounded border transition-colors ${
                    isRowEditable
                      ? 'border-transparent hover:border-white/10 focus-within:border-emerald-500 focus-within:bg-black/40'
                      : 'border-transparent'
                  }`}
                >
                  <input
                    type="text"
                    disabled={!isRowEditable}
                    className={`bg-transparent text-emerald-300 px-1 py-0.5 outline-none w-full text-[10.5px] font-mono lowercase ${
                      !isRowEditable ? 'cursor-default' : ''
                    }`}
                    value={
                      col.type.name
                        ? `${col.type.name.toLowerCase()}${col.type.length ? `(${col.type.length})` : ''}`
                        : ''
                    }
                    onChange={(e) => {
                      if (!isRowEditable) return;
                      const val = e.target.value;
                      const match = val.match(/^([a-zA-Z0-9_\[\]]+)(?:\((\d+)\))?/);
                      if (match) {
                        onUpdateColumn(table.id, col.id, {
                          type: {
                            name: match[1],
                            length: match[2] ? parseInt(match[2], 10) : undefined,
                          },
                        });
                      } else {
                        onUpdateColumn(table.id, col.id, {
                          type: { name: val },
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (isRowEditable && e.shiftKey && e.key === 'Enter') {
                        onAddColumn(table.id, undefined, index + 1);
                      }
                    }}
                  />
                  {isRowEditable && (
                    <button
                      onClick={() =>
                        setActiveTypeDropdown(activeTypeDropdown === col.id ? null : col.id)
                      }
                      className="text-neutral-400 hover:text-white p-0.5 transition-colors shrink-0"
                      title="타입 선택"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Type Dropdown Menu (Scrollable & Outside Click Closeable) */}
                {isRowEditable && activeTypeDropdown === col.id && (
                  <div
                    ref={dropdownRef}
                    onWheel={(e) => e.stopPropagation()}
                    className="nowheel nodrag absolute left-0 top-7 z-50 bg-[#1a231d] border border-emerald-500/40 rounded-lg shadow-2xl py-1.5 w-36 max-h-52 overflow-y-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider border-b border-white/10 mb-1">
                      데이터 타입 선택
                    </div>
                    {COMMON_DATA_TYPES.map((dt) => (
                      <button
                        key={dt}
                        onClick={() => {
                          const match = dt.match(/^([a-zA-Z0-9_\[\]]+)(?:\((\d+)\))?/);
                          if (match) {
                            onUpdateColumn(table.id, col.id, {
                              type: {
                                name: match[1],
                                length: match[2] ? parseInt(match[2], 10) : undefined,
                              },
                            });
                          }
                          setActiveTypeDropdown(null);
                        }}
                        className="w-full text-left px-2.5 py-1 text-[11px] font-mono text-neutral-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-between"
                      >
                        <span>{dt}</span>
                        {col.type.name?.toLowerCase() === dt.toLowerCase() && (
                          <span className="text-[10px] text-emerald-300">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* NOT NULL / NULL Toggle */}
              <div className="w-16 shrink-0 text-center nodrag px-0.5">
                <button
                  disabled={!isRowEditable}
                  onClick={() => isRowEditable && onUpdateColumn(table.id, col.id, { nullable: !col.nullable })}
                  className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded font-bold transition-all ${
                    !col.nullable
                      ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-neutral-200'
                  } ${!isRowEditable ? 'cursor-default' : ''}`}
                  title={col.nullable ? 'NULL 허용' : 'NOT NULL (필수)'}
                >
                  {col.nullable ? 'NULL' : 'NOT NULL'}
                </button>
              </div>

              {/* Default Value */}
              <div
                style={{ width: `${getWidth('defaultValue')}px` }}
                className="shrink-0 nodrag px-0.5"
              >
                <ColumnInput
                  key={`def_${col.id}`}
                  initialValue={col.defaultExpression}
                  disabled={!isRowEditable}
                  placeholder="Default value"
                  className={`bg-transparent text-amber-200/90 placeholder:text-neutral-500/60 px-1 py-0.5 rounded border outline-none w-full text-[10.5px] font-mono transition-colors ${
                    isRowEditable
                      ? 'focus:bg-black/40 border-transparent focus:border-emerald-500'
                      : 'border-transparent cursor-default'
                  }`}
                  onCommit={(val) => onUpdateColumn(table.id, col.id, { defaultExpression: val })}
                  onShiftEnterPress={() => isRowEditable && onAddColumn(table.id, undefined, index + 1)}
                />
              </div>

              {/* Comment */}
              <div
                style={{ width: `${getWidth('comment')}px` }}
                className="shrink-0 nodrag px-0.5"
              >
                <ColumnInput
                  key={`cmt_${col.id}`}
                  initialValue={col.comment}
                  disabled={!isRowEditable}
                  placeholder="Comment"
                  className={`bg-transparent text-neutral-300 placeholder:text-neutral-500/60 px-1 py-0.5 rounded border outline-none w-full text-[10.5px] transition-colors ${
                    isRowEditable
                      ? 'focus:bg-black/40 border-transparent focus:border-emerald-500'
                      : 'border-transparent cursor-default'
                  }`}
                  onCommit={(val) => onUpdateColumn(table.id, col.id, { comment: val })}
                  onShiftEnterPress={() => isRowEditable && onAddColumn(table.id, undefined, index + 1)}
                />
              </div>

              {/* Action Buttons: Move Up, Move Down, Insert Below, Delete (Only when table is selected) */}
              {isRowEditable && (
                <div className="w-14 shrink-0 nodrag flex items-center justify-end gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
                  {/* Move Up */}
                  <button
                    disabled={index === 0}
                    onClick={() => handleMove(col.id, 'up')}
                    className={`p-0.5 rounded transition-colors ${
                      index === 0
                        ? 'text-neutral-700 cursor-not-allowed'
                        : 'text-neutral-400 hover:text-emerald-300 hover:bg-white/10'
                    }`}
                    title="위로 이동"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>

                  {/* Move Down */}
                  <button
                    disabled={index === columns.length - 1}
                    onClick={() => handleMove(col.id, 'down')}
                    className={`p-0.5 rounded transition-colors ${
                      index === columns.length - 1
                        ? 'text-neutral-700 cursor-not-allowed'
                        : 'text-neutral-400 hover:text-emerald-300 hover:bg-white/10'
                    }`}
                    title="아래로 이동"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Insert Below */}
                  <button
                    onClick={() => onAddColumn(table.id, undefined, index + 1)}
                    className="p-0.5 text-neutral-400 hover:text-emerald-300 hover:bg-white/10 rounded transition-colors"
                    title="이 위치 아래에 새 컬럼 삽입 (Shift+Enter)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  {/* Delete Column */}
                  <button
                    onClick={() => onDeleteColumn(table.id, col.id)}
                    className="p-0.5 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                    title="컬럼 삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Add Row Button to bottom (Only when table is selected and not in viewer mode) */}
      {!isViewerMode && selected && (
        <button
          onClick={() => onAddColumn(table.id)}
          className="w-full py-1 bg-[#16241a] hover:bg-[#1f3325] text-neutral-300 hover:text-emerald-300 text-[10.5px] font-medium flex items-center justify-center gap-1.5 border-t border-emerald-900/30 rounded-b-lg transition-colors nodrag"
        >
          <Plus className="w-3 h-3 text-emerald-400" /> 컬럼 추가 (Shift+Enter)
          <span className="text-[10px] text-neutral-500 font-mono">({columns.length}행)</span>
        </button>
      )}
    </div>
  );
};

const areTablePropsEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  if (prevProps.selected !== nextProps.selected) return false;
  const prevData = prevProps.data as unknown as TableNodeData;
  const nextData = nextProps.data as unknown as TableNodeData;

  if (prevData.table !== nextData.table) return false;
  if (prevData.displayMode !== nextData.displayMode) return false;
  if (prevData.isSourceCandidate !== nextData.isSourceCandidate) return false;
  if (prevData.isTargetCandidate !== nextData.isTargetCandidate) return false;
  if (prevData.isViewerMode !== nextData.isViewerMode) return false;
  if (prevData.domains !== nextData.domains) return false;

  return true;
};

export const TableNode = React.memo(TableNodeComponent, areTablePropsEqual);


