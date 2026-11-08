'use client';

import React from 'react';
import { ActiveTool, DisplayMode } from '@/types/erd';
import {
  MousePointer2,
  Table2,
  FileText,
  Workflow,
  Plus,
  Minus,
  Maximize2,
} from 'lucide-react';

interface SidebarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isIdentifyingMode: boolean;
  setIsIdentifyingMode: (identifying: boolean) => void;
  onAddTable: () => void;
  onAddMemo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  displayMode?: DisplayMode;
  setDisplayMode?: (mode: DisplayMode) => void;
  isViewerMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  setActiveTool,
  isIdentifyingMode,
  setIsIdentifyingMode,
  onAddTable,
  onAddMemo,
  onZoomIn,
  onZoomOut,
  onFitView,
  displayMode = 'physical',
  setDisplayMode,
  isViewerMode = false,
}) => {
  return (
    <aside className="w-[30px] bg-[#2a2a2a] border-r border-[#1e1e1e] flex flex-col items-center py-1 gap-1 z-30 select-none shrink-0 font-sans">
      {/* 1. Pointer (Select) */}
      <button
        onClick={() => setActiveTool('select')}
        className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
          activeTool === 'select'
            ? 'bg-[#1b5e20] text-white shadow-sm'
            : 'text-neutral-400 hover:text-white hover:bg-white/10'
        }`}
        title="선택 툴 (V)"
      >
        <MousePointer2 className="w-3.5 h-3.5" />
      </button>

      {/* 2. Add Table */}
      {!isViewerMode && (
        <button
          onClick={onAddTable}
          className="w-6 h-6 flex items-center justify-center rounded-[2px] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="테이블 추가"
        >
          <Table2 className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      )}

      {/* 3. Add Memo */}
      {!isViewerMode && (
        <button
          onClick={() => setActiveTool(activeTool === 'memo' ? 'select' : 'memo')}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'memo'
              ? 'bg-[#f59e0b] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="메모 추가 (Shift+M)"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 3-2. Add Sequence/Mermaid Diagram Node */}
      {!isViewerMode && (
        <button
          onClick={() => setActiveTool(activeTool === 'diagram' ? 'select' : 'diagram')}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'diagram'
              ? 'bg-[#0284c7] text-white font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="시퀀스 다이어그램 추가 (Shift+D)"
        >
          <Workflow className="w-3.5 h-3.5 text-sky-400" />
        </button>
      )}

      <div className="w-4 h-[1px] bg-white/10 my-0.5" />

      {/* 4. 1:1 Identifying (실선) */}
      {!isViewerMode && (
        <button
          onClick={() => {
            setIsIdentifyingMode(true);
            setActiveTool('rel-one');
          }}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'rel-one' && isIdentifyingMode
              ? 'bg-[#1b5e20] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="1:1 식별 관계 (실선)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2" />
            <line x1="6" y1="6" x2="6" y2="18" strokeWidth="2" />
            <line x1="18" y1="6" x2="18" y2="18" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* 5. 1:N Identifying (실선 까마귀발) */}
      {!isViewerMode && (
        <button
          onClick={() => {
            setIsIdentifyingMode(true);
            setActiveTool('rel-mandatory-many');
          }}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'rel-mandatory-many' && isIdentifyingMode
              ? 'bg-[#1b5e20] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="1:N 식별 관계 (실선)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="2" y1="12" x2="14" y2="12" strokeWidth="2" />
            <line x1="6" y1="6" x2="6" y2="18" strokeWidth="2" />
            <path d="M 14 12 L 22 6 M 14 12 L 22 18 M 14 12 L 22 12" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* 6. 1:1 Non-Identifying (점선) */}
      {!isViewerMode && (
        <button
          onClick={() => {
            setIsIdentifyingMode(false);
            setActiveTool('rel-optional-one');
          }}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'rel-optional-one' && !isIdentifyingMode
              ? 'bg-[#1b5e20] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="1:1 비식별 관계 (점선)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="6" y1="6" x2="6" y2="18" strokeWidth="2" />
            <line x1="18" y1="6" x2="18" y2="18" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* 7. 1:N Non-Identifying (점선 까마귀발) */}
      {!isViewerMode && (
        <button
          onClick={() => {
            setIsIdentifyingMode(false);
            setActiveTool('rel-optional-many');
          }}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'rel-optional-many' && !isIdentifyingMode
              ? 'bg-[#1b5e20] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="1:N 비식별 관계 (점선)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="2" y1="12" x2="14" y2="12" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="6" cy="12" r="2.5" strokeWidth="1.5" />
            <path d="M 14 12 L 22 6 M 14 12 L 22 18 M 14 12 L 22 12" strokeWidth="2" />
          </svg>
        </button>
      )}

      {/* 8. N:M Non-Identifying (양쪽 까마귀발) */}
      {!isViewerMode && (
        <button
          onClick={() => {
            setIsIdentifyingMode(false);
            setActiveTool('rel-many');
          }}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] transition-colors ${
            activeTool === 'rel-many'
              ? 'bg-[#1b5e20] text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="N:M 다대다 관계"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2" strokeDasharray="3 3" />
            <path d="M 8 12 L 2 6 M 8 12 L 2 18" strokeWidth="2" />
            <path d="M 16 12 L 22 6 M 16 12 L 22 18" strokeWidth="2" />
          </svg>
        </button>
      )}

      <div className="w-4 h-[1px] bg-white/10 my-0.5" />

      {/* 9. Zoom In */}
      <button
        onClick={onZoomIn}
        className="w-6 h-6 flex items-center justify-center rounded-[2px] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        title="확대 (+)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* 10. Zoom Out */}
      <button
        onClick={onZoomOut}
        className="w-6 h-6 flex items-center justify-center rounded-[2px] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        title="축소 (-)"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* 11. Fit View */}
      <button
        onClick={onFitView}
        className="w-6 h-6 flex items-center justify-center rounded-[2px] text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        title="화면 맞춤 (Fit View)"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      <div className="w-4 h-[1px] bg-white/10 my-0.5" />

      {/* 12. Logical (L) */}
      {setDisplayMode && (
        <button
          onClick={() => setDisplayMode('logical')}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] font-black text-xs transition-colors ${
            displayMode === 'logical'
              ? 'bg-[#1b5e20] text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="논리 뷰 (Logical)"
        >
          L
        </button>
      )}

      {/* 13. Physical (P) */}
      {setDisplayMode && (
        <button
          onClick={() => setDisplayMode('physical')}
          className={`w-6 h-6 flex items-center justify-center rounded-[2px] font-black text-xs transition-colors ${
            displayMode === 'physical'
              ? 'bg-[#1b5e20] text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="물리 뷰 (Physical)"
        >
          P
        </button>
      )}
    </aside>
  );
};
