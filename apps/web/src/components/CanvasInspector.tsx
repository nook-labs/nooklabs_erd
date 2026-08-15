'use client';

import React, { useState } from 'react';
import {
  Palette,
  Grid,
  Eye,
  Sliders,
  Sparkles,
  Download,
  FolderArchive,
  Table as TableIcon,
  Layers,
  Check,
  X,
  Maximize2,
} from 'lucide-react';
import { DisplayMode } from '@/types/erd';

export interface CanvasSettings {
  backgroundColor: string;
  gridType: 'dots' | 'lines' | 'cross' | 'none';
  gridColor: string;
  zoomLabelScale?: number; // 기본값 1.45
  showZoomLabels?: boolean; // 기본값 true
}


export const CANVAS_BG_PRESETS = [
  { name: 'Figma Dark', color: '#1e1e1e', darkText: false },
  { name: 'Figma Slate', color: '#2c2c2c', darkText: false },
  { name: 'Obsidian', color: '#18181b', darkText: false },
  { name: 'Midnight', color: '#090d16', darkText: false },
  { name: 'Deep Navy', color: '#0f172a', darkText: false },
  { name: 'Warm Charcoal', color: '#27272a', darkText: false },
  { name: 'Clean Light', color: '#f8fafc', darkText: true },
  { name: 'Pure White', color: '#ffffff', darkText: true },
];

interface CanvasInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CanvasSettings;
  onUpdateSettings: (updates: Partial<CanvasSettings>) => void;
  tableCount: number;
  relationshipCount: number;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  onOpenExport: () => void;
  onOpenDomain: () => void;
}

