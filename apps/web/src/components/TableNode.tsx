'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useViewport } from '@xyflow/react';
import { TableModel, ColumnModel, DisplayMode } from '@/types/erd';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Palette,
  ChevronDown,
} from 'lucide-react';

export interface TableNodeData {
  table: TableModel;
  displayMode: DisplayMode;
  zoomLabelScale?: number;
  isSourceCandidate?: boolean;
  isTargetCandidate?: boolean;
  onUpdateTable: (tableId: string, updates: Partial<TableModel>) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onAddColumn: (tableId: string, columnData?: Partial<ColumnModel>) => void;
  onUpdateColumn: (tableId: string, columnId: string, updates: Partial<ColumnModel>) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onTableClick?: (tableId: string) => void;
}


const COMMON_DATA_TYPES = [
  'BIGINT',
  'INT',
  'VARCHAR(255)',
  'VARCHAR(50)',
  'TEXT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
  'DECIMAL(18,2)',
  'JSON',
  'UUID',
];

const THEME_COLORS = [
  '#0c8ce9', // Figma Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#71717a', // Zinc
];

// Isolated Column Input with Local State to prevent Korean/CJK IME Composition Breaks
interface ColumnInputProps {
  initialValue: string;
  placeholder?: string;
  className?: string;
  onCommit: (val: string) => void;
  onEnterPress?: () => void;
}

const ColumnInput: React.FC<ColumnInputProps> = ({
  initialValue,
  placeholder,
  className,
  onCommit,
  onEnterPress,
}) => {
  const [val, setVal] = useState(initialValue);
  const isFocusedRef = useRef(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setVal(initialValue);
    }
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setVal(next);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    onCommit(val);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposingRef.current) {
      onCommit(val);
      onEnterPress?.();
    }
  };

  return (
    <input
      type="text"
      value={val}
      placeholder={placeholder}
      className={className}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
        onCommit(val);
      }}
    />
  );
};

