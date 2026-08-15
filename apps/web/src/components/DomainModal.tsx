'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DomainItem } from '@/types/erd';
import {
  X,
  Plus,
  Trash2,
  Tag,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronDown,
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
  'uuid',
  'text',
  'enum',
  'varchar(255)',
  'varchar(50)',
  'int',
  'bigint',
  'timestamptz',
  'boolean',
  'double_precision',
  'integer[]',
  'decimal(18,2)',
  'date',
  'json',
];

const DEFAULT_PRESETS = [
  { name: '이메일 (email)', dataType: 'varchar(255)', defaultValue: '' },
  { name: '휴대폰번호 (phone)', dataType: 'varchar(20)', defaultValue: '' },
  { name: '생성일시 (created_at)', dataType: 'timestamptz', defaultValue: 'now()' },
  { name: '고유식별자 (uuid)', dataType: 'uuid', defaultValue: 'gen_random_uuid()' },
  { name: '여부 플래그 (is_active)', dataType: 'boolean', defaultValue: 'true' },
  { name: '상태 (status)', dataType: 'enum', defaultValue: 'active' },
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
  const [showAddForm, setShowAddForm] = useState(true);
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('varchar(255)');
  const [defaultValue, setDefaultValue] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Dropdown states
  const [isAddTypeDropdownOpen, setIsAddTypeDropdownOpen] = useState(false);
  const [activeRowTypeDropdown, setActiveRowTypeDropdown] = useState<string | null>(null);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const rowDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    if (!isAddTypeDropdownOpen && !activeRowTypeDropdown) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (
        addDropdownRef.current &&
        !addDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAddTypeDropdownOpen(false);
      }
      if (
        rowDropdownRef.current &&
        !rowDropdownRef.current.contains(e.target as Node)
      ) {
        setActiveRowTypeDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddTypeDropdownOpen(false);
        setActiveRowTypeDropdown(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddTypeDropdownOpen, activeRowTypeDropdown]);

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dataType.trim()) return;
    onAddDomain(name.trim(), dataType.trim(), defaultValue.trim());
    setName('');
    setDefaultValue('');
    setIsAddTypeDropdownOpen(false);
  };

  const handleSync = (domain: DomainItem) => {
    if (onSyncDomain) {
      const count = onSyncDomain(domain);
      setSyncFeedback(`'${domain.name}' 도메인 ${count}개 컬럼 동기화 완료!`);
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-[#18201a] border border-emerald-500/30 rounded-xl w-[720px] max-w-[95vw] shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden font-sans text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Top Header Strip (ERD Cloud Style) */}
        <div className="px-4 py-2.5 bg-[#121a14] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              DOMAIN <span className="text-[11px] text-emerald-400 font-normal">도메인 관리</span>
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="ml-1 p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-0.5 transition-colors shadow-sm"
              title="새 도메인 추가"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Search Box & Close */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search domain"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/40 border border-white/[0.12] rounded px-2.5 py-1 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-emerald-500 w-44 pl-7 shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 pointer-events-none" />
            </div>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-1.5 flex items-center gap-2 text-emerald-300 text-[11px] font-medium animate-in fade-in slide-in-from-top-1 duration-150">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {syncFeedback}
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Add New Form (Collapsible or toggle) */}
          {showAddForm && (
            <form onSubmit={handleAdd} className="p-3 bg-black/40 border border-emerald-500/30 rounded-lg space-y-2 animate-in fade-in duration-100">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-between">
                <span>신규 도메인 생성</span>
                <span className="text-[10px] text-neutral-400 font-normal">타입은 드롭다운 선택 또는 직접 입력 가능</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="도메인명 (예: h12, h24 또는 이메일)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-[#101712] border border-white/[0.1] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500 shadow-inner"
                />

                {/* Type Input with Dropdown */}
                <div className="relative w-44 shrink-0" ref={addDropdownRef}>
                  <div className="flex items-center bg-[#101712] border border-white/[0.1] rounded focus-within:border-emerald-500 shadow-inner">
                    <input
                      type="text"
                      placeholder="데이터 타입"
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value)}
                      onFocus={() => setIsAddTypeDropdownOpen(true)}
                      className="w-full bg-transparent px-2.5 py-1.5 text-xs text-emerald-300 font-mono outline-none lowercase"
                    />
                    <button
                      type="button"
                      onClick={() => setIsAddTypeDropdownOpen(!isAddTypeDropdownOpen)}
                      className="p-1.5 text-neutral-400 hover:text-emerald-300 transition-colors"
                      title="타입 목록 열기"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {isAddTypeDropdownOpen && (
                    <div className="absolute left-0 top-9 z-50 bg-[#162219] border border-emerald-500/40 rounded-lg shadow-2xl py-1 w-full max-h-52 overflow-y-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-2.5 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-wider border-b border-white/10 mb-1">
                        자주 쓰는 타입 선택
                      </div>
                      {COMMON_DATA_TYPES.map((dt) => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => {
                            setDataType(dt);
                            setIsAddTypeDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1 text-[11px] font-mono text-neutral-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-between"
                        >
                          <span>{dt}</span>
                          {dataType.toLowerCase() === dt.toLowerCase() && (
                            <span className="text-[10px] text-emerald-300">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="기본값 (예: h24, now())"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  className="w-32 bg-[#101712] border border-white/[0.1] rounded px-2.5 py-1.5 text-xs text-amber-200 font-mono outline-none focus:border-emerald-500 shadow-inner"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1 font-medium transition-colors text-xs shrink-0 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> 등록
                </button>
              </div>
            </form>
          )}

          {/* Quick Presets */}
          <div>
            <div className="text-[10.5px] font-bold text-emerald-400/80 mb-1.5 uppercase tracking-wider">
              표준 도메인 프리셋 (클릭하여 추가)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onAddDomain(p.name, p.dataType, p.defaultValue)}
                  className="px-2 py-0.5 bg-black/30 border border-emerald-900/40 hover:border-emerald-500/70 rounded text-[10.5px] text-neutral-300 hover:text-white transition-colors"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* ERD Cloud Style Domain Grid Table */}
          <div className="border border-white/[0.08] rounded-lg overflow-hidden shadow-inner bg-black/30">
            {/* Table Header (Matching User Screenshot) */}
            <div className="bg-[#142318] px-3 py-1.5 text-[10px] text-emerald-300 font-mono font-bold border-b border-white/[0.08] flex items-center tracking-tight select-none">
              <div className="flex-1 min-w-0 px-1">DOMAIN NAME</div>
              <div className="w-40 px-1">TYPE</div>
              <div className="w-32 px-1">DEFAULT VALUE</div>
              <div className="w-10 text-center" title="해당 도메인을 사용하는 모든 테이블 컬럼 동기화">🔄</div>
              <div className="w-8 text-center">삭제</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto">
              {filteredDomains.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  {searchQuery ? '검색 결과가 없습니다.' : '등록된 도메인이 없습니다. 상단 + 버튼이나 프리셋을 추가해보세요.'}
                </div>
              ) : (
                filteredDomains.map((d) => (
                  <div
                    key={d.id}
                    className="px-3 py-1 flex items-center hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Domain Name (Inline Editable) */}
                    <div className="flex-1 min-w-0 px-1">
                      <input
                        type="text"
                        value={d.name}
                        onChange={(e) => onUpdateDomain?.(d.id, { name: e.target.value })}
                        className="bg-transparent text-white font-medium text-xs outline-none focus:bg-black/50 px-1.5 py-0.5 rounded border border-transparent focus:border-emerald-500 w-full truncate"
                      />
                    </div>

                    {/* Data Type (Inline Editable with Dropdown) */}
                    <div className="w-40 px-1 relative">
                      <div className="flex items-center rounded border border-transparent focus-within:border-emerald-500 focus-within:bg-black/50">
                        <input
                          type="text"
                          value={d.dataType}
                          onChange={(e) => onUpdateDomain?.(d.id, { dataType: e.target.value })}
                          className="bg-transparent text-emerald-400 font-mono text-[11px] outline-none px-1.5 py-0.5 w-full lowercase"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setActiveRowTypeDropdown(activeRowTypeDropdown === d.id ? null : d.id)
                          }
                          className="p-1 text-neutral-500 hover:text-emerald-300 transition-colors shrink-0"
                          title="타입 선택"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Row Type Dropdown */}
                      {activeRowTypeDropdown === d.id && (
                        <div
                          ref={rowDropdownRef}
                          className="absolute left-0 top-7 z-50 bg-[#162219] border border-emerald-500/40 rounded-lg shadow-2xl py-1 w-36 max-h-48 overflow-y-auto backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                        >
                          {COMMON_DATA_TYPES.map((dt) => (
                            <button
                              key={dt}
                              type="button"
                              onClick={() => {
                                onUpdateDomain?.(d.id, { dataType: dt });
                                setActiveRowTypeDropdown(null);
                              }}
                              className="w-full text-left px-2.5 py-1 text-[11px] font-mono text-neutral-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-between"
                            >
                              <span>{dt}</span>
                              {d.dataType.toLowerCase() === dt.toLowerCase() && (
                                <span className="text-[10px] text-emerald-300">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Default Value (Inline Editable) */}
                    <div className="w-32 px-1">
                      <input
                        type="text"
                        placeholder="null"
                        value={d.defaultValue || ''}
                        onChange={(e) => onUpdateDomain?.(d.id, { defaultValue: e.target.value })}
                        className="bg-transparent text-amber-200/90 font-mono text-[11px] outline-none focus:bg-black/50 px-1.5 py-0.5 rounded border border-transparent focus:border-emerald-500 w-full placeholder:text-neutral-600"
                      />
                    </div>

                    {/* Sync Button (🔄) */}
                    <div className="w-10 text-center flex items-center justify-center">
                      <button
                        onClick={() => handleSync(d)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded transition-all"
                        title="이 도메인을 사용하는 전체 테이블 컬럼 일괄 동기화 (Cascade Sync)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Button */}
                    <div className="w-8 text-center flex items-center justify-center">
                      <button
                        onClick={() => onDeleteDomain(d.id)}
                        className="p-1 text-neutral-500 hover:text-rose-400 rounded transition-colors opacity-60 group-hover:opacity-100"
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
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#121a14] border-t border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-neutral-400">
            총 <span className="text-emerald-400 font-bold">{domains.length}</span>개 도메인 등록됨
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded transition-colors font-medium text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};