export const CanvasInspector: React.FC<CanvasInspectorProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  tableCount,
  relationshipCount,
  displayMode,
  setDisplayMode,
  onOpenExport,
  onOpenDomain,
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'schema'>('design');
  const [customHex, setCustomHex] = useState(settings.backgroundColor);

  if (!isOpen) return null;

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
      onUpdateSettings({ backgroundColor: val });
    }
  };

  return (
    <aside className="fixed sm:static right-0 top-12 bottom-8 sm:bottom-0 w-72 sm:w-64 bg-[#222222] border-l border-white/[0.08] flex flex-col z-40 text-xs select-none shadow-2xl sm:shadow-none animate-in slide-in-from-right-4 duration-150">
      {/* Top Tabs (Figma Design / Schema style) */}
      <div className="h-10 border-b border-white/[0.08] flex items-center justify-between px-3 shrink-0 bg-[#1e1e1e]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('design')}
            className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
              activeTab === 'design'
                ? 'bg-[#2c2c2c] text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            디자인 (Page)
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
              activeTab === 'schema'
                ? 'bg-[#2c2c2c] text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            스키마 정보
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/[0.08] transition-colors"
          title="인스펙터 닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {activeTab === 'design' ? (
          <>
            {/* 1. Page Background Section (Exact Figma Right Panel Layout) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-300 text-[11px] uppercase tracking-wider">
                  페이지 배경 (Background)
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">100%</span>
              </div>

              {/* Color Swatch & Hex Input */}
              <div className="flex items-center gap-2 bg-[#181818] p-1.5 rounded-lg border border-white/[0.08]">
                <div className="relative w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0">
                  <input
                    type="color"
                    value={settings.backgroundColor.length === 7 ? settings.backgroundColor : '#1e1e1e'}
                    onChange={(e) => {
                      onUpdateSettings({ backgroundColor: e.target.value });
                      setCustomHex(e.target.value);
                    }}
                    className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer opacity-0"
                  />
                  <div
                    style={{ backgroundColor: settings.backgroundColor }}
                    className="w-full h-full"
                  />
                </div>

                <input
                  type="text"
                  value={customHex.toUpperCase().replace('#', '')}
                  onChange={(e) => handleHexChange(e)}
                  className="bg-transparent text-white font-mono text-xs w-20 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#0c8ce9] rounded"
                  placeholder="1E1E1E"
                  maxLength={7}
                />

                <span className="text-[10px] text-neutral-500 ml-auto mr-1">HEX</span>
              </div>

              {/* Preset Palette */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {CANVAS_BG_PRESETS.map((preset) => {
                  const isSelected =
                    settings.backgroundColor.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.color}
                      onClick={() => {
                        onUpdateSettings({ backgroundColor: preset.color });
                        setCustomHex(preset.color);
                      }}
                      style={{ backgroundColor: preset.color }}
                      className={`h-7 rounded border transition-all relative flex items-center justify-center ${
                        isSelected
                          ? 'border-[#0c8ce9] ring-1 ring-[#0c8ce9] scale-[1.04]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      title={preset.name}
                    >
                      {isSelected && (
                        <Check
                          className={`w-3 h-3 ${
                            preset.darkText ? 'text-black' : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-[1px] bg-white/[0.08]" />

            {/* 2. Grid Style Section */}
            <div className="space-y-2.5">
              <span className="font-bold text-neutral-300 text-[11px] uppercase tracking-wider block">
                캔버스 그리드 (Grid Pattern)
              </span>

              <div className="grid grid-cols-4 gap-1 bg-[#181818] p-1 rounded-lg border border-white/[0.08]">
                {(
                  [
                    { id: 'dots', label: '점 (Dots)' },
                    { id: 'lines', label: '모눈 (Lines)' },
                    { id: 'cross', label: '십자 (Cross)' },
                    { id: 'none', label: '없음 (None)' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onUpdateSettings({ gridType: g.id })}
                    className={`py-1 rounded text-[10px] font-medium transition-all ${
                      settings.gridType === g.id
                        ? 'bg-[#2c2c2c] text-white shadow-sm font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {g.id === 'dots' ? 'Dots' : g.id === 'lines' ? 'Lines' : g.id === 'cross' ? 'Cross' : 'None'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-white/[0.08]" />

            {/* 3. Display Mode Section */}
            <div className="space-y-2.5">
              <span className="font-bold text-neutral-300 text-[11px] uppercase tracking-wider block">
                이름 표기 방식 (Display)
              </span>

              <div className="grid grid-cols-3 gap-1 bg-[#181818] p-1 rounded-lg border border-white/[0.08]">
                <button
                  onClick={() => setDisplayMode('physical')}
                  className={`py-1 rounded text-[10px] font-medium transition-all ${
                    displayMode === 'physical'
                      ? 'bg-[#2c2c2c] text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  물리명
                </button>
                <button
                  onClick={() => setDisplayMode('logical')}
                  className={`py-1 rounded text-[10px] font-medium transition-all ${
                    displayMode === 'logical'
                      ? 'bg-[#2c2c2c] text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  논리명
                </button>
                <button
                  onClick={() => setDisplayMode('both')}
                  className={`py-1 rounded text-[10px] font-medium transition-all ${
                    displayMode === 'both'
                      ? 'bg-[#2c2c2c] text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  동시 표기
                </button>
              </div>
            </div>

            <div className="h-[1px] bg-white/[0.08]" />

            {/* 4. Zoom Label Scaling Controls (줌 아웃 시 타이틀 확대 설정) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-300 text-[11px] uppercase tracking-wider block">
                  줌 아웃 타이틀 확대 (Zoom Label)
                </span>
                <span className="text-[11px] font-mono text-[#0c8ce9] font-bold">
                  {(settings.zoomLabelScale ?? 1.45).toFixed(2)}x
                </span>
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={settings.zoomLabelScale ?? 1.45}
                  onChange={(e) => onUpdateSettings({ zoomLabelScale: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-[#181818] rounded-lg appearance-none cursor-pointer accent-[#0c8ce9]"
                />
                <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                  <span>작게 (0.5x)</span>
                  <span className="text-neutral-400">기본 (1.45x)</span>
                  <span>크게 (3.0x)</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '보통', val: 1.0 },
                  { label: '기본값', val: 1.45 },
                  { label: '크게', val: 2.0 },
                  { label: '최대', val: 2.8 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onUpdateSettings({ zoomLabelScale: p.val })}
                    className={`py-1 rounded text-[10px] border transition-colors ${
                      (settings.zoomLabelScale ?? 1.45) === p.val
                        ? 'bg-[#0c8ce9]/20 border-[#0c8ce9] text-[#0c8ce9] font-bold'
                        : 'bg-[#181818] border-white/[0.08] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>


            <div className="h-[1px] bg-white/[0.08]" />

            {/* 4. Quick Actions */}
            <div className="space-y-2">
              <span className="font-bold text-neutral-300 text-[11px] uppercase tracking-wider block">
                빠른 작업 (Actions)
              </span>

              <button
                onClick={onOpenExport}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#2c2c2c] hover:bg-[#383838] text-neutral-200 hover:text-white transition-colors border border-white/[0.06]"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-[#0c8ce9]" />
                  <span>DDL / 이미지 내보내기</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Export</span>
              </button>

              <button
                onClick={onOpenDomain}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#2c2c2c] hover:bg-[#383838] text-neutral-200 hover:text-white transition-colors border border-white/[0.06]"
              >
                <span className="flex items-center gap-2">
                  <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>도메인 타입 관리</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Domain</span>
              </button>
            </div>
          </>
        ) : (
          /* Schema Stats Tab */
          <div className="space-y-4">
            <div className="bg-[#181818] p-3 rounded-lg border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">총 테이블 수</span>
                <span className="font-bold text-white font-mono">{tableCount}개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">총 관계선 수</span>
                <span className="font-bold text-white font-mono">{relationshipCount}개</span>
              </div>
            </div>

            <div className="p-3 bg-[#2c2c2c] rounded-lg border border-white/[0.06] text-[11px] text-neutral-300 leading-relaxed">
              <p className="font-semibold text-white mb-1">💡 협업 팁</p>
              동료와 같은 방에 접속하면 마우스 커서와 변경 사항이 실시간으로 동기화됩니다.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
