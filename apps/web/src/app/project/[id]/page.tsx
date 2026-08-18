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
  ProjectVersion,
} from '@/types/erd';
import { ERDCanvas } from '@/components/ERDCanvas';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';
import { BottomBar, OnlineUserInfo } from '@/components/BottomBar';
import { ExportModal } from '@/components/ExportModal';
import { ImportModal } from '@/components/ImportModal';
import { DomainModal } from '@/components/DomainModal';
import { ValidationPanel } from '@/components/ValidationPanel';
import { ShareModal } from '@/components/ShareModal';
import { CanvasInspector, CanvasSettings } from '@/components/CanvasInspector';
import { EntityListPanel } from '@/components/EntityListPanel';
import { VersionHistoryPanel } from '@/components/VersionHistoryPanel';
import {
  addTableAction,
  deleteTableAction,
  addMemoAction,
  addRelationshipAction,
  updateProjectTitleAction,
  updateNodePositionAction,
  addDomainAction,
  updateDomainAction,
  deleteDomainAction,
  syncDomainColumnsAction,
} from '@/collaboration/actions';
import {
  captureCurrentSnapshot,
  restoreVersionSnapshotAction,
} from '@/collaboration/versionActions';
import { validateSchema, ValidationIssue } from '@/validation/validator';
import { Database, Loader2 } from 'lucide-react';

