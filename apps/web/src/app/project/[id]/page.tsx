'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockStore } from '@/lib/supabase/mockStore';
import { Project, ProjectRole } from '@/lib/supabase/types';
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
import { BottomBar, OnlineUserInfo } from '@/components/BottomBar';
import { ExportModal } from '@/components/ExportModal';
import { DomainModal } from '@/components/DomainModal';
import { ValidationPanel } from '@/components/ValidationPanel';
import { ShareModal } from '@/components/ShareModal';
import { CanvasInspector, CanvasSettings } from '@/components/CanvasInspector';
import {
  addTableAction,
  addMemoAction,
  addRelationshipAction,
  updateProjectTitleAction,
  updateNodePositionAction,
} from '@/collaboration/actions';
import { validateSchema, ValidationIssue } from '@/validation/validator';
import { Database } from 'lucide-react';

export default function ProjectEditorPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [myRole, setMyRole] = useState<ProjectRole>('editor');
  const [manager, setManager] = useState<ERDDocManager | null>(null);
  const [tables, setTables] = useState<Record<string, TableModel>>({});
  const [relationships, setRelationships] = useState<Record<string, RelationshipModel>>({});
  const [nodes, setNodes] = useState<Record<string, NodeView>>({});
  const [memos, setMemos] = useState<Record<string, MemoModel>>({});
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [projectTitle, setProjectTitle] = useState('프로젝트 ERD');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('physical');

  // Canvas Inspector & Background Settings
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    backgroundColor: '#1e1e1e', // Figma Dark Default
    gridType: 'dots',
    gridColor: 'rgba(255, 255, 255, 0.12)',
    zoomLabelScale: 1.45,
    showZoomLabels: true,
  });


  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [isIdentifyingMode, setIsIdentifyingMode] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(false);

  const reactFlowInstanceRef = useRef<any>(null);

  // 1. Check Auth & Load Project
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }

    if (user && projectId) {
      const fetchProjectData = async () => {
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: projData, error: projErr } = await supabase
              .from('projects')
              .select('*')
              .eq('id', projectId)
              .single();

            if (projData && !projErr) {
              setProject(projData);
              setProjectTitle(projData.name);

              const { data: memberData } = await supabase
                .from('project_members')
                .select('role')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .maybeSingle();

              const role = memberData?.role || (projData.owner_id === user.id ? 'owner' : 'editor');
              setMyRole(role as ProjectRole);
              return;
            }
          } catch (err: any) {
            console.warn('Failed to load project from Supabase, using mock store:', err.message);
          }
        }

        // Mock Store Fallback
        const proj = mockStore.getProjectById(projectId);
        if (proj) {
          setProject(proj);
          setProjectTitle(proj.name);
          const members = mockStore.getMembers(projectId);
          const currentMember = members.find((m) => m.user_id === user.id);
          const role = currentMember?.role || (proj.owner_id === user.id ? 'owner' : 'editor');
          setMyRole(role);
        }
      };

      fetchProjectData();
    }
  }, [user, authLoading, projectId, router]);

  // 2. Initialize Yjs ERD Document Manager with Room ID and Role
  useEffect(() => {
    if (!project || !user) return;

    const isReadOnly = myRole === 'viewer';
    const docMgr = createERDDoc({
      roomName: project.room_id || `erd-proj-${project.id}`,
      user,
      readOnly: isReadOnly,
    });
    setManager(docMgr);

    // Sync state from Yjs maps
    const syncFromYjs = () => {
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

      const savedBg = docMgr.metaMap.get('canvasBg');
      const savedGrid = docMgr.metaMap.get('canvasGrid');
      const savedZoomScale = docMgr.metaMap.get('canvasZoomScale');
      if (savedBg || savedGrid || savedZoomScale !== undefined) {
        setCanvasSettings((prev) => ({
          ...prev,
          backgroundColor: savedBg || prev.backgroundColor,
          gridType: (savedGrid as any) || prev.gridType,
          zoomLabelScale: typeof savedZoomScale === 'number' ? savedZoomScale : prev.zoomLabelScale,
        }));
      }

    };

    docMgr.doc.on('update', syncFromYjs);

    // Live Online Users Tracking via Awareness
    const updateOnlineUsers = () => {
      if (docMgr.provider?.awareness) {
        const states = docMgr.provider.awareness.getStates();
        const myClientId = docMgr.provider.awareness.clientID;
        const list: OnlineUserInfo[] = [];

        states.forEach((state: any, clientId: number) => {
          if (state.user) {
            list.push({
              clientId,
              user: state.user,
              isSelf: clientId === myClientId,
            });
          }
        });

        setOnlineUsers(list);
      }
    };

    if (docMgr.provider?.awareness) {
      docMgr.provider.awareness.on('change', updateOnlineUsers);
      updateOnlineUsers();
    }

    // Initial seed check after IndexedDB sync (avoid duplicated creation)
    const seedTimeout = setTimeout(() => {
      if (docMgr.tablesMap.size === 0 && myRole !== 'viewer') {
        const userTblId = addTableAction(docMgr, '회원', 'users', 120, 140, '#0c8ce9');
        const orderTblId = addTableAction(docMgr, '주문', 'orders', 540, 140, '#10b981');
        addRelationshipAction(docMgr, userTblId, orderTblId, 'non-identifying', 'one-to-many');
        addMemoAction(
          docMgr,
          '📌 NookLabs ERD Studio\n좌측 툴바에서 1:N 관계 도구를 선택하여\n테이블 간 관계를 쉽게 연결할 수 있습니다.',
          540,
          420
        );
      }
      syncFromYjs();
    }, 400);

    syncFromYjs();

    return () => {
      clearTimeout(seedTimeout);
      docMgr.doc.off('update', syncFromYjs);
      docMgr.provider?.destroy();
    };
  }, [project, user, myRole]);

  // Validation issues
  const schemaModel = useMemo(
    () => ({ tablesById: tables, relationshipsById: relationships }),
    [tables, relationships]
  );
  const issues: ValidationIssue[] = useMemo(() => validateSchema(schemaModel), [schemaModel]);

  const isReadOnly = myRole === 'viewer';

  // Handle Canvas Settings Update & Yjs Broadcast
  const handleUpdateCanvasSettings = useCallback(
    (updates: Partial<CanvasSettings>) => {
      setCanvasSettings((prev) => {
        const next = { ...prev, ...updates };
        if (manager && !isReadOnly) {
          manager.doc.transact(() => {
            if (updates.backgroundColor) {
              manager.metaMap.set('canvasBg', updates.backgroundColor);
            }
            if (updates.gridType) {
              manager.metaMap.set('canvasGrid', updates.gridType);
            }
            if (updates.zoomLabelScale !== undefined) {
              manager.metaMap.set('canvasZoomScale', updates.zoomLabelScale);
            }
          }, manager.doc.clientID);
        }
        return next;
      });
    },
    [manager, isReadOnly]
  );


  // Actions
  const handleAddTable = useCallback(() => {
    if (!manager || isReadOnly) return;
    const count = Object.keys(tables).length + 1;
    const colors = ['#0c8ce9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const chosenColor = colors[(count - 1) % colors.length];

    const posX = 150 + ((count * 40) % 400);
    const posY = 150 + ((count * 30) % 300);
    addTableAction(manager, `테이블_${count}`, `table_${count}`, posX, posY, chosenColor);
    setActiveTool('select');
  }, [manager, tables, isReadOnly]);

  const handleAddMemo = useCallback(() => {
    if (!manager || isReadOnly) return;
    const count = Object.keys(memos).length + 1;
    addMemoAction(manager, '새로운 메모 내용...', 200 + count * 30, 200 + count * 30);
    setActiveTool('select');
  }, [manager, memos, isReadOnly]);

  const handleAutoLayout = useCallback(() => {
    if (!manager || isReadOnly) return;
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
  }, [manager, tables, isReadOnly]);

  const handleAddDomain = useCallback(
    (name: string, dataType: string) => {
      if (!manager || isReadOnly) return;
      const id = `dom_${Date.now()}`;
      manager.doc.transact(() => {
        manager.domainsMap.set(id, { id, name, dataType });
      }, manager.doc.clientID);
    },
    [manager, isReadOnly]
  );

  const handleDeleteDomain = useCallback(
    (id: string) => {
      if (!manager || isReadOnly) return;
      manager.doc.transact(() => {
        manager.domainsMap.delete(id);
      }, manager.doc.clientID);
    },
    [manager, isReadOnly]
  );

  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      if (!manager || isReadOnly) return;
      setProjectTitle(newTitle);
      updateProjectTitleAction(manager, newTitle);
    },
    [manager, isReadOnly]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if ((e.key === 't' || e.key === 'T') && !isReadOnly) {
        handleAddTable();
      } else if ((e.key === 'm' || e.key === 'M') && !isReadOnly) {
        handleAddMemo();
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setIsInspectorOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isReadOnly) {
        e.preventDefault();
        manager?.undoManager.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z')) && !isReadOnly) {
        e.preventDefault();
        manager?.undoManager.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manager, handleAddTable, handleAddMemo, isReadOnly]);

  if (!manager || !project || !user) {
    return (
      <div className="w-screen h-screen bg-[#1e1e1e] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0c8ce9] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-neutral-400">ERD Studio 캔버스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-[#1e1e1e] font-sans overflow-hidden select-none">
      {/* Top Toolbar (Figma Style) */}
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
        userRole={myRole}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        memberCount={mockStore.getMembers(project.id).length}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
      />

      {/* Center Layout: Sidebar + Canvas + Inspector */}
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
        <main className="flex-1 relative flex">
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
            canvasSettings={canvasSettings}
          />

          {/* Figma Right Inspector Panel (Page Background, Grid, Schema Stats) */}
          <CanvasInspector
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            settings={canvasSettings}
            onUpdateSettings={handleUpdateCanvasSettings}
            tableCount={Object.keys(tables).length}
            relationshipCount={Object.keys(relationships).length}
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenDomain={() => setIsDomainOpen(true)}
          />

          {/* Read Only Watermark Notice for Viewer */}
          {isReadOnly && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1e1e1e]/90 border border-white/20 px-3.5 py-1 rounded-full backdrop-blur-md shadow-xl flex items-center gap-2 text-xs text-neutral-300 pointer-events-none z-20 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>현재 <strong>Viewer(읽기 전용)</strong> 권한으로 열람 중입니다.</span>
            </div>
          )}

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
        onlineUsers={onlineUsers}
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

      {/* Share / Member Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
        currentUser={user}
        myRole={myRole}
      />
    </div>
  );
}

