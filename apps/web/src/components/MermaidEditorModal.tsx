'use client';

import React, { useState, useEffect } from 'react';
import { DiagramModel, DiagramType } from '@/types/erd';
import { MermaidViewer } from './MermaidViewer';
import {
  X,
  Sparkles,
  Code2,
  Eye,
  Copy,
  Check,
  RotateCcw,
  Palette,
  Layers,
  FileCode2,
} from 'lucide-react';
import { DEFAULT_MERMAID_SEQUENCE, DEFAULT_MERMAID_FLOWCHART } from '@/collaboration/actions';

interface MermaidEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagram: DiagramModel | null;
  onSave: (updates: Partial<DiagramModel>) => void;
}

const TEMPLATES: { label: string; type: DiagramType; code: string }[] = [
  {
    label: '⚡ Supabase 인증 & Hive DB 동기화 (Sequence)',
    type: 'sequence',
    code: DEFAULT_MERMAID_SEQUENCE,
  },
  {
    label: '🔀 시스템 인증 & 데이터 흐름 (Flowchart)',
    type: 'flowchart',
    code: DEFAULT_MERMAID_FLOWCHART,
  },
  {
    label: '💳 주문 및 결제 라이프사이클 (State Diagram)',
    type: 'state',
    code: `stateDiagram-v2
    [*] --> 장바구니
    장바구니 --> 주문서작성: 주문하기
    주문서작성 --> 결제대기: 결제요청
    결제대기 --> 결제완료: PG승인 성공
    결제대기 --> 주문취소: 결제실패 / 시간초과
    결제완료 --> 배송준비중: 관리자 확인
    배송준비중 --> 배송중: 송장 등록
    배송중 --> 배송완료: 고객 수령
    배송완료 --> [*]
    주문취소 --> [*]`,
  },
  {
    label: '🏛️ 핵심 엔티티 구조 (Mermaid ERD)',
    type: 'er',
    code: `erDiagram
    USER ||--o{ ORDER : places
    USER {
        string id PK
        string email
        string name
        datetime created_at
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        string id PK
        string user_id FK
        string status
        numeric total_amount
    }
    ORDER_ITEM {
        string id PK
        string order_id FK
        string product_id FK
        int quantity
        numeric price
    }`,
  },
  {
    label: '📦 모듈 클래스 다이어그램 (Class Diagram)',
    type: 'class',
    code: `classDiagram
    class SupabaseAuth {
        +signInWithOAuth()
        +signOut()
        +getCurrentUser()
    }
    class SyncService {
        +syncOnAuthChange()
        +pullToLocalHive()
        +migrateToCloud()
    }
    class LocalHiveDB {
        +openBox()
        +clearAll()
        +saveData()
    }
    SupabaseAuth --> SyncService : triggers
    SyncService --> LocalHiveDB : manages`,
  },
];

export const MermaidEditorModal: React.FC<MermaidEditorModalProps> = ({
  isOpen,
  onClose,
  diagram,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [theme, setTheme] = useState<'dark' | 'forest' | 'neutral' | 'default'>('dark');
  const [diagramType, setDiagramType] = useState<DiagramType>('sequence');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (diagram) {
      setTitle(diagram.title || '새 다이어그램');
      setCode(diagram.code || DEFAULT_MERMAID_SEQUENCE);
      setTheme(diagram.theme || 'dark');
      setDiagramType(diagram.type || 'sequence');
    }
  }, [diagram, isOpen]);

  if (!isOpen || !diagram) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApplyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setCode(tpl.code);
    setDiagramType(tpl.type);
  };

  const handleSave = () => {
    onSave({
      title: title.trim() || '다이어그램',
      code,
      theme,
      type: diagramType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#1e1e1e] border border-white/15 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#252525] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="다이어그램 제목 입력"
                  className="bg-transparent text-sm sm:text-base font-bold text-white border-b border-transparent hover:border-white/20 focus:border-[#0c8ce9] outline-none px-1 py-0.5 transition-colors"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Mermaid 텍스트 문법으로 시퀀스 다이어그램, 플로우차트 등을 실시간 시각화합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Selector */}
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-white/10 text-xs">
              <Palette className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-transparent text-xs text-neutral-200 outline-none cursor-pointer"
              >
                <option value="dark" className="bg-[#242424]">다크 테마 (Dark)</option>
                <option value="default" className="bg-[#242424]">기본 테마 (Default)</option>
                <option value="forest" className="bg-[#242424]">포레스트 (Forest)</option>
                <option value="neutral" className="bg-[#242424]">뉴트럴 (Neutral)</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Template Bar */}
        <div className="px-5 py-2 bg-[#202020] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 템플릿:
          </span>
          {TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleApplyTemplate(tpl)}
              className="px-2.5 py-1 rounded-md text-xs bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all shrink-0 whitespace-nowrap active:scale-95"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Main Body (Split View) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 bg-[#161616]">
          {/* Left Column: Code Editor */}
          <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 min-h-0 bg-[#1a1a1a]">
            <div className="px-4 py-2 bg-[#222222] border-b border-white/10 flex items-center justify-between text-xs text-neutral-400 shrink-0">
              <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" /> Mermaid 소스 코드
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="코드 복사"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? '복사됨' : '복사'}</span>
              </button>
            </div>
            <div className="flex-1 p-3 min-h-0 overflow-auto">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                placeholder="Mermaid 문법을 입력하세요..."
                className="w-full h-full bg-transparent text-emerald-300 font-mono text-xs leading-relaxed resize-none outline-none focus:ring-0 border-none p-0 selection:bg-indigo-600/40"
              />
            </div>
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div className="flex flex-col min-h-0 bg-[#1e1e1e]">
            <div className="px-4 py-2 bg-[#222222] border-b border-white/10 flex items-center justify-between text-xs text-neutral-400 shrink-0">
              <span className="flex items-center gap-1.5 font-semibold text-neutral-300">
                <Eye className="w-3.5 h-3.5 text-emerald-400" /> 실시간 렌더링 미리보기
              </span>
              <span className="text-[10px] text-neutral-500">SVG 벡터 그래픽</span>
            </div>
            <div className="flex-1 p-4 min-h-0 overflow-auto flex items-center justify-center bg-[#151515]">
              <MermaidViewer code={code} theme={theme} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between bg-[#252525] shrink-0">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <span>💡 단축키: <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 font-mono text-[10px]">Enter</kbd> 로 저장</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0c8ce9] hover:bg-[#0a78c7] active:scale-95 shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>캔버스에 적용</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