export default function ProjectEditorPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [myRole, setMyRole] = useState<ProjectRole>('editor');
  const [manager, setManager] = useState<ERDDocManager | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMiniMapOpen, setIsMiniMapOpen] = useState(false);
  const [isEntityListOpen, setIsEntityListOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  const reactFlowInstanceRef = useRef<any>(null);

  // Load version history
  const loadVersions = useCallback(() => {
    if (!projectId) return;
    const vList = mockStore.getVersions(projectId);
    setVersions(vList);
  }, [projectId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreateVersion = (name: string, description?: string) => {
    if (!manager || !projectId || !user) return;
    const snapshot = captureCurrentSnapshot(manager, projectTitle);
    const creatorName = user.display_name || user.email || '사용자';
    mockStore.createVersion(
      projectId,
      name,
      snapshot,
      user.id,
      creatorName,
      description,
      false
    );
    loadVersions();
  };

  const handleRestoreVersion = (ver: ProjectVersion) => {
    if (!manager || !ver.snapshot) return;
    restoreVersionSnapshotAction(manager, ver.snapshot);
    if (ver.snapshot.projectTitle) {
      setProjectTitle(ver.snapshot.projectTitle);
    }
  };

  const handleDeleteVersion = (versionId: string) => {
    mockStore.deleteVersion(versionId);
    loadVersions();
  };

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
    const roomName = project.room_id || `erd-proj-${project.id}`;

    const docMgr = createERDDoc({
      roomName,
      user,
      readOnly: isReadOnly,
    });
    setManager(docMgr);
    setIsSynced(false);

    // Sync state from Yjs maps safely with micro-batching
    let syncRafId: number | null = null;

    const syncFromYjs = () => {
      if (syncRafId) cancelAnimationFrame(syncRafId);
      syncRafId = requestAnimationFrame(() => {
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
      });
    };

    docMgr.doc.on('update', syncFromYjs);

    // Safe Single-Seed Handler (Only executed once per document life-cycle via metaMap flag)
    const checkAndSeedInitialData = () => {
      setIsSynced(true);
      syncFromYjs();

      const isInitialized = docMgr.metaMap.get('is_initialized');
      if (!isInitialized && docMgr.tablesMap.size === 0 && myRole !== 'viewer') {
        docMgr.doc.transact(() => {
          docMgr.metaMap.set('is_initialized', true);
          const userTblId = addTableAction(docMgr, '회원', 'users', 120, 140, '#0c8ce9');
          const orderTblId = addTableAction(docMgr, '주문', 'orders', 540, 140, '#10b981');
          addRelationshipAction(docMgr, userTblId, orderTblId, 'non-identifying', 'one-to-many');
          addMemoAction(
            docMgr,
            '📌 NookLabs ERD Studio\n좌측 툴바에서 1:N 관계 도구를 선택하여\n테이블 간 관계를 쉽게 연결할 수 있습니다.',
            540,
            420
          );
        }, docMgr.doc.clientID);
      }
    };

    // Listen to Hocuspocus and IndexedDB sync events
    if (docMgr.provider) {
      docMgr.provider.on('synced', (syncedData: any) => {
        const syncedState = typeof syncedData === 'boolean' ? syncedData : syncedData?.state;
        if (syncedState) {
          checkAndSeedInitialData();
        }
      });

      docMgr.provider.on('status', ({ status }: { status: string }) => {
        setIsWsConnected(status === 'connected');
      });
    }

    if (docMgr.persistence) {
      docMgr.persistence.on('synced', () => {
        setIsSynced(true);
        syncFromYjs();
      });
    }

    // Safety fallback timeout to release loading indicator
    const fallbackTimer = setTimeout(() => {
      setIsSynced(true);
      syncFromYjs();
    }, 1200);

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

    syncFromYjs();

    return () => {
      clearTimeout(fallbackTimer);
      docMgr.doc.off('update', syncFromYjs);
      docMgr.provider?.destroy();
      docMgr.persistence?.destroy();
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

  // Auto Layout Handler
  const handleAutoLayout = useCallback(() => {
    if (!manager || isReadOnly) return;
    const tableKeys = Object.keys(tables);
    const cols = Math.ceil(Math.sqrt(tableKeys.length || 1));
    const spacingX = 420;
    const spacingY = 320;

    manager.doc.transact(() => {
      tableKeys.forEach((tblId, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = 100 + col * spacingX;
        const y = 100 + row * spacingY;
        updateNodePositionAction(manager, tblId, x, y);
      });
    }, manager.doc.clientID);
  }, [manager, tables, isReadOnly]);

  // ERD Operations
  const handleAddTable = useCallback(
    (x?: number, y?: number) => {
      if (!manager || isReadOnly) return;
      const posX = x ?? 100 + Math.random() * 200;
      const posY = y ?? 100 + Math.random() * 200;
      addTableAction(manager, '새 테이블', 'new_table', posX, posY);
    },
    [manager, isReadOnly]
  );

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      if (!manager || isReadOnly) return;
      deleteTableAction(manager, tableId);
    },
    [manager, isReadOnly]
  );

  const handleAddMemo = useCallback(
    (x?: number, y?: number) => {
      if (!manager || isReadOnly) return;
      const posX = x ?? 200 + Math.random() * 100;
      const posY = y ?? 200 + Math.random() * 100;
      addMemoAction(manager, '새 메모', posX, posY);
    },
    [manager, isReadOnly]
  );

  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      setProjectTitle(newTitle);
      if (manager && !isReadOnly) {
        updateProjectTitleAction(manager, newTitle);
      }
      if (isSupabaseConfigured && supabase && project) {
        supabase.from('projects').update({ name: newTitle }).eq('id', project.id).then();
      }
    },
    [manager, project, isReadOnly]
  );

  // Zoom / FitView helpers via ReactFlow ref
  const handleZoomIn = useCallback(() => {
    reactFlowInstanceRef.current?.zoomIn?.({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    reactFlowInstanceRef.current?.zoomOut?.({ duration: 300 });
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowInstanceRef.current?.fitView?.({ duration: 400, padding: 0.2 });
  }, []);

  // Domain Handlers
  const handleAddDomain = useCallback(
    (name: string, dataType: string, defaultValue?: string) => {
      if (!manager || isReadOnly) return;
      addDomainAction(manager, name, dataType, defaultValue);
    },
    [manager, isReadOnly]
  );

  const handleUpdateDomain = useCallback(
    (id: string, updates: Partial<DomainItem>) => {
      if (!manager || isReadOnly) return;
      updateDomainAction(manager, id, updates);
    },
    [manager, isReadOnly]
  );

  const handleDeleteDomain = useCallback(
    (id: string) => {
      if (!manager || isReadOnly) return;
      deleteDomainAction(manager, id);
    },
    [manager, isReadOnly]
  );

  const handleSyncDomain = useCallback(
    (domain: DomainItem) => {
      if (!manager || isReadOnly) return 0;
      return syncDomainColumnsAction(manager, domain);
    },
    [manager, isReadOnly]
  );

  if (authLoading || !project) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#121212] text-white flex-col gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-neutral-400 font-medium tracking-wide">프로젝트 워크스페이스를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#121212] text-white overflow-hidden select-none">
      {/* Top Toolbar */}
      <Toolbar
        projectTitle={projectTitle}
        onUpdateTitle={handleUpdateTitle}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        issues={issues}
        onToggleValidation={() => setIsValidationOpen((prev) => !prev)}
        onUndo={() => manager?.undoManager.undo()}
        onRedo={() => manager?.undoManager.redo()}
        isConnected={isWsConnected}
        userRole={myRole}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        memberCount={onlineUsers.length || 1}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleEntityList={() => setIsEntityListOpen((prev) => !prev)}
        isEntityListOpen={isEntityListOpen}
        onToggleVersionHistory={() => setIsVersionHistoryOpen((prev) => !prev)}
        isVersionHistoryOpen={isVersionHistoryOpen}
        versionCount={versions.length}
        tableCount={Object.keys(tables).length}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Floating Sidebar Tool Palette */}
        <Sidebar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isIdentifyingMode={isIdentifyingMode}
          setIsIdentifyingMode={setIsIdentifyingMode}
          onAddTable={() => handleAddTable()}
          onAddMemo={() => handleAddMemo()}
          onAutoLayout={handleAutoLayout}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onToggleEntityList={() => setIsEntityListOpen((prev) => !prev)}
          isEntityListOpen={isEntityListOpen}
        />

        {/* ERD Canvas Area */}
        <main className="flex-1 relative h-full w-full bg-[#1e1e1e] overflow-hidden">
          {/* Sync Loading Overlay */}
          {!isSynced && (
            <div className="absolute inset-0 bg-[#121212]/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <p className="text-xs text-neutral-300 font-medium">실시간 협업 데이터를 동기화하는 중...</p>
            </div>
          )}

          {manager && (
            <ERDCanvas
              manager={manager}
              tables={tables}
              relationships={relationships}
              nodes={nodes}
              memos={memos}
              domains={domains}
              displayMode={displayMode}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              isIdentifyingMode={isIdentifyingMode}
              isMiniMapOpen={isMiniMapOpen}
              reactFlowInstanceRef={reactFlowInstanceRef}
              canvasSettings={canvasSettings}
            />
          )}

          {/* Left Sliding Entity List Panel */}
          <EntityListPanel
            isOpen={isEntityListOpen}
            onClose={() => setIsEntityListOpen(false)}
            tables={tables}
            nodes={nodes}
            onFocusTable={(tableId) => {
              const node = nodes[tableId];
              if (node && reactFlowInstanceRef.current) {
                reactFlowInstanceRef.current.setCenter(
                  node.position.x + (node.position.width || 300) / 2,
                  node.position.y + (node.position.height || 200) / 2,
                  { zoom: 1.2, duration: 600 }
                );
              }
            }}
            onDeleteTable={handleDeleteTable}
            onAddTable={() => handleAddTable()}
            isReadOnly={isReadOnly}
          />

          {/* Version History Drawer Panel */}
          <VersionHistoryPanel
            isOpen={isVersionHistoryOpen}
            onClose={() => setIsVersionHistoryOpen(false)}
            versions={versions}
            onCreateVersion={handleCreateVersion}
            onRestoreVersion={handleRestoreVersion}
            onDeleteVersion={handleDeleteVersion}
            currentTableCount={Object.keys(tables).length}
            currentRelationshipCount={Object.keys(relationships).length}
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
            onOpenImport={() => setIsImportOpen(true)}
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
        onOpenImport={() => setIsImportOpen(true)}
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
        nodes={nodes}
        memos={memos}
        domains={domains}
      />

      {/* Import Modal (JSON Restore / Merge) */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        manager={manager}
      />

      {/* Domain Modal */}
      <DomainModal
        isOpen={isDomainOpen}
        onClose={() => setIsDomainOpen(false)}
        domains={domains}
        onAddDomain={handleAddDomain}
        onUpdateDomain={handleUpdateDomain}
        onDeleteDomain={handleDeleteDomain}
        onSyncDomain={handleSyncDomain}
      />

      {/* Share / Member Modal */}
      {user && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectId={project.id}
          projectName={project.name}
          currentUser={user}
          myRole={myRole}
        />
      )}
    </div>
  );
}
