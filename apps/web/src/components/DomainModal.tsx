'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DomainItem } from '@/types/erd';
import {
  X,
  Plus,
  Trash2,
  Bookmark,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Layers,
} from 'lucide-react';

interface DomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domains: DomainItem[];
  onAddDomain: (name: string, dataType: string, defaultValue?: string) => void;
  onUpdateDomain?: (id: string, updates: Partial<DomainItem>) => void;
  onDeleteDomain: (id: string) => void;
  onSyncDomain?: (domain: DomainItem) => number;
}

const COMMON_DATA_TYPES = [
  'varchar(255)',
  'varchar(50)',
  'varchar(20)',
  'text',
  'int',
  'bigint',
  'uuid',
  'boolean',
  'timestamptz',
  'date',
  'decimal(18,2)',
  'double_precision',
  'jsonb',
  'enum',
];

const DEFAULT_PRESETS = [
  { name: '이메일 (email)', dataType: 'varchar(255)', defaultValue: "''" },
  { name: '휴대폰번호 (phone)', dataType: 'varchar(20)', defaultValue: "''" },
  { name: '생성일시 (created_at)', dataType: 'timestamptz', defaultValue: 'now()' },
  { name: '수정일시 (updated_at)', dataType: 'timestamptz', defaultValue: 'now()' },
  { name: '고유식별자 (uuid)', dataType: 'uuid', defaultValue: 'gen_random_uuid()' },
  { name: '여부 플래그 (is_active)', dataType: 'boolean', defaultValue: 'true' },
  { name: '상태 (status)', dataType: 'varchar(30)', defaultValue: "'ACTIVE'" },
  { name: '금액/가격 (amount)', dataType: 'decimal(18,2)', defaultValue: '0' },
  { name: '설명글 (description)', dataType: 'text', defaultValue: '' },
];

