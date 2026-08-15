'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createERDDoc, ERDDocManager } from '@/collaboration/doc';
import {
  TableModel,
  RelationshipModel,
  NodeView,
  MemoModel,
  DomainItem,
  DisplayMode,
  ActiveTool,
} from '@/types/erd';
import { ERDCanvas } from '@/components/ERDCanvas';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';
import { BottomBar } from '@/components/BottomBar';
import { ExportModal } from '@/components/ExportModal';
import { DomainModal } from '@/components/DomainModal';
import { ValidationPanel } from '@/components/ValidationPanel';
import {
  addTableAction,
  addMemoAction,
  addRelationshipAction,
  updateProjectTitleAction,
  updateNodePositionAction,
} from '@/collaboration/actions';
import { validateSchema, ValidationIssue } from '@/validation/validator';

export default function Home() {
  const [manager, setManager] = useState<ERDDocManager | null>(null);
  const [tables, setTables] = useState<Record<string, TableModel>>({});
  const [relationships, setRelationships] = useState<Record<string, RelationshipModel>>({});
  const [nodes, setNodes] = useState<Record<string, NodeView>>({});
  const [memos, setMemos] = useState<Record<string, MemoModel>>({});
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>('My_Database_ERD');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('physical');

  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [isIdentifyingMode, setIsIdentifyingMode] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(true);

  const reactFlowInstanceRef = useRef<any>(null);

  // Initialize Yjs ERD Document Manager
  useEffect(() => {
    const docMgr = createERDDoc('erd-workspace-v1');
    setManager(docMgr);

    // Subscribe to Yjs updates
    const updateHandler = () => {
      const tObj: Record<string, TableModel> = {};
      docMgr.tablesMap.forEach((val, key) => {
        tObj[key] = val;
      });
      setTables(tObj);

      const rObj: Record<string, RelationshipModel> = {};
      docMgr.relationshipsMap.forEach((val, key) => {
        rObj[key] = val;
      });
      setRelationships(rObj);

      const nObj: Record<string, NodeView> = {};
      docMgr.nodesMap.forEach((val, key) => {
        nObj[key] = val;
      });
      setNodes(nObj);

      const mObj: Record<string, MemoModel> = {};
      docMgr.memosMap.forEach((val, key) => {
        mObj[key] = val;
      });
      setMemos(mObj);

      const dArr: DomainItem[] = [];
      docMgr.domainsMap.forEach((val) => {
        dArr.push(val);
      });
      setDomains(dArr);

      const title = docMgr.metaMap.get('title');
      if (title) setProjectTitle(title);
    };

    docMgr.doc.on('update', updateHandler);

    // Initial seed check after IndexedDB sync (avoid duplicated creation)
    const seedTimeout = setTimeout(() => {
      if (docMgr.tablesMap.size === 0) {
        const userTblId = addTableAction(docMgr, '회원', 'users', 120, 140, '#4f46e5');
        const orderTblId = addTableAction(docMgr, '주문', 'orders', 540, 140, '#0d9488');
        addRelationshipAction(docMgr, userTblId, orderTblId, 'non-identifying', 'one-to-many');
        addMemoAction(docMgr, '📌 ERD Cloud에 오신 것을 환영합니다!\n좌측 툴바에서 1:N 관계 도구를 선택하여\n테이블 간 관계를 쉽게 연결할 수 있습니다.', 540, 420);
      }
      updateHandler();
    }, 400);

    updateHandler();

    return () => {
      clearTimeout(seedTimeout);
      docMgr.doc.off('update', updateHandler);
      docMgr.provider?.destroy();
    };
  }, []);

  // Validation issues
  const schemaModel = useMemo(
    () => ({ tablesById: tables, relationshipsById: relationships }),
    [tables, relationships]
  );
  const issues: ValidationIssue[] = useMemo(() => validateSchema(schemaModel), [schemaModel]);

  // Actions
  const handleAddTable = useCallback(() => {
    if (!manager) return;
    const count = Object.keys(tables).length + 1;
    const colors = ['#4f46e5', '#2563eb', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];
    const chosenColor = colors[(count - 1) % colors.length];

    const posX = 150 + ((count * 40) % 400);
    const posY = 150 + ((count * 30) % 300);
    addTableAction(manager, `테이블_${count}`, `table_${count}`, posX, posY, chosenColor);
    setActiveTool('select');
  }, [manager, tables]);

  const handleAddMemo = useCallback(() => {
    if (!manager) return;
    const count = Object.keys(memos).length + 1;
    addMemoAction(manager, '새로운 메모 내용...', 200 + count * 30, 200 + count * 30);
    setActiveTool('select');
  }, [manager, memos]);

  const handleAutoLayout = useCallback(() => {
    if (!manager) return;
    const tableKeys = Object.keys(tables);
    const cols = 3;
    const gapX = 380;
    const gapY = 320;
    const startX = 80;
    const startY = 80;

    tableKeys.forEach((tId, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      updateNodePositionAction(manager, tId, startX + c * gapX, startY + r * gapY);
    });

    setTimeout(() => {
      reactFlowInstanceRef.current?.fitView({ duration: 500 });
    }, 100);
  }, [manager, tables]);

  const handleAddDomain = useCallback(
    (name: string, dataType: string) => {
      if (!manager) return;
      const id = `dom_${Date.now()}`;
      manager.doc.transact(() => {
        manager.domainsMap.set(id, { id, name, dataType });
      }, manager.doc.clientID);
    },
    [manager]
  );

  const handleDeleteDomain = useCallback(
    (id: string) => {
      if (!manager) return;
      manager.doc.transact(() => {
        manager.domainsMap.delete(id);
      }, manager.doc.clientID);
    },
    [manager]
  );

  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      if (!manager) return;
      setProjectTitle(newTitle);
      updateProjectTitleAction(manager, newTitle);
    },
    [manager]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 't' || e.key === 'T') {
        handleAddTable();
      } else if (e.key === 'm' || e.key === 'M') {
        handleAddMemo();
      } else if (e.key === 'Escape') {
        setActiveTool('select');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        manager?.undoManager.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        manager?.undoManager.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manager, handleAddTable, handleAddMemo]);

  if (!manager) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-400">ERD Studio 캔버스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 font-sans overflow-hidden select-none">
      {/* Top Toolbar */}
      <Toolbar
        projectTitle={projectTitle}
        onUpdateTitle={handleUpdateTitle}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        issues={issues}
        onToggleValidation={() => setIsValidationOpen((prev) => !prev)}
        onUndo={() => manager.undoManager.undo()}
        onRedo={() => manager.undoManager.redo()}
        isConnected={true}
      />

      {/* Center Layout: Sidebar + Canvas */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar Tools */}
        <Sidebar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isIdentifyingMode={isIdentifyingMode}
          setIsIdentifyingMode={setIsIdentifyingMode}
          onAddTable={handleAddTable}
          onAddMemo={handleAddMemo}
          onAutoLayout={handleAutoLayout}
          onZoomIn={() => reactFlowInstanceRef.current?.zoomIn({ duration: 300 })}
          onZoomOut={() => reactFlowInstanceRef.current?.zoomOut({ duration: 300 })}
          onFitView={() => reactFlowInstanceRef.current?.fitView({ duration: 500 })}
        />

        {/* Main Canvas Area */}
        <main className="flex-1 relative">
          <ERDCanvas
            manager={manager}
            tables={tables}
            relationships={relationships}
            nodes={nodes}
            memos={memos}
            displayMode={displayMode}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isIdentifyingMode={isIdentifyingMode}
            isMiniMapOpen={isMiniMapOpen}
            reactFlowInstanceRef={reactFlowInstanceRef}
          />

          {/* Floating Validation Panel */}
          <ValidationPanel
            isOpen={isValidationOpen}
            onClose={() => setIsValidationOpen(false)}
            issues={issues}
          />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <BottomBar
        onOpenDomain={() => setIsDomainOpen(true)}
        onOpenImport={() => setIsExportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        isMiniMapOpen={isMiniMapOpen}
        setIsMiniMapOpen={setIsMiniMapOpen}
        userCount={1}
      />

      {/* Export Modal (DDL / PNG / JSON) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        schema={schemaModel}
        projectTitle={projectTitle}
      />

      {/* Domain Modal */}
      <DomainModal
        isOpen={isDomainOpen}
        onClose={() => setIsDomainOpen(false)}
        domains={domains}
        onAddDomain={handleAddDomain}
        onDeleteDomain={handleDeleteDomain}
      />
    </div>
  );
}
