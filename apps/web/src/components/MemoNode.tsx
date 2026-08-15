'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { MemoModel } from '@/types/erd';
import { Trash2 } from 'lucide-react';

export interface MemoNodeData {
  memo: MemoModel;
  onUpdate: (memoId: string, updates: Partial<MemoModel>) => void;
  onDelete: (memoId: string) => void;
}

const MEMO_THEMES: Record<string, { bg: string; border: string; text: string; placeholder: string }> = {
  '#fef08a': { bg: '#fef9c3', border: '#fde047', text: '#713f12', placeholder: '#a16207' }, // Soft Yellow
  '#fed7aa': { bg: '#ffedd5', border: '#fdba74', text: '#7c2d12', placeholder: '#c2410c' }, // Soft Orange
  '#bbf7d0': { bg: '#dcfce7', border: '#86efac', text: '#14532d', placeholder: '#15803d' }, // Soft Green
  '#bfdbfe': { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a', placeholder: '#1d4ed8' }, // Soft Blue
  '#fbcfe8': { bg: '#fce7f3', border: '#f472b6', text: '#831843', placeholder: '#be185d' }, // Soft Pink
};

const COLOR_KEYS = ['#fef08a', '#fed7aa', '#bbf7d0', '#bfdbfe', '#fbcfe8'];

export const MemoNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { memo, onUpdate, onDelete } = data as unknown as MemoNodeData;
  const [content, setContent] = useState(memo?.content || '');
  const isFocusedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textHeight, setTextHeight] = useState(60);

  // Auto-calculate textarea content height
  const updateHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      const scrollH = textarea.scrollHeight;
      textarea.style.height = `${Math.max(scrollH, 60)}px`;
      setTextHeight(Math.max(scrollH, 60));
    }
  }, []);

  useEffect(() => {
    if (!isFocusedRef.current && memo?.content !== undefined) {
      setContent(memo.content);
    }
  }, [memo?.content]);

  useEffect(() => {
    updateHeight();
  }, [content, updateHeight]);

  const colorKey = memo?.color && MEMO_THEMES[memo.color] ? memo.color : '#fef08a';
  const theme = MEMO_THEMES[colorKey];

  const customWidth = memo?.position?.width;
  const customHeight = memo?.position?.height;

  // Local size state during active drag to prevent Yjs transaction floods
  const [localSize, setLocalSize] = useState<{ width?: number; height?: number }>({
    width: customWidth,
    height: customHeight,
  });

  useEffect(() => {
    setLocalSize({
      width: memo?.position?.width,
      height: memo?.position?.height,
    });
  }, [memo?.position?.width, memo?.position?.height]);

  const activeWidth = localSize.width;
  const activeHeight = localSize.height;

  // Total container minimum height: manual height or auto-expanded text height + padding/header
  const containerMinHeight = Math.max(activeHeight || 120, textHeight + 48);

  return (
    <div
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        width: activeWidth ? `${activeWidth}px` : '240px',
        minWidth: '180px',
        minHeight: `${containerMinHeight}px`,
        height: 'auto',
      }}
      className={`p-3 rounded-xl shadow-lg border flex flex-col justify-start gap-1 transition-all relative ${
        selected ? 'ring-2 ring-[#0c8ce9] shadow-2xl' : 'hover:shadow-xl'
      }`}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={180}
        minHeight={100}
        lineClassName="border-[#0c8ce9]"
        handleClassName="h-2.5 w-2.5 bg-white border-2 border-[#0c8ce9] rounded"
        onResize={(_, params) => {
          setLocalSize({
            width: Math.round(params.width),
            height: Math.round(params.height),
          });
        }}
        onResizeEnd={(_, params) => {
          onUpdate(memo.id, {
            position: {
              ...memo.position,
              width: Math.round(params.width),
              height: Math.round(params.height),
            },
          });
        }}
      />

      <div className="flex items-center justify-between pb-1 border-b border-black/10 shrink-0">
        <div className="flex gap-1.5 nodrag">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate(memo.id, { color: c })}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full border border-black/20 hover:scale-110 transition-transform ${
                colorKey === c ? 'ring-2 ring-black/70 ring-offset-1' : ''
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => onDelete(memo.id)}
          className="nodrag p-1 text-black/50 hover:text-rose-700 rounded hover:bg-black/5 transition-colors"
          title="메모 삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          onUpdate(memo.id, { content });
        }}
        onInput={updateHeight}
        onChange={(e) => {
          const val = e.target.value;
          setContent(val);
          onUpdate(memo.id, { content: val });
        }}
        placeholder="메모를 입력하세요..."
        style={{ color: theme.text, height: `${textHeight}px` }}
        className="nodrag w-full bg-transparent text-xs font-medium resize-none outline-none leading-relaxed overflow-hidden whitespace-pre-wrap block pt-0.5"
        rows={1}
      />
    </div>
  );
};