export const TableNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as TableNodeData;
  const {
    table,
    displayMode,
    isSourceCandidate,
    isTargetCandidate,
    onUpdateTable,
    onDuplicateTable,
    onDeleteTable,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
    onTableClick,
  } = nodeData;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [activeTypeDropdown, setActiveTypeDropdown] = useState<string | null>(null);

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

  const columns = table.columnOrder
    .map((id) => table.columnsById[id])
    .filter((col): col is ColumnModel => col !== undefined);

  const headerColor = table.headerColor || '#0c8ce9';

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false);
    onUpdateTable(table.id, {
      physicalName: localPhysicalName,
      logicalName: localLogicalName,
    });
  }, [table.id, localPhysicalName, localLogicalName, onUpdateTable]);

  const { zoom } = useViewport();
  // Activate zoom title early when zooming out (zoom < 0.95)
  const showZoomTitle = zoom < 0.95;
  // Inverse scale factor so the title stays very prominent and big when zoomed out
  const scaleMultiplier = Number(nodeData?.zoomLabelScale) || 1.45;
  const titleScale = Math.min(10.0, Math.max(1.0, scaleMultiplier / zoom));



  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div
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
      className={`min-w-[320px] sm:min-w-[350px] bg-[#222222] text-white rounded-lg border font-sans text-xs shadow-xl backdrop-blur-md transition-all overflow-visible relative transform-gpu [text-rendering:geometricPrecision] [backface-visibility:hidden] ${
        isSourceCandidate
          ? 'ring-2 ring-amber-400 border-amber-400/80 scale-[1.01]'
          : isTargetCandidate
          ? 'ring-2 ring-emerald-400 border-emerald-400/80 scale-[1.01]'
          : selected
          ? 'ring-1.5 ring-[#0c8ce9] border-[#0c8ce9] shadow-2xl'
          : 'border-white/[0.1] hover:border-white/[0.2]'
      }`}
    >
      {/* Zoom-adaptive Figma Frame Label (Prominently enlarged when zooming out) */}
      {showZoomTitle && (
        <div
          style={{
            transform: `translate(-50%, -100%) scale(${titleScale})`,
            transformOrigin: 'bottom center',
          }}
          className="absolute left-1/2 -top-2.5 pointer-events-none z-50 whitespace-nowrap select-none font-bold text-white px-3.5 py-1.5 rounded-lg bg-[#18181b] border border-white/40 shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center gap-2 backdrop-blur-xl ring-1 ring-black/50"
        >
          <div
            style={{ backgroundColor: headerColor }}
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/30"
          />
          <span className="font-extrabold tracking-tight text-white text-[13px]">
            {displayMode === 'logical' ? (table.logicalName || table.physicalName) : table.physicalName}
          </span>
          {displayMode === 'both' && table.logicalName && (
            <span className="text-sky-300 text-xs font-bold">({table.logicalName})</span>
          )}
        </div>
      )}




      {/* React Flow Handles for Drag Connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        className="!bg-[#0c8ce9] !w-2.5 !h-2.5 !border-2 !border-[#222222] hover:!scale-150 transition-transform !cursor-crosshair opacity-0"
      />

      {/* Table Header Strip */}
      <div
        style={{ borderTopColor: headerColor }}
        className="border-t-2 bg-[#2c2c2c] px-3 py-2 border-b border-white/[0.08] flex items-center justify-between rounded-t-lg group"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            style={{ backgroundColor: headerColor }}
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
          />

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
                className="bg-[#181818] text-white px-2 py-1 rounded border border-[#0c8ce9] text-xs font-bold outline-none w-full shadow-inner focus:ring-1 focus:ring-[#0c8ce9]"
                placeholder="물리명 (e.g. users)"
                value={localPhysicalName}
                onChange={(e) => setLocalPhysicalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <input
                type="text"
                className="bg-[#181818] text-neutral-200 px-2 py-1 rounded border border-white/[0.15] text-xs outline-none w-full shadow-inner focus:border-[#0c8ce9]"
                placeholder="논리명 (e.g. 회원)"
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
              className="font-bold text-white truncate cursor-pointer hover:text-[#0c8ce9] flex items-center gap-1.5 transition-colors"
              onDoubleClick={() => setIsEditingTitle(true)}
              title="더블 클릭하여 테이블 이름 수정"
            >
              {displayMode === 'logical' ? (
                <span className="tracking-tight text-white font-extrabold text-[13px]">
                  {table.logicalName || table.physicalName}
                </span>
              ) : displayMode === 'both' ? (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-white font-extrabold text-[13px] tracking-tight">{table.physicalName}</span>
                  <span className="text-sky-300 font-bold text-[12px]">
                    ({table.logicalName || table.physicalName})
                  </span>
                </div>
              ) : (
                <span className="tracking-tight font-extrabold text-white text-[13px]">{table.physicalName}</span>
              )}
            </div>
          )}
        </div>


        {/* Action Icons in Header */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity nodrag">
          {/* Color Picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 hover:bg-white/[0.1] rounded text-neutral-400 hover:text-white transition-colors"
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
            className="p-1 hover:bg-white/[0.08] rounded text-neutral-400 hover:text-white transition-colors"
            title="테이블 복제"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Add Column */}
          <button
            onClick={() => onAddColumn(table.id)}
            className="p-1 hover:bg-white/[0.08] rounded text-[#0c8ce9] hover:text-white transition-colors"
            title="컬럼 추가"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Delete Table */}
          <button
            onClick={() => onDeleteTable(table.id)}
            className="p-1 hover:bg-rose-950/50 rounded text-neutral-400 hover:text-rose-400 transition-colors"
            title="테이블 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Columns Table Header */}
      <div className="bg-[#1a1a1a] px-2.5 py-1 text-[10px] text-neutral-300 border-b border-white/[0.06] flex items-center justify-between font-mono tracking-wider">
        <div className="w-8 shrink-0 text-center font-bold">KEY</div>
        <div className="flex-1 min-w-0 px-1 font-semibold">NAME</div>
        <div className="w-24 text-center font-semibold">TYPE</div>
        <div className="w-6 text-center font-semibold">NN</div>
        <div className="w-4"></div>
      </div>

      {/* Columns List */}
      <div className="divide-y divide-white/[0.04]">
        {columns.map((col) => (
          <div
            key={col.id}
            className="px-2 py-0.5 flex items-center justify-between gap-1 hover:bg-white/[0.04] group/col transition-colors"
          >
            {/* Key Indicators (PK / FK) */}
            <div className="flex items-center justify-center gap-0.5 w-8 shrink-0 nodrag">
              <button
                onClick={() => onUpdateColumn(table.id, col.id, { isPk: !col.isPk })}
                className={`p-0.5 rounded text-[10px] font-bold transition-all ${
                  col.isPk
                    ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40'
                    : 'text-neutral-600 hover:text-neutral-400 opacity-20 hover:opacity-100'
                }`}
                title="Primary Key (기본키) 설정/해제"
              >
                <Key className="w-2.5 h-2.5" />
              </button>

              {col.isFk && (
                <span
                  className="text-[#0c8ce9] font-bold text-[9px] bg-[#0c8ce9]/15 px-0.5 rounded border border-[#0c8ce9]/30"
                  title="Foreign Key (외래키)"
                >
                  FK
                </span>
              )}
            </div>

            {/* Column Names (Physical & Logical) with IME Safe Input */}
            <div className="flex-1 min-w-0 nodrag flex flex-col justify-center px-1">
              {displayMode === 'both' ? (
                <div className="flex items-center gap-1.5">
                  <ColumnInput
                    key={`phys_${col.id}`}
                    initialValue={col.physicalName}
                    placeholder="물리명"
                    className="bg-transparent text-white focus:bg-[#181818] px-1 py-0.5 rounded border border-transparent focus:border-[#0c8ce9] outline-none w-1/2 text-[11px] font-semibold"
                    onCommit={(val) => onUpdateColumn(table.id, col.id, { physicalName: val })}
                    onEnterPress={() => onAddColumn(table.id)}
                  />
                  <ColumnInput
                    key={`logic_${col.id}`}
                    initialValue={col.logicalName}
                    placeholder="논리명"
                    className="bg-transparent text-sky-300 focus:bg-[#181818] focus:text-white px-1 py-0.5 rounded border border-transparent focus:border-[#0c8ce9] outline-none w-1/2 text-[11px] font-medium"
                    onCommit={(val) => onUpdateColumn(table.id, col.id, { logicalName: val })}
                    onEnterPress={() => onAddColumn(table.id)}
                  />
                </div>
              ) : (
                <ColumnInput
                  key={`single_${col.id}_${displayMode}`}
                  initialValue={displayMode === 'logical' ? col.logicalName : col.physicalName}
                  placeholder={displayMode === 'logical' ? '논리 컬럼명' : '물리 컬럼명'}
                  className="bg-transparent text-white focus:bg-[#181818] px-1 py-0.5 rounded border border-transparent focus:border-[#0c8ce9] outline-none w-full text-[11px] font-semibold"
                  onCommit={(val) => {
                    if (displayMode === 'logical') {
                      onUpdateColumn(table.id, col.id, { logicalName: val });
                    } else {
                      onUpdateColumn(table.id, col.id, { physicalName: val });
                    }
                  }}
                  onEnterPress={() => onAddColumn(table.id)}
                />
              )}
            </div>


            {/* Data Type & Dropdown */}
            <div className="w-24 shrink-0 relative nodrag">
              <div className="flex items-center">
                <input
                  type="text"
                  className="bg-transparent text-emerald-400 focus:bg-[#181818] px-1 py-0.5 rounded border border-transparent focus:border-[#0c8ce9] outline-none w-full text-[10px] font-mono"
                  value={`${col.type.name}${col.type.length ? `(${col.type.length})` : ''}`}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const match = val.match(/^([A-Z0-9_]+)(?:\((\d+)\))?/);
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
                    if (e.key === 'Enter') onAddColumn(table.id);
                  }}
                />
                <button
                  onClick={() =>
                    setActiveTypeDropdown(activeTypeDropdown === col.id ? null : col.id)
                  }
                  className="text-neutral-500 hover:text-neutral-300 p-0.5 transition-colors"
                >
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Type Dropdown Menu */}
              {activeTypeDropdown === col.id && (
                <div className="absolute right-0 top-6 z-50 bg-[#1e1e1e] border border-white/[0.12] rounded-md shadow-2xl py-1 w-28 max-h-44 overflow-y-auto">
                  {COMMON_DATA_TYPES.map((dt) => (
                    <button
                      key={dt}
                      onClick={() => {
                        const match = dt.match(/^([A-Z0-9_]+)(?:\((\d+)\))?/);
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
                      className="w-full text-left px-2 py-1 text-[10px] font-mono text-neutral-300 hover:bg-[#0c8ce9] hover:text-white transition-colors"
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nullable (NN) Toggle */}
            <div className="w-6 text-center shrink-0 nodrag">
              <button
                onClick={() => onUpdateColumn(table.id, col.id, { nullable: !col.nullable })}
                className={`text-[9px] px-1 py-0.5 rounded font-bold transition-all ${
                  !col.nullable
                    ? 'text-rose-300 bg-rose-500/20 border border-rose-500/30'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={col.nullable ? 'NULL 허용' : 'NOT NULL (필수값)'}
              >
                {col.nullable ? 'N' : 'NN'}
              </button>
            </div>

            {/* Delete Column Button */}
            <div className="w-4 shrink-0 nodrag">
              <button
                onClick={() => onDeleteColumn(table.id, col.id)}
                className="p-0.5 text-neutral-500 hover:text-rose-400 opacity-0 group-hover/col:opacity-100 transition-all"
                title="컬럼 삭제"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Add Row Button */}
      <button
        onClick={() => onAddColumn(table.id)}
        className="w-full py-1 bg-[#1a1a1a] hover:bg-[#282828] text-neutral-400 hover:text-white text-[10px] font-medium flex items-center justify-center gap-1 border-t border-white/[0.04] rounded-b-lg transition-colors nodrag"
      >
        <Plus className="w-3 h-3 text-[#0c8ce9]" /> 컬럼 추가 (Enter)
      </button>
    </div>
  );
};

