'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PageModel } from '@/types/erd';
import {
  Plus,
  Layers,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Check,
  Table2,
  FileText,
  Workflow,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';

interface CanvasPagesTabBarProps {
  pages: Record<string, PageModel>;
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name?: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<PageModel>) => void;
  onDeletePage: (pageId: string) => void;
  onDuplicatePage?: (pageId: string) => void;
  isReadOnly?: boolean;
}

export const CanvasPagesTabBar: React.FC<CanvasPagesTabBarProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onUpdatePage,
  onDeletePage,
  onDuplicatePage,
  isReadOnly = false,
}) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenPageId, setMenuOpenPageId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const pageList = Object.values(pages).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Fallback: If pages is empty, represent default virtual page
  const displayPages = pageList.length > 0 ? pageList : [
    { id: 'page_default', name: '메인 ERD', order: 0 }
  ];

  const activePage = displayPages.find((p) => p.id === activePageId) || displayPages[0];
  const activeIndex = displayPages.findIndex((p) => p.id === activePage.id);

  useEffect(() => {
    if (editingPageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPageId]);

  const handleStartRename = (page: PageModel) => {
    if (isReadOnly) return;
    setEditingPageId(page.id);
    setEditingName(page.name);
    setMenuOpenPageId(null);
  };

  const handleFinishRename = (pageId: string) => {
    if (editingName.trim()) {
      onUpdatePage(pageId, { name: editingName.trim() });
    }
    setEditingPageId(null);
  };

  const getPageIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('erd') || lower.includes('테이블') || lower.includes('table') || lower.includes('db')) {
      return <Table2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (lower.includes('메모') || lower.includes('memo') || lower.includes('note') || lower.includes('문서')) {
      return <FileText className="w-3.5 h-3.5 text-amber-400" />;
    }
    if (lower.includes('다이어그램') || lower.includes('mermaid') || lower.includes('시퀀스') || lower.includes('플로우') || lower.includes('flow')) {
      return <Workflow className="w-3.5 h-3.5 text-indigo-400" />;
    }
    return <Layers className="w-3.5 h-3.5 text-sky-400" />;
  };

  return (
    <>
      {/* 1. Mobile Compact Dropdown Pill Button (sm:hidden) */}
      <div className="sm:hidden relative">
        <button
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 bg-[#1e1e1e]/95 hover:bg-[#282828] active:scale-95 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-full shadow-2xl text-xs font-semibold text-white transition-all select-none"
        >
          <div className="shrink-0">{getPageIcon(activePage.name)}</div>
          <span className="max-w-[110px] truncate">{activePage.name}</span>
          <span className="text-[10px] text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded-full font-mono shrink-0">
            {activeIndex + 1}/{displayPages.length}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 ${
              isMobileMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Mobile Dropdown Popover Menu */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Menu Panel */}
            <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#1e1e1e]/98 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-2 min-w-[210px] max-w-[280px] max-h-[50vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2.5 py-1.5 text-[11px] font-bold text-neutral-400 border-b border-white/10 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0c8ce9]" />
                  <span>페이지 전환 ({displayPages.length})</span>
                </span>
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      onAddPage();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-[10px] text-[#0c8ce9] hover:text-[#38bdf8] flex items-center gap-0.5 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1 mt-1.5">
                {displayPages.map((page, idx) => {
                  const isActive = page.id === activePageId;
                  return (
                    <button
                      key={page.id}
                      onClick={() => {
                        onSelectPage(page.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left ${
                        isActive
                          ? 'bg-[#0c8ce9]/20 text-white font-bold border border-[#0c8ce9]/40 shadow-sm'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] text-neutral-500 font-mono w-3.5 text-right shrink-0">
                          {idx + 1}
                        </span>
                        <div className="shrink-0">{getPageIcon(page.name)}</div>
                        <span className="truncate">{page.name}</span>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-[#0c8ce9] shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2. Desktop Full Tab Bar (hidden sm:flex) */}
      <div className="hidden sm:flex items-center gap-1 bg-[#1e1e1e]/95 backdrop-blur-md border border-white/10 rounded-lg p-1 shadow-2xl select-none max-w-full z-30">
        <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-neutral-400 border-r border-white/10 shrink-0">
          <Layers className="w-3.5 h-3.5 text-[#0c8ce9]" />
          <span>페이지</span>
        </div>

        {/* Tabs list container */}
        <div className="flex items-center gap-1 shrink-0 overflow-visible">
          {displayPages.map((page) => {
            const isActive = page.id === activePageId || (displayPages.length === 1 && !pages[activePageId]);
            const isEditing = editingPageId === page.id;
            const isMenuOpen = menuOpenPageId === page.id;

            return (
              <div
                key={page.id}
                className={`relative group flex items-center rounded-md text-xs transition-all ${
                  isActive
                    ? 'bg-[#2a2a2a] text-white font-semibold shadow-inner border border-white/15'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center px-2 py-1">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleFinishRename(page.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename(page.id);
                        if (e.key === 'Escape') setEditingPageId(null);
                      }}
                      className="bg-black/50 text-white px-1.5 py-0.5 rounded text-xs outline-none border border-[#0c8ce9] w-28"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectPage(page.id)}
                    onDoubleClick={() => handleStartRename(page)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer max-w-[160px]"
                    title={`${page.name} (더블클릭하여 이름 변경)`}
                  >
                    {getPageIcon(page.name)}
                    <span className="truncate">{page.name}</span>
                  </button>
                )}

                {/* Menu button for active tab */}
                {!isReadOnly && !isEditing && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenPageId(isMenuOpen ? null : page.id);
                      }}
                      className={`p-1 mr-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-opacity ${
                        isActive || isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="페이지 옵션"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div
                        className="absolute bottom-full left-0 mb-1.5 bg-[#252525] border border-white/20 rounded-lg shadow-2xl py-1 z-50 min-w-[140px] text-xs text-neutral-200 animate-fadeIn backdrop-blur-md"
                        onMouseLeave={() => setMenuOpenPageId(null)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(page);
                          }}
                          className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                          <span>이름 변경</span>
                        </button>

                        {onDuplicatePage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicatePage(page.id);
                              setMenuOpenPageId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-neutral-400" />
                            <span>페이지 복제</span>
                          </button>
                        )}

                        {displayPages.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenPageId(null);
                              onDeletePage(page.id);
                            }}
                            className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>페이지 삭제</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Page Button */}
        {!isReadOnly && (
          <button
            onClick={() => onAddPage()}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-neutral-400 hover:text-white hover:bg-white/10 border border-dashed border-white/20 transition-all active:scale-95 shrink-0"
            title="새 페이지 추가 (ERD, 메모, 다이어그램 등)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>페이지 추가</span>
          </button>
        )}
      </div>
    </>
  );
};
