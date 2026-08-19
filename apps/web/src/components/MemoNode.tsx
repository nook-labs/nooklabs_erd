'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { MemoModel, MemoTextStyle } from '@/types/erd';
import {
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

export interface MemoNodeData {
  memo: MemoModel;
  onUpdate: (memoId: string, updates: Partial<MemoModel>) => void;
  onDelete: (memoId: string) => void;
}

const MEMO_THEMES: Record<string, { bg: string; border: string; text: string; placeholder: string; toolbarHover: string }> = {
  '#fef08a': { bg: '#fef9c3', border: '#fde047', text: '#713f12', placeholder: '#a16207', toolbarHover: 'rgba(113, 63, 18, 0.12)' }, // Soft Yellow
  '#fed7aa': { bg: '#ffedd5', border: '#fdba74', text: '#7c2d12', placeholder: '#c2410c', toolbarHover: 'rgba(124, 45, 18, 0.12)' }, // Soft Orange
  '#bbf7d0': { bg: '#dcfce7', border: '#86efac', text: '#14532d', placeholder: '#15803d', toolbarHover: 'rgba(20, 83, 45, 0.12)' }, // Soft Green
  '#bfdbfe': { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a', placeholder: '#1d4ed8', toolbarHover: 'rgba(30, 58, 138, 0.12)' }, // Soft Blue
  '#fbcfe8': { bg: '#fce7f3', border: '#f472b6', text: '#831843', placeholder: '#be185d', toolbarHover: 'rgba(131, 24, 67, 0.12)' }, // Soft Pink
};

const COLOR_KEYS = ['#fef08a', '#fed7aa', '#bbf7d0', '#bfdbfe', '#fbcfe8'];

const FONT_SIZE_MAP: Record<string, { px: number; label: string }> = {
  sm: { px: 11, label: '11px' },
  base: { px: 13, label: '13px' },
  lg: { px: 15, label: '15px' },
  xl: { px: 17, label: '17px' },
};

export const MemoNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { memo, onUpdate, onDelete } = data as unknown as MemoNodeData;
  const [content, setContent] = useState(memo?.content || '');
  const isFocusedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textHeight, setTextHeight] = useState(60);

  const textStyle: MemoTextStyle = memo?.textStyle || {
    fontSize: 'base',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    textDecoration: 'none',
  };

  const handleUpdateTextStyle = (updates: Partial<MemoTextStyle>) => {
    const nextStyle: MemoTextStyle = {
      ...textStyle,
      ...updates,
    };
    onUpdate(memo.id, { textStyle: nextStyle });
  };

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
  }, [content, textStyle, updateHeight]);

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
  const containerMinHeight = Math.max(activeHeight || 130, textHeight + 72);

  const fontSizePx = FONT_SIZE_MAP[textStyle.fontSize || 'base']?.px || 13;

  return (
    <div
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        width: activeWidth ? `${activeWidth}px` : '250px',
        minWidth: '200px',
        minHeight: `${containerMinHeight}px`,
        height: 'auto',
      }}
      className={`p-2.5 rounded-xl shadow-lg border flex flex-col justify-start gap-1 transition-all relative group ${
        selected ? 'ring-2 ring-[#0c8ce9] shadow-2xl' : 'hover:shadow-xl'
      }`}
    >
      <NodeResizer
        isVisible={Boolean(selected)}
        minWidth={200}
        minHeight={110}
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

      {/* Header: Color Swatches & Delete Button */}
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

      {/* Mini Rich Text Formatting Toolbar */}
      <div className="nodrag flex items-center justify-between gap-1 py-0.5 px-1 border-b border-black/5 text-[11px] shrink-0 select-none">
        {/* Font Size Toggle */}
        <div className="flex items-center gap-0.5">
          {(['sm', 'base', 'lg', 'xl'] as const).map((sizeKey) => (
            <button
              key={sizeKey}
              onClick={() => handleUpdateTextStyle({ fontSize: sizeKey })}
              style={{
                color: theme.text,
                backgroundColor: textStyle.fontSize === sizeKey ? theme.toolbarHover : 'transparent',
              }}
              className={`px-1 py-0.2 rounded font-bold transition-colors ${
                textStyle.fontSize === sizeKey ? 'font-black ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
              }`}
              title={`글자 크기: ${sizeKey.toUpperCase()}`}
            >
              {sizeKey === 'sm' ? 'S' : sizeKey === 'base' ? 'M' : sizeKey === 'lg' ? 'L' : 'XL'}
            </button>
          ))}
        </div>

        {/* Style Buttons (Bold, Italic, Underline, Strikethrough) */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleUpdateTextStyle({ fontWeight: textStyle.fontWeight === 'bold' ? 'normal' : 'bold' })}
            style={{
              color: theme.text,
              backgroundColor: textStyle.fontWeight === 'bold' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              textStyle.fontWeight === 'bold' ? 'font-black ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="굵게 (Bold)"
          >
            <Bold className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleUpdateTextStyle({ fontStyle: textStyle.fontStyle === 'italic' ? 'normal' : 'italic' })}
            style={{
              color: theme.text,
              backgroundColor: textStyle.fontStyle === 'italic' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              textStyle.fontStyle === 'italic' ? 'ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="기울임 (Italic)"
          >
            <Italic className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleUpdateTextStyle({ textDecoration: textStyle.textDecoration === 'underline' ? 'none' : 'underline' })}
            style={{
              color: theme.text,
              backgroundColor: textStyle.textDecoration === 'underline' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              textStyle.textDecoration === 'underline' ? 'ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="밑줄 (Underline)"
          >
            <Underline className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleUpdateTextStyle({ textDecoration: textStyle.textDecoration === 'line-through' ? 'none' : 'line-through' })}
            style={{
              color: theme.text,
              backgroundColor: textStyle.textDecoration === 'line-through' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              textStyle.textDecoration === 'line-through' ? 'ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="취소선 (Strikethrough)"
          >
            <Strikethrough className="w-3 h-3" />
          </button>
        </div>

        {/* Alignment Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleUpdateTextStyle({ textAlign: 'left' })}
            style={{
              color: theme.text,
              backgroundColor: (textStyle.textAlign || 'left') === 'left' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              (textStyle.textAlign || 'left') === 'left' ? 'ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="왼쪽 정렬"
          >
            <AlignLeft className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleUpdateTextStyle({ textAlign: 'center' })}
            style={{
              color: theme.text,
              backgroundColor: textStyle.textAlign === 'center' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              textStyle.textAlign === 'center' ? 'ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="가운데 정렬"
          >
            <AlignCenter className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleUpdateTextStyle({ textAlign: 'right' })}
            style={{
              color: theme.text,
              backgroundColor: textStyle.textAlign === 'right' ? theme.toolbarHover : 'transparent',
            }}
            className={`p-1 rounded transition-colors ${
              textStyle.textAlign === 'right' ? 'ring-1 ring-black/20' : 'opacity-70 hover:opacity-100'
            }`}
            title="오른쪽 정렬"
          >
            <AlignRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Textarea with Spellcheck Disabled & Custom Text Styles */}
      <textarea
        ref={textareaRef}
        value={content}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
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
        style={{
          color: theme.text,
          fontSize: `${fontSizePx}px`,
          fontWeight: textStyle.fontWeight === 'bold' ? 700 : 500,
          fontStyle: textStyle.fontStyle || 'normal',
          textAlign: textStyle.textAlign || 'left',
          textDecoration: textStyle.textDecoration || 'none',
          height: `${textHeight}px`,
        }}
        className="nodrag w-full bg-transparent resize-none outline-none leading-relaxed overflow-hidden whitespace-pre-wrap block pt-1 border-none focus:ring-0"
        rows={1}
      />
    </div>
  );
};


