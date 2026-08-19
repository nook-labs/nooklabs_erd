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

// 폰트 크기 프리셋 및 변환 헬퍼 (11px ~ 80px 초대형 타이틀 지원)
const FONT_PRESETS: { key: string; px: number; label: string }[] = [
  { key: 'xs', px: 12, label: '소 (12px)' },
  { key: 'base', px: 18, label: '중 (18px)' },
  { key: 'lg', px: 26, label: '대 (26px)' },
  { key: 'xl', px: 36, label: '특대 (36px)' },
  { key: '2xl', px: 50, label: '초대형 (50px)' },
  { key: '3xl', px: 68, label: '간판급 (68px)' },
];

function resolveFontSizePx(val: any): number {
  if (typeof val === 'number') {
    return Math.min(Math.max(val, 11), 84);
  }
  if (typeof val === 'string') {
    const matched = FONT_PRESETS.find((p) => p.key === val);
    if (matched) return matched.px;
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) return Math.min(Math.max(parsed, 11), 84);
  }
  return 18; // 기본 18px (선명하고 편안한 본문 크기)
}

export const MemoNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { memo, onUpdate, onDelete } = data as unknown as MemoNodeData;
  const [content, setContent] = useState(memo?.content || '');
  const isFocusedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textHeight, setTextHeight] = useState(60);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);

  const textStyle: MemoTextStyle = memo?.textStyle || {
    fontSize: 'base',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    textDecoration: 'none',
  };

  const currentFontSizePx = resolveFontSizePx(textStyle.fontSize);

  const handleUpdateTextStyle = (updates: Partial<MemoTextStyle>) => {
    const nextStyle: MemoTextStyle = {
      ...textStyle,
      ...updates,
    };
    onUpdate(memo.id, { textStyle: nextStyle });
  };

  // Font Size Stepper (A- / A+)
  const handleStepFontSize = (delta: number) => {
    const nextPx = Math.min(Math.max(currentFontSizePx + delta, 11), 84);
    handleUpdateTextStyle({ fontSize: nextPx });
  };

  // Auto-calculate textarea content height
  const updateHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      const scrollH = textarea.scrollHeight;
      textarea.style.height = `${Math.max(scrollH, currentFontSizePx * 1.5, 60)}px`;
      setTextHeight(Math.max(scrollH, currentFontSizePx * 1.5, 60));
    }
  }, [currentFontSizePx]);

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

  return (
    <div
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        width: activeWidth ? `${activeWidth}px` : currentFontSizePx >= 36 ? '340px' : '260px',
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
      <div className="nodrag flex items-center justify-between gap-1 py-0.5 px-0.5 border-b border-black/5 text-[11px] shrink-0 select-none flex-wrap">
        {/* Font Size Stepper & Dropdown (A- / A+ / Size Badge) */}
        <div className="flex items-center gap-0.5 relative">
          <button
            onClick={() => handleStepFontSize(-4)}
            style={{ color: theme.text }}
            className="px-1 py-0.5 rounded font-black opacity-75 hover:opacity-100 hover:bg-black/5 transition-all active:scale-95 text-[10px]"
            title="글자 작게 (A-)"
          >
            A-
          </button>

          {/* Current Font Size Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsSizeMenuOpen((prev) => !prev)}
              style={{
                color: theme.text,
                backgroundColor: theme.toolbarHover,
              }}
              className="px-1.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-0.5 ring-1 ring-black/10 hover:ring-black/30 transition-all"
              title="글자 크기 프리셋 선택"
            >
              <span>{currentFontSizePx}px</span>
            </button>

            {/* Font Size Dropdown Popover */}
            {isSizeMenuOpen && (
              <div
                className="absolute top-full left-0 mt-1 bg-white dark:bg-[#242424] text-neutral-800 dark:text-neutral-200 border border-black/10 dark:border-white/10 rounded-lg shadow-2xl py-1 z-50 min-w-[120px] backdrop-blur-md"
                onMouseLeave={() => setIsSizeMenuOpen(false)}
              >
                {FONT_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      handleUpdateTextStyle({ fontSize: preset.px });
                      setIsSizeMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 text-xs flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-neutral-700 transition-colors ${
                      currentFontSizePx === preset.px ? 'font-bold text-[#0c8ce9] bg-indigo-50/50' : ''
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{preset.px}px</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleStepFontSize(4)}
            style={{ color: theme.text }}
            className="px-1 py-0.5 rounded font-black opacity-75 hover:opacity-100 hover:bg-black/5 transition-all active:scale-95 text-[12px]"
            title="글자 크게 (A+ / 최대 84px)"
          >
            A+
          </button>
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
          fontSize: `${currentFontSizePx}px`,
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


