'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NodeProps } from '@xyflow/react';
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

  useEffect(() => {
    if (!isFocusedRef.current && memo?.content !== undefined) {
      setContent(memo.content);
    }
  }, [memo?.content]);

  const colorKey = memo?.color && MEMO_THEMES[memo.color] ? memo.color : '#fef08a';
  const theme = MEMO_THEMES[colorKey];

  return (
    <div
      style={{ backgroundColor: theme.bg, borderColor: theme.border }}
      className={`w-56 sm:w-60 min-h-[130px] p-3 rounded-lg shadow-lg border flex flex-col justify-between transition-all ${
        selected ? 'ring-2 ring-[#0c8ce9] shadow-2xl' : 'hover:shadow-xl'
      }`}
    >
      <div className="flex items-center justify-between pb-1 border-b border-black/10 mb-2">
        <div className="flex gap-1 nodrag">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate(memo.id, { color: c })}
              style={{ backgroundColor: c }}
              className={`w-3 h-3 rounded-full border border-black/20 hover:scale-110 transition-transform ${
                colorKey === c ? 'ring-1.5 ring-black/80' : ''
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => onDelete(memo.id)}
          className="nodrag p-1 text-black/50 hover:text-rose-700 rounded hover:bg-black/5 transition-colors"
          title="메모 삭제"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <textarea
        value={content}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          onUpdate(memo.id, { content });
        }}
        onChange={(e) => {
          const val = e.target.value;
          setContent(val);
          onUpdate(memo.id, { content: val });
        }}
        placeholder="메모를 입력하세요..."
        style={{ color: theme.text }}
        className="nodrag flex-1 bg-transparent text-xs font-medium resize-none outline-none leading-relaxed overflow-y-auto"
        rows={4}
      />
    </div>
  );
};

