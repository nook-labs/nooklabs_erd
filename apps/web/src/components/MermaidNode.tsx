'use client';

import React, { useState, useEffect } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { DiagramModel } from '@/types/erd';
import { MermaidViewer } from './MermaidViewer';
import {
  FileCode2,
  Pencil,
  Trash2,
  Copy,
  Maximize2,
  Code2,
} from 'lucide-react';

export interface MermaidNodeData {
  diagram: DiagramModel;
  isViewerMode?: boolean;
  onUpdate: (diagramId: string, updates: Partial<DiagramModel>) => void;
  onDelete: (diagramId: string) => void;
  onDuplicate?: (diagramId: string) => void;
  onOpenEditor: (diagram: DiagramModel) => void;
}

const MermaidNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const {
    diagram,
    isViewerMode = false,
    onUpdate,
    onDelete,
    onDuplicate,
    onOpenEditor,
  } = data as unknown as MermaidNodeData;

  const customWidth = diagram?.position?.width ?? 480;
  const customHeight = diagram?.position?.height ?? 380;

  const [localSize, setLocalSize] = useState<{ width?: number; height?: number }>({
    width: customWidth,
    height: customHeight,
  });

  useEffect(() => {
    setLocalSize({
      width: diagram?.position?.width ?? 480,
      height: diagram?.position?.height ?? 380,
    });
  }, [diagram?.position?.width, diagram?.position?.height]);

  const activeWidth = localSize.width ?? 480;
  const activeHeight = localSize.height ?? 380;

  const getBadgeColor = (type?: string) => {
    switch (type) {
      case 'sequence':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'flowchart':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'state':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'er':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'class':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default:
        return 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30';
    }
  };

  return (
    <div
      style={{
        width: `${activeWidth}px`,
        height: `${activeHeight}px`,
        minWidth: '280px',
        minHeight: '180px',
      }}
      onDoubleClick={() => !isViewerMode && onOpenEditor(diagram)}
      className={`bg-[#1c1f24] border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all group select-none ${
        selected
          ? 'border-[#0c8ce9] ring-2 ring-[#0c8ce9]/60 shadow-[0_0_25px_rgba(12,140,233,0.3)]'
          : 'border-white/10 hover:border-white/25 hover:shadow-xl'
      }`}
    >
      <NodeResizer
        isVisible={Boolean(selected) && !isViewerMode}
        minWidth={280}
        minHeight={180}
        lineClassName="border-[#0c8ce9]"
        handleClassName="h-3 w-3 bg-white border-2 border-[#0c8ce9] rounded"
        onResize={(_, params) => {
          setLocalSize({
            width: Math.round(params.width),
            height: Math.round(params.height),
          });
        }}
        onResizeEnd={(_, params) => {
          onUpdate(diagram.id, {
            position: {
              ...diagram.position,
              width: Math.round(params.width),
              height: Math.round(params.height),
            },
          });
        }}
      />

      {/* Header */}
      <div className="px-3 py-2 bg-[#22272e] border-b border-white/[0.08] flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <FileCode2 className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-neutral-200 truncate">
            {diagram?.title || '다이어그램'}
          </span>
          {diagram?.type && (
            <span
              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getBadgeColor(
                diagram.type
              )}`}
            >
              {diagram.type}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 nodrag">
          {!isViewerMode && (
            <>
              <button
                onClick={() => onOpenEditor(diagram)}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="코드 편집 및 프리셋 (더블클릭)"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(diagram.id)}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                  title="다이어그램 복제"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => onDelete(diagram.id)}
                className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                title="다이어그램 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 p-3 min-h-0 bg-[#16181d] flex items-center justify-center overflow-hidden">
        <MermaidViewer
          code={diagram?.code || ''}
          theme={diagram?.theme || 'dark'}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

const areMermaidPropsEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  if (prevProps.selected !== nextProps.selected) return false;
  const pData = prevProps.data as unknown as MermaidNodeData;
  const nData = nextProps.data as unknown as MermaidNodeData;
  return pData.diagram === nData.diagram && pData.isViewerMode === nData.isViewerMode;
};

export const MermaidNode = React.memo(MermaidNodeComponent, areMermaidPropsEqual);
