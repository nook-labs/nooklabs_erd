'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps, useViewport } from '@xyflow/react';
import { TableModel, ColumnModel, DisplayMode, DomainItem } from '@/types/erd';
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
  domains?: DomainItem[];
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
  onCommit: (val: string) => void;
  onEnterPress?: () => void;
  onFocus?: () => void;
}

const ColumnInput: React.FC<ColumnInputProps> = ({
  initialValue = '',
  placeholder,
  className,
  title,
  onCommit,
  onEnterPress,
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
    const next = e.target.value;
    setVal(next);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    onCommit(val);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    onFocus?.();
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
      title={title || placeholder}
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
    domains = [],
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
  const [activeDomainDropdown, setActiveDomainDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

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

  const columns = table.columnOrder
    .map((id) => table.columnsById[id])
    .filter((col): col is ColumnModel => col !== undefined);

  const headerColor = table.headerColor || '#10b981';

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
      className={`min-w-[420px] bg-[#1e2420] text-white rounded-lg border font-sans text-xs shadow-2xl backdrop-blur-md transition-all overflow-visible relative transform-gpu [text-rendering:geometricPrecision] [backface-visibility:hidden] ${
        isSourceCandidate
          ? 'ring-2 ring-amber-400 border-amber-400/80 scale-[1.01]'
          : isTargetCandidate
          ? 'ring-2 ring-emerald-400 border-emerald-400/80 scale-[1.01]'
          : selected
          ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-2xl'
          : 'border-white/[0.12] hover:border-white/[0.25]'
      }`}
    >
      {/* Zoom-adaptive Frame Label */}
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
            <span className="text-emerald-300 text-xs font-bold">({table.logicalName})</span>
          )}
        </div>
      )}

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

      {/* Table Header (ERD Cloud Green style by default) */}
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
              onDoubleClick={() => setIsEditingTitle(true)}
              title="더블 클릭하여 테이블 이름 수정"
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
            </div>
          )}
        </div>

        {/* Action Icons in Header */}
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

          {/* Add Column */}
          <button
            onClick={() => onAddColumn(table.id)}
            className="p-1 hover:bg-black/20 rounded text-white/90 hover:text-white transition-colors"
            title="컬럼 추가"
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
      </div>

      {/* ERD Cloud Style Columns Table Header (Matching User Screenshot) */}
      <div className="bg-[#193223]/90 px-2 py-1 text-[10px] text-emerald-300/80 border-b border-emerald-900/40 flex items-center font-mono tracking-tight select-none">
        <div className="w-7 shrink-0 text-center font-bold text-emerald-400">KEY</div>
        
        {displayMode !== 'physical' && (
          <div className="w-28 shrink-0 px-1 font-semibold">논리명</div>
        )}
        {displayMode !== 'logical' && (
          <div className="w-28 shrink-0 px-1 font-semibold">물리명</div>
        )}

        <div className="w-32 shrink-0 px-1 font-semibold text-emerald-300/70">Domain</div>
        <div className="w-28 shrink-0 px-1 font-semibold text-emerald-300/70">Type</div>
        <div className="w-16 shrink-0 text-center font-semibold">NOT NULL</div>
        <div className="w-24 shrink-0 px-1 font-semibold text-emerald-300/70">Default value</div>
        <div className="flex-1 min-w-[100px] px-1 font-semibold text-emerald-300/70">Comment</div>
        <div className="w-4 shrink-0"></div>
      </div>

      {/* Columns List (ERD Cloud Grid Row) */}
      <div className="divide-y divide-white/[0.04]">
        {columns.map((col) => (
          <div
            key={col.id}
            className="px-2 py-0.5 flex items-center gap-0.5 hover:bg-white/[0.04] group/col transition-colors text-white"
          >
            {/* Key Indicators (PK / FK) */}
            <div className="w-7 shrink-0 flex items-center justify-center gap-0.5 nodrag">
              <button
                onClick={() => onUpdateColumn(table.id, col.id, { isPk: !col.isPk })}
                className={`p-0.5 rounded transition-all ${
                  col.isPk
                    ? 'text-amber-300 bg-amber-400/20 border border-amber-400/40 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-400 opacity-25 hover:opacity-100'
                }`}
                title="기본키 (Primary Key) 설정/해제"
              >
                <Key className="w-3 h-3" />
              </button>

              {col.isFk && (
                <span
                  className="text-sky-300 font-bold text-[8px] bg-sky-500/20 px-0.5 rounded border border-sky-400/30 cursor-default"
                  title="외래키 (Foreign Key)"
                >
                  FK
                </span>
              )}
            </div>

            {/* Logical Name (논리명) */}
            {displayMode !== 'physical' && (
              <div className="w-28 shrink-0 nodrag px-0.5">
                <ColumnInput
                  key={`logic_${col.id}`}
                  initialValue={col.logicalName}
                  placeholder="논리명"
                  className="bg-transparent text-white/95 focus:bg-black/40 px-1 py-0.5 rounded border border-transparent focus:border-emerald-500 outline-none w-full text-[11px] font-medium truncate"
                  onCommit={(val) => onUpdateColumn(table.id, col.id, { logicalName: val })}
                  onEnterPress={() => onAddColumn(table.id)}
                />
              </div>
            )}

            {/* Physical Name (물리명) */}
            {displayMode !== 'logical' && (
              <div className="w-28 shrink-0 nodrag px-0.5">
                <ColumnInput
                  key={`phys_${col.id}`}
                  initialValue={col.physicalName}
                  placeholder="물리명"
                  className="bg-transparent text-white focus:bg-black/40 px-1 py-0.5 rounded border border-transparent focus:border-emerald-500 outline-none w-full text-[11px] font-semibold font-mono truncate"
                  onCommit={(val) => onUpdateColumn(table.id, col.id, { physicalName: val })}
                  onEnterPress={() => onAddColumn(table.id)}
                />
              </div>
            )}

            {/* Domain (도메인 값/설명 & 자동완성 드롭다운) */}
            <div className="w-32 shrink-0 relative nodrag px-0.5">
              <div className="flex items-center bg-transparent rounded border border-transparent hover:border-white/10 focus-within:border-emerald-500 focus-within:bg-black/40">
                <ColumnInput
                  key={`domain_${col.id}`}
                  initialValue={col.domain}
                  placeholder="Domain"
                  className="bg-transparent text-emerald-200/90 placeholder:text-neutral-500/60 px-1 py-0.5 outline-none w-full text-[10.5px] italic truncate"
                  onCommit={(val) => onUpdateColumn(table.id, col.id, { domain: val })}
                  onEnterPress={() => onAddColumn(table.id)}
                  onFocus={() => {
                    if (domains.length > 0) {
                      setActiveDomainDropdown(col.id);
                    }
                  }}
                />
                {domains.length > 0 && (
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
              {activeDomainDropdown === col.id && domains.length > 0 && (
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
            <div className="w-28 shrink-0 relative nodrag px-0.5">
              <div className="flex items-center bg-transparent rounded border border-transparent hover:border-white/10 focus-within:border-emerald-500 focus-within:bg-black/40">
                <input
                  type="text"
                  className="bg-transparent text-emerald-300 px-1 py-0.5 outline-none w-full text-[10.5px] font-mono lowercase"
                  value={
                    col.type.name
                      ? `${col.type.name.toLowerCase()}${col.type.length ? `(${col.type.length})` : ''}`
                      : ''
                  }
                  onChange={(e) => {
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
                    if (e.key === 'Enter') onAddColumn(table.id);
                  }}
                />
                <button
                  onClick={() =>
                    setActiveTypeDropdown(activeTypeDropdown === col.id ? null : col.id)
                  }
                  className="text-neutral-400 hover:text-white p-0.5 transition-colors shrink-0"
                  title="타입 선택"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Type Dropdown Menu (Scrollable & Outside Click Closeable) */}
              {activeTypeDropdown === col.id && (
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
                onClick={() => onUpdateColumn(table.id, col.id, { nullable: !col.nullable })}
                className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded font-bold transition-all ${
                  !col.nullable
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title={col.nullable ? 'NULL 허용' : 'NOT NULL (필수)'}
              >
                {col.nullable ? 'NULL' : 'NOT NULL'}
              </button>
            </div>

            {/* Default Value */}
            <div className="w-24 shrink-0 nodrag px-0.5">
              <ColumnInput
                key={`def_${col.id}`}
                initialValue={col.defaultExpression}
                placeholder="Default value"
                className="bg-transparent text-amber-200/90 placeholder:text-neutral-500/60 focus:bg-black/40 px-1 py-0.5 rounded border border-transparent focus:border-emerald-500 outline-none w-full text-[10.5px] font-mono truncate"
                onCommit={(val) => onUpdateColumn(table.id, col.id, { defaultExpression: val })}
                onEnterPress={() => onAddColumn(table.id)}
              />
            </div>

            {/* Comment */}
            <div className="flex-1 min-w-[100px] nodrag px-0.5">
              <ColumnInput
                key={`cmt_${col.id}`}
                initialValue={col.comment}
                placeholder="Comment"
                className="bg-transparent text-neutral-300 placeholder:text-neutral-500/60 focus:bg-black/40 px-1 py-0.5 rounded border border-transparent focus:border-emerald-500 outline-none w-full text-[10.5px] truncate"
                onCommit={(val) => onUpdateColumn(table.id, col.id, { comment: val })}
                onEnterPress={() => onAddColumn(table.id)}
              />
            </div>

            {/* Delete Column Button */}
            <div className="w-4 shrink-0 nodrag flex items-center justify-center">
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
        className="w-full py-1 bg-[#16241a] hover:bg-[#1f3325] text-neutral-300 hover:text-emerald-300 text-[10.5px] font-medium flex items-center justify-center gap-1 border-t border-emerald-900/30 rounded-b-lg transition-colors nodrag"
      >
        <Plus className="w-3 h-3 text-emerald-400" /> 컬럼 추가 (Enter)
      </button>
    </div>
  );
};


