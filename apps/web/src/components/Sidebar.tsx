'use client';

import React from 'react';
import { ActiveTool } from '@/types/erd';
import {
  MousePointer2,
  Table2,
  FileText,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ListTree,
} from 'lucide-react';

interface SidebarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isIdentifyingMode: boolean;
  setIsIdentifyingMode: (identifying: boolean) => void;
  onAddTable: () => void;
  onAddMemo: () => void;
  onAutoLayout: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleEntityList?: () => void;
  isEntityListOpen?: boolean;
}

// 7 Types of Crow's Foot Icons with Figma Clean Precision
const ERD_REL_TOOLS: {
  tool: ActiveTool;
  title: string;
  svg: React.ReactNode;
}[] = [
  {
    tool: 'rel-optional-one-many',
    title: 'Optional 1+many (없거나 1개 또는 여러개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="14" y2="12" strokeWidth="1.6" />
        <circle cx="5" cy="12" r="2.5" strokeWidth="1.6" fill="#1e1e1e" />
        <line x1="10" y1="5" x2="10" y2="19" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 14 12 L 23 5 M 14 12 L 23 19 M 14 12 L 23 12" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rel-optional-many',
    title: 'Optional many (없거나 여러개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="14" y2="12" strokeWidth="1.6" />
        <circle cx="7" cy="12" r="2.8" strokeWidth="1.6" fill="#1e1e1e" />
        <path d="M 14 12 L 23 5 M 14 12 L 23 19 M 14 12 L 23 12" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rel-optional-one',
    title: 'Optional one (없거나 한개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="23" y2="12" strokeWidth="1.6" />
        <circle cx="7" cy="12" r="2.8" strokeWidth="1.6" fill="#1e1e1e" />
        <line x1="17" y1="5" x2="17" y2="19" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rel-mandatory-many',
    title: 'Mandatory many (1개 또는 여러개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="14" y2="12" strokeWidth="1.6" />
        <line x1="8" y1="5" x2="8" y2="19" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 14 12 L 23 5 M 14 12 L 23 19 M 14 12 L 23 12" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rel-mandatory-one',
    title: 'Mandatory one (무조건 1개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="23" y2="12" strokeWidth="1.6" />
        <line x1="9" y1="5" x2="9" y2="19" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="17" y1="5" x2="17" y2="19" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rel-many',
    title: 'Many (여러개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="13" y2="12" strokeWidth="1.6" />
        <path d="M 13 12 L 23 5 M 13 12 L 23 19 M 13 12 L 23 12" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tool: 'rel-one',
    title: 'One (한개)',
    svg: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <line x1="1" y1="12" x2="23" y2="12" strokeWidth="1.6" />
        <line x1="14" y1="5" x2="14" y2="19" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  setActiveTool,
  isIdentifyingMode,
  setIsIdentifyingMode,
  onAddTable,
  onAddMemo,
  onAutoLayout,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleEntityList,
  isEntityListOpen = false,
}) => {
  return (
    <aside className="w-9 sm:w-10 bg-[#2c2c2c] border-r border-white/[0.08] flex flex-col items-center py-2 gap-1 z-30 select-none overflow-y-auto shrink-0">
      {/* 1. Select Tool */}
      <button
        onClick={() => setActiveTool('select')}
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded transition-all ${
          activeTool === 'select'
            ? 'bg-[#0c8ce9] text-white shadow-sm'
            : 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
        }`}
        title="선택 / 이동 (V)"
      >
        <MousePointer2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {/* 2. Add Table */}
      <button
        onClick={onAddTable}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-neutral-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
        title="테이블 추가 (Shift + T)"
      >
        <Table2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
      </button>

      {/* 2.5 Entity List Toggle */}
      {onToggleEntityList && (
        <button
          onClick={onToggleEntityList}
          className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded transition-all ${
            isEntityListOpen
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
          }`}
          title="엔티티 목록 (ENTITY)"
        >
          <ListTree className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      )}

      {/* 3. Add Memo / Document */}
      <button
        onClick={onAddMemo}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-neutral-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
        title="메모 추가 (Shift + M)"
      >
        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
      </button>

      {/* Divider */}
      <div className="w-5 h-[1px] bg-white/[0.1] my-0.5" />

      {/* 4~10: All 7 Crow's Foot Relationship Tools */}
      {ERD_REL_TOOLS.map((item, idx) => {
        const isSelected = activeTool === item.tool;
        return (
          <button
            key={item.tool}
            onClick={() => setActiveTool(isSelected ? 'select' : item.tool)}
            className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded transition-all ${
              isSelected
                ? 'bg-[#0c8ce9] text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={`${idx + 1}. ${item.title}`}
          >
            {item.svg}
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-5 h-[1px] bg-white/[0.1] my-0.5" />

      {/* Auto Layout */}
      <button
        onClick={onAutoLayout}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-neutral-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
        title="자동 격자 정렬 (Auto Layout)"
      >
        <Grid3X3 className="w-3.5 h-3.5" />
      </button>

      {/* Zoom Controls at Bottom */}
      <div className="flex flex-col items-center gap-0.5 mt-auto pt-1">
        <button
          onClick={onZoomIn}
          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/[0.08]"
          title="확대 (+)"
        >
          <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        <button
          onClick={onZoomOut}
          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/[0.08]"
          title="축소 (-)"
        >
          <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        <button
          onClick={onFitView}
          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded text-neutral-400 hover:text-white hover:bg-white/[0.08]"
          title="화면 맞춤"
        >
          <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </aside>
  );
};