export const DomainModal: React.FC<DomainModalProps> = ({
  isOpen,
  onClose,
  domains,
  onAddDomain,
  onUpdateDomain,
  onDeleteDomain,
  onSyncDomain,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New Inline Domain Row
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDataType, setNewDataType] = useState('varchar(255)');
  const [newDefaultValue, setNewDefaultValue] = useState('');
  const [isNewTypeDropdownOpen, setIsNewTypeDropdownOpen] = useState(false);

  // Active Dropdown for existing rows
  const [activeRowTypeDropdown, setActiveRowTypeDropdown] = useState<string | null>(null);

  const presetButtonRef = useRef<HTMLButtonElement>(null);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const newTypeRef = useRef<HTMLDivElement>(null);
  const rowDropdownRef = useRef<HTMLDivElement>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  // Handle outside clicks to close popovers
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(target) &&
        presetButtonRef.current &&
        !presetButtonRef.current.contains(target)
      ) {
        setIsPresetMenuOpen(false);
      }
      if (newTypeRef.current && !newTypeRef.current.contains(target)) {
        setIsNewTypeDropdownOpen(false);
      }
      if (rowDropdownRef.current && !rowDropdownRef.current.contains(target)) {
        setActiveRowTypeDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPresetMenuOpen(false);
        setIsNewTypeDropdownOpen(false);
        setActiveRowTypeDropdown(null);
        if (isAddingNew) setIsAddingNew(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddingNew]);

  // Focus new domain input on toggle
  useEffect(() => {
    if (isAddingNew && newNameInputRef.current) {
      newNameInputRef.current.focus();
    }
  }, [isAddingNew]);

  const filteredDomains = useMemo(() => {
    if (!searchQuery.trim()) return domains;
    const q = searchQuery.toLowerCase();
    return domains.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.dataType.toLowerCase().includes(q) ||
        (d.defaultValue && d.defaultValue.toLowerCase().includes(q))
    );
  }, [domains, searchQuery]);

  if (!isOpen) return null;

  const handleAddNewSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;
    onAddDomain(newName.trim(), newDataType.trim() || 'varchar(255)', newDefaultValue.trim());
    setNewName('');
    setNewDefaultValue('');
    setNewDataType('varchar(255)');
    setIsAddingNew(false);
    setIsNewTypeDropdownOpen(false);
  };

  const handleSync = (domain: DomainItem) => {
    if (onSyncDomain) {
      const count = onSyncDomain(domain);
      setSyncFeedback(`'${domain.name}' 도메인: 참조 중인 ${count}개 컬럼 동기화 완료`);
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
      <div className="bg-[#242424] border border-[#383838] rounded-md w-[740px] max-w-[95vw] shadow-2xl overflow-hidden font-sans text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]">
        {/* 1. Header (Clean ERDCloud / Figma Enterprise Title) */}
        <div className="px-4 py-2.5 bg-[#2b2b2b] border-b border-[#383838] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#38bdf8]" />
            <h3 className="font-bold text-xs text-white tracking-tight flex items-center gap-1.5">
              도메인(Domain) 관리
              <span className="text-[11px] text-neutral-400 font-normal">
                (컬럼 데이터 타입 표준화)
              </span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="닫기 (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Sync Feedback Toast */}
        {syncFeedback && (
          <div className="bg-[#1b5e20] text-white px-4 py-1.5 flex items-center justify-between text-[11px] font-medium animate-in fade-in slide-in-from-top-1 duration-150 shrink-0">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {syncFeedback}
            </span>
            <button onClick={() => setSyncFeedback(null)} className="text-white/80 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 3. Single Clean Action Toolbar */}
        <div className="px-4 py-2 bg-[#202020] border-b border-[#333333] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Add Domain Button */}
            <button
              onClick={() => setIsAddingNew((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] font-medium text-xs transition-colors shadow-sm"
              title="새 도메인 직접 추가"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>도메인 추가</span>
            </button>

            {/* Preset Dropdown Button */}
            <div className="relative">
              <button
                ref={presetButtonRef}
                onClick={() => setIsPresetMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#303030] hover:bg-[#3a3a3a] text-neutral-200 hover:text-white rounded-[2px] border border-white/10 text-xs transition-colors font-medium"
                title="자주 쓰는 표준 도메인 프리셋에서 가져오기"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>표준 프리셋</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* Preset Menu Popover */}
              {isPresetMenuOpen && (
                <div
                  ref={presetMenuRef}
                  className="absolute left-0 top-8 z-50 bg-[#2a2a2a] border border-[#444] rounded-[3px] shadow-2xl py-1 w-64 max-h-64 overflow-y-auto backdrop-blur-xl animate-in fade-in duration-100"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10">
                    표준 프리셋 선택 (원클릭 추가)
                  </div>
                  {DEFAULT_PRESETS.map((p) => {
                    const alreadyExists = domains.some((d) => d.name === p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => {
                          onAddDomain(p.name, p.dataType, p.defaultValue);
                          setIsPresetMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-white/10 transition-colors flex items-center justify-between text-xs group"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-white group-hover:text-emerald-400">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {p.dataType} {p.defaultValue ? `(기본값: ${p.defaultValue})` : ''}
                          </span>
                        </div>
                        {alreadyExists ? (
                          <span className="text-[10px] text-neutral-500 font-medium">추가됨</span>
                        ) : (
                          <Plus className="w-3 h-3 text-neutral-400 group-hover:text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="도메인명, 타입 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#181818] border border-[#383838] focus:border-[#38bdf8] rounded-[2px] px-2.5 py-1 text-xs text-white placeholder:text-neutral-500 outline-none w-48 pl-7 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Domain Data Grid (Clean Table) */}
        <div className="flex-1 overflow-y-auto">
          {/* Table Header */}
          <div className="bg-[#1c1c1c] text-neutral-400 text-[11px] font-semibold border-b border-[#333333] flex items-center px-4 py-2 select-none sticky top-0 z-10">
            <div className="flex-1 min-w-0 pr-2">도메인 명칭 (Domain Name)</div>
            <div className="w-44 px-2">데이터 타입 (Data Type)</div>
            <div className="w-32 px-2">기본값 (Default)</div>
            <div className="w-14 text-center">동기화</div>
            <div className="w-10 text-center">삭제</div>
          </div>

          {/* Add New Row (Collapsible Inline Input) */}
          {isAddingNew && (
            <form
              onSubmit={handleAddNewSubmit}
              className="flex items-center px-4 py-2 bg-[#1b2b1d]/40 border-b border-[#2e5e34] gap-2 animate-in fade-in duration-100"
            >
              {/* Name */}
              <div className="flex-1 min-w-0">
                <input
                  ref={newNameInputRef}
                  type="text"
                  placeholder="도메인 명칭 입력 (예: 휴대폰번호, 금액, UUID)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewSubmit();
                    if (e.key === 'Escape') setIsAddingNew(false);
                  }}
                  className="w-full bg-[#161616] border border-[#2e5e34] focus:border-emerald-400 rounded-[2px] px-2 py-1 text-xs text-white outline-none"
                />
              </div>

              {/* Data Type */}
              <div className="w-44 relative" ref={newTypeRef}>
                <div className="flex items-center bg-[#161616] border border-[#2e5e34] rounded-[2px]">
                  <input
                    type="text"
                    value={newDataType}
                    onChange={(e) => setNewDataType(e.target.value)}
                    onFocus={() => setIsNewTypeDropdownOpen(true)}
                    className="w-full bg-transparent px-2 py-1 text-xs text-emerald-400 font-mono outline-none lowercase"
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewTypeDropdownOpen((v) => !v)}
                    className="p-1 text-neutral-400 hover:text-white"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {isNewTypeDropdownOpen && (
                  <div className="absolute left-0 top-8 z-50 bg-[#222] border border-[#444] rounded-[2px] shadow-2xl py-1 w-full max-h-48 overflow-y-auto">
                    {COMMON_DATA_TYPES.map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => {
                          setNewDataType(dt);
                          setIsNewTypeDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1 text-xs font-mono text-neutral-200 hover:bg-[#1b5e20] hover:text-white transition-colors"
                      >
                        {dt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Default Value */}
              <div className="w-32">
                <input
                  type="text"
                  placeholder="기본값 (옵션)"
                  value={newDefaultValue}
                  onChange={(e) => setNewDefaultValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewSubmit();
                  }}
                  className="w-full bg-[#161616] border border-[#2e5e34] focus:border-emerald-400 rounded-[2px] px-2 py-1 text-xs text-neutral-300 font-mono outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] font-medium text-xs transition-colors"
                >
                  등록
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-2 py-1 bg-[#333] hover:bg-[#444] text-neutral-300 rounded-[2px] text-xs transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          )}

          {/* Table Rows */}
          <div className="divide-y divide-[#303030]">
            {filteredDomains.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
                  <Bookmark className="w-4 h-4 opacity-70" />
                </div>
                <p className="text-xs text-neutral-400">
                  {searchQuery
                    ? `'${searchQuery}'에 일치하는 도메인이 없습니다.`
                    : '등록된 표준 도메인이 없습니다.'}
                </p>
                {!searchQuery && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setIsAddingNew(true)}
                      className="px-3 py-1 bg-[#1b5e20] hover:bg-[#257d2c] text-white rounded-[2px] font-medium text-xs transition-colors"
                    >
                      + 도메인 직접 추가
                    </button>
                    <button
                      onClick={() => setIsPresetMenuOpen(true)}
                      className="px-3 py-1 bg-[#303030] hover:bg-[#3a3a3a] text-neutral-200 rounded-[2px] border border-white/10 text-xs transition-colors font-medium"
                    >
                      표준 프리셋 가져오기
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredDomains.map((d) => (
                <div
                  key={d.id}
                  className="px-4 py-1.5 flex items-center hover:bg-white/[0.04] transition-colors group"
                >
                  {/* Domain Name (Inline Editable) */}
                  <div className="flex-1 min-w-0 pr-2">
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => onUpdateDomain?.(d.id, { name: e.target.value })}
                      className="bg-transparent text-white font-medium text-xs outline-none focus:bg-[#1a1a1a] px-2 py-1 rounded-[2px] border border-transparent focus:border-[#38bdf8] w-full truncate transition-colors"
                      title="클릭하여 도메인 이름 수정"
                    />
                  </div>

                  {/* Data Type (Inline Editable with Dropdown) */}
                  <div className="w-44 px-2 relative">
                    <div className="flex items-center rounded-[2px] border border-transparent focus-within:border-[#38bdf8] focus-within:bg-[#1a1a1a]">
                      <input
                        type="text"
                        value={d.dataType}
                        onChange={(e) => onUpdateDomain?.(d.id, { dataType: e.target.value })}
                        className="bg-transparent text-emerald-400 font-mono text-[11px] outline-none px-2 py-1 w-full lowercase"
                        title="클릭하여 직접 입력하거나 우측 화살표로 선택"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setActiveRowTypeDropdown(
                            activeRowTypeDropdown === d.id ? null : d.id
                          )
                        }
                        className="p-1 text-neutral-500 hover:text-white transition-colors shrink-0"
                        title="타입 선택"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Row Type Dropdown */}
                    {activeRowTypeDropdown === d.id && (
                      <div
                        ref={rowDropdownRef}
                        className="absolute left-2 top-8 z-50 bg-[#252525] border border-[#444] rounded-[3px] shadow-2xl py-1 w-36 max-h-48 overflow-y-auto backdrop-blur-xl animate-in fade-in duration-100"
                      >
                        {COMMON_DATA_TYPES.map((dt) => (
                          <button
                            key={dt}
                            type="button"
                            onClick={() => {
                              onUpdateDomain?.(d.id, { dataType: dt });
                              setActiveRowTypeDropdown(null);
                            }}
                            className="w-full text-left px-2.5 py-1 text-[11px] font-mono text-neutral-200 hover:bg-[#1b5e20] hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>{dt}</span>
                            {d.dataType.toLowerCase() === dt.toLowerCase() && (
                              <Check className="w-3 h-3 text-emerald-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Default Value (Inline Editable) */}
                  <div className="w-32 px-2">
                    <input
                      type="text"
                      placeholder="없음"
                      value={d.defaultValue || ''}
                      onChange={(e) =>
                        onUpdateDomain?.(d.id, { defaultValue: e.target.value })
                      }
                      className="bg-transparent text-neutral-300 font-mono text-[11px] outline-none focus:bg-[#1a1a1a] px-2 py-1 rounded-[2px] border border-transparent focus:border-[#38bdf8] w-full placeholder:text-neutral-600 transition-colors"
                      title="기본값 (Default Value)"
                    />
                  </div>

                  {/* Sync Button */}
                  <div className="w-14 text-center flex items-center justify-center">
                    <button
                      onClick={() => handleSync(d)}
                      className="px-2 py-1 bg-white/5 hover:bg-[#1b5e20] text-neutral-400 hover:text-white rounded-[2px] transition-colors flex items-center gap-1 text-[10px]"
                      title="이 도메인을 사용하는 전체 테이블 컬럼을 최신 타입/기본값으로 일괄 업데이트합니다"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">동기화</span>
                    </button>
                  </div>

                  {/* Delete Button */}
                  <div className="w-10 text-center flex items-center justify-center">
                    <button
                      onClick={() => onDeleteDomain(d.id)}
                      className="p-1 text-neutral-500 hover:text-rose-400 rounded-[2px] transition-colors opacity-40 group-hover:opacity-100"
                      title="도메인 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5. Footer */}
        <div className="px-4 py-2.5 bg-[#202020] border-t border-[#333333] flex items-center justify-between shrink-0 select-none">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span>등록된 도메인:</span>
            <span className="text-white font-bold">{domains.length}개</span>
            <span className="text-neutral-500 ml-2">
              (컬럼 설정 시 이 도메인들을 드롭다운에서 바로 선택할 수 있습니다)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-[#333333] hover:bg-[#404040] text-white rounded-[2px] transition-colors font-medium text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
