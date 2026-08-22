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
  const editInputRef = useRef<HTMLInputElement>(null);

  const pageList = Object.values(pages).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Fallback: If pages is empty, represent default virtual page
  const displayPages = pageList.length > 0 ? pageList : [
    { id: 'page_default', name: '메인 ERD', order: 0 }
  ];

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
    <div className="flex items-center gap-1 bg-[#1e1e1e]/95 backdrop-blur-md border border-white/10 rounded-lg p-1 shadow-2xl select-none max-w-full z-30">
      <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-neutral-400 border-r border-white/10 shrink-0">
        <Layers className="w-3.5 h-3.5 text-[#0c8ce9]" />
        <span className="hidden sm:inline">페이지</span>
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
          <span className="hidden sm:inline">페이지 추가</span>
        </button>
      )}
    </div>
  );
};
