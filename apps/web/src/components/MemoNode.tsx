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
  '#fef08a': { bg: '#fef08a', border: '#fde047', text: '#713f12', placeholder: '#a16207' }, // Yellow
  '#fed7aa': { bg: '#fed7aa', border: '#fdba74', text: '#7c2d12', placeholder: '#c2410c' }, // Orange
  '#bbf7d0': { bg: '#bbf7d0', border: '#86efac', text: '#14532d', placeholder: '#15803d' }, // Green
  '#bfdbfe': { bg: '#bfdbfe', border: '#93c5fd', text: '#1e3a8a', placeholder: '#1d4ed8' }, // Blue
  '#fbcfe8': { bg: '#fbcfe8', border: '#f472b6', text: '#831843', placeholder: '#be185d' }, // Pink
};

const COLOR_KEYS = ['#fef08a', '#fed7aa', '#bbf7d0', '#bfdbfe', '#fbcfe8'];

export const MemoNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { memo, onUpdate, onDelete } = data as unknown as MemoNodeData;
  const [content, setContent] = useState(memo?.content || '');
  const isFocusedRef = useRef(false);

  // 원격 사용자의 실시간 메모 내용 변경 동기화 (내가 편집 중이 아닐 때만 적용하여 한글 IME 조합 보호)
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
      className={`w-60 min-h-[140px] p-3 rounded-lg shadow-xl border flex flex-col justify-between transition-all ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#07090e]' : 'hover:shadow-2xl'
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-black/10 mb-2">
        <div className="flex gap-1.5 nodrag">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate(memo.id, { color: c })}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full border border-black/20 hover:scale-110 transition-transform ${
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
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <textarea
        value={content}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          // 포커스 아웃 시 최종 내용 확정 동기화
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
