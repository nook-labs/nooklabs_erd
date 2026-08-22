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
  ColumnModel,
  RelationshipModel,
  NodeView,
  MemoModel,
  DomainItem,
  DiagramModel,
  PageModel,
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
import { GlobalSearchModal } from '@/components/GlobalSearchModal';
import { MermaidEditorModal } from '@/components/MermaidEditorModal';
import { CanvasPagesTabBar } from '@/components/CanvasPagesTabBar';
import {
  addTableAction,
  deleteTableAction,
  addMemoAction,
  addDiagramAction,
  updateDiagramAction,
  deleteDiagramAction,
  duplicateDiagramAction,
  addPageAction,
  updatePageAction,
  deletePageAction,
  reorderPagesAction,
  addRelationshipAction,
  updateProjectTitleAction,
  updateNodePositionAction,
  addDomainAction,
  updateDomainAction,
  deleteDomainAction,
  syncDomainColumnsAction,
  DEFAULT_MERMAID_SEQUENCE,
} from '@/collaboration/actions';
import {
  captureCurrentSnapshot,
  restoreVersionSnapshotAction,
} from '@/collaboration/versionActions';
import {
  loadDocFromSupabase,
  createDebouncedDocSaver,
  SaveStatus,
} from '@/collaboration/supabasePersistence';
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');

  const [tables, setTables] = useState<Record<string, TableModel>>({});
  const [relationships, setRelationships] = useState<Record<string, RelationshipModel>>({});
  const [nodes, setNodes] = useState<Record<string, NodeView>>({});
  const [memos, setMemos] = useState<Record<string, MemoModel>>({});
  const [diagrams, setDiagrams] = useState<Record<string, DiagramModel>>({});
  const [pages, setPages] = useState<Record<string, PageModel>>({});
  const [activePageId, setActivePageId] = useState<string>('page_default');
  const [editingDiagram, setEditingDiagram] = useState<DiagramModel | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [projectTitle, setProjectTitle] = useState('프로젝트 ERD');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserInfo[]>([]);
  const [registeredMemberCount, setRegisteredMemberCount] = useState<number>(1);
  const [displayMode, setDisplayModeState] = useState<DisplayMode>('both');

  // Load saved DisplayMode from localStorage on mount (Default: 'both' - 동시 표기)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nooklabs_display_mode') as DisplayMode;
      if (saved && (saved === 'physical' || saved === 'logical' || saved === 'both')) {
        setDisplayModeState(saved);
      } else {
        setDisplayModeState('both');
      }
    }
  }, []);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nooklabs_display_mode', mode);
    }
  }, []);

  // Canvas Inspector & Background Settings (Persistent per user)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nooklabs_canvas_settings');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load initial canvas settings', e);
      }
    }
    return {
      backgroundColor: '#1e1e1e', // Figma Dark Default
      gridType: 'dots',
      gridColor: 'rgba(255, 255, 255, 0.12)',
      zoomLabelScale: 1.45,
      showZoomLabels: true,
    };
  });

  // Reload canvas settings when user is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const userKey = `nooklabs_canvas_settings_${user.id}`;
        const saved = localStorage.getItem(userKey);
        if (saved) {
          setCanvasSettings(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load user canvas settings', e);
      }
    }
  }, [user?.id]);

  const handleUpdateCanvasSettings = useCallback(
    (updates: Partial<CanvasSettings>) => {
      setCanvasSettings((prev) => {
        const next = { ...prev, ...updates };
        if (typeof window !== 'undefined') {
          try {
            const userKey = user?.id ? `nooklabs_canvas_settings_${user.id}` : 'nooklabs_canvas_settings';
            localStorage.setItem(userKey, JSON.stringify(next));
            localStorage.setItem('nooklabs_canvas_settings', JSON.stringify(next));
          } catch (e) {
            console.error('Failed to save canvas settings', e);
          }
        }
        return next;
      });
    },
    [user?.id]
  );

  // Viewer Mode State (Manual toggle for view-only safe browsing)
  const [isViewerMode, setIsViewerMode] = useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

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
  const mouseClientPosRef = useRef<{ x: number; y: number } | null>(null);

  // Track mouse screen coordinates globally for precision stamp/shortcut placement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseClientPosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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
            // Ensure profile exists in profiles table
            await supabase.from('profiles').upsert(
              {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            const { data: projData, error: projErr } = await supabase
              .from('projects')
              .select('*')
              .eq('id', projectId)
              .single();

            if (projData && !projErr) {
              setProject(projData);
              setProjectTitle(projData.name);

              const isOwner = projData.owner_id === user.id;

              const { data: memberData } = await supabase
                .from('project_members')
                .select('role')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .maybeSingle();

              const resolvedRole: ProjectRole = isOwner
                ? 'owner'
                : (memberData?.role as ProjectRole) || 'editor';

              // Automatically upsert membership so project appears in Dashboard and ShareModal
              if (!memberData || (isOwner && memberData.role !== 'owner')) {
                try {
                  await supabase.from('project_members').upsert(
                    {
                      project_id: projectId,
                      user_id: user.id,
                      role: resolvedRole,
                      joined_at: new Date().toISOString(),
                    },
                    { onConflict: 'project_id,user_id' }
                  );

                  // If user joined via invite email, mark invitation as accepted
                  if (user.email) {
                    await supabase
                      .from('project_invitations')
                      .update({ accepted_at: new Date().toISOString() })
                      .eq('project_id', projectId)
                      .eq('email', user.email)
                      .is('accepted_at', null);
                  }
                } catch (mErr: any) {
                  console.warn('Auto member registration warning:', mErr.message);
                }
              }

              // 3. Count total registered members
              try {
                const { count: mCount } = await supabase
                  .from('project_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('project_id', projectId);
                if (mCount !== null && mCount !== undefined) {
                  setRegisteredMemberCount(Math.max(mCount, 1));
                }
              } catch {
                // fallback
              }

              setMyRole(resolvedRole);
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
          const isOwner = proj.owner_id === user.id;
          const members = mockStore.getMembers(projectId);
          const currentMember = members.find((m) => m.user_id === user.id);
          const resolvedRole: ProjectRole = isOwner ? 'owner' : currentMember?.role || 'editor';

          if (!currentMember) {
            mockStore.addMember(projectId, user.id, resolvedRole, proj.owner_id);
          }
          setMyRole(resolvedRole);
          const updatedMembers = mockStore.getMembers(projectId);
          setRegisteredMemberCount(Math.max(updatedMembers.length, 1));
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

        const diagObj: Record<string, DiagramModel> = {};
        docMgr.diagramsMap.forEach((val, key) => {
          diagObj[key] = val;
        });
        setDiagrams(diagObj);

        const pageObj: Record<string, PageModel> = {};
        docMgr.pagesMap.forEach((val, key) => {
          pageObj[key] = val;
        });
        setPages(pageObj);

        // Auto-select valid page if current active page does not exist in pagesMap
        const pageList = Object.values(pageObj).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (pageList.length > 0) {
          setActivePageId((current) => {
            if (!current || (current !== 'page_default' && !pageObj[current])) {
              return pageList[0]?.id || 'page_default';
            }
            return current;
          });
        }

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

    // Document sync handler
    const handleDocumentSynced = () => {
      setIsSynced(true);
      syncFromYjs();
    };

    // Listen to Hocuspocus and IndexedDB sync events
    if (docMgr.provider) {
      docMgr.provider.on('synced', (syncedData: any) => {
        const syncedState = typeof syncedData === 'boolean' ? syncedData : syncedData?.state;
        if (syncedState) {
          handleDocumentSynced();
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

    // 1. Supabase Cloud DB에서 최신 Yjs 문서 직접 로드 (웹소켓 연결 전/실패 시에도 최신 데이터 보장)
    loadDocFromSupabase(project.id, docMgr.doc).then((hasData) => {
      if (hasData) {
        handleDocumentSynced();
      }
    });

    // 2. 편집 권한이 있을 경우 Supabase DB로 1.5초 디바운스 자동 저장기(Auto-Saver) 등록
    let docSaver: ReturnType<typeof createDebouncedDocSaver> | null = null;
    if (!isReadOnly) {
      docSaver = createDebouncedDocSaver(project.id, docMgr.doc, {
        delayMs: 1500,
        onStatusChange: setSaveStatus,
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
      docSaver?.destroy();
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

  // ERD Operations with Mouse Screen-to-Flow Coordinate Projection
  const handleAddTable = useCallback(
    (x?: number, y?: number) => {
      if (!manager || isReadOnly) return;
      let posX = x;
      let posY = y;

      if (posX === undefined || posY === undefined) {
        if (mouseClientPosRef.current && reactFlowInstanceRef.current?.screenToFlowPosition) {
          const flowPos = reactFlowInstanceRef.current.screenToFlowPosition(mouseClientPosRef.current);
          posX = Math.round(flowPos.x - 170);
          posY = Math.round(flowPos.y - 100);
        } else {
          posX = 100 + Math.random() * 200;
          posY = 100 + Math.random() * 200;
        }
      }

      addTableAction(manager, '새 테이블', 'new_table', posX, posY, '#4f46e5', activePageId);
    },
    [manager, isReadOnly, activePageId]
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
      let posX = x;
      let posY = y;

      if (posX === undefined || posY === undefined) {
        if (mouseClientPosRef.current && reactFlowInstanceRef.current?.screenToFlowPosition) {
          const flowPos = reactFlowInstanceRef.current.screenToFlowPosition(mouseClientPosRef.current);
          posX = Math.round(flowPos.x - 125);
          posY = Math.round(flowPos.y - 60);
        } else {
          posX = 200 + Math.random() * 100;
          posY = 200 + Math.random() * 100;
        }
      }

      addMemoAction(manager, '새 메모', posX, posY, '#fef08a', activePageId);
    },
    [manager, isReadOnly, activePageId]
  );

  const handleAddDiagram = useCallback(
    (x?: number, y?: number) => {
      if (!manager || isReadOnly) return;
      let posX = x;
      let posY = y;

      if (posX === undefined || posY === undefined) {
        if (mouseClientPosRef.current && reactFlowInstanceRef.current?.screenToFlowPosition) {
          const flowPos = reactFlowInstanceRef.current.screenToFlowPosition(mouseClientPosRef.current);
          posX = Math.round(flowPos.x - 240);
          posY = Math.round(flowPos.y - 190);
        } else {
          posX = 200 + Math.random() * 100;
          posY = 200 + Math.random() * 100;
        }
      }

      addDiagramAction(
        manager,
        '시스템 시퀀스 다이어그램',
        DEFAULT_MERMAID_SEQUENCE,
        posX,
        posY,
        'sequence',
        activePageId
      );
    },
    [manager, isReadOnly, activePageId]
  );

  const handleOpenDiagramEditor = useCallback((diagram: DiagramModel) => {
    setEditingDiagram(diagram);
    setIsDiagramModalOpen(true);
  }, []);

  const handleSaveDiagram = useCallback(
    (updates: Partial<DiagramModel>) => {
      if (!manager || !editingDiagram) return;
      updateDiagramAction(manager, editingDiagram.id, updates);
    },
    [manager, editingDiagram]
  );

  // Multi-Page Management Handlers
  const handleAddPage = useCallback(
    (name?: string) => {
      if (!manager || isReadOnly) return;
      if (manager.pagesMap.size === 0) {
        let newPageId = '';
        manager.doc.transact(() => {
          const defaultPageId = `page_default_${Date.now()}`;
          manager.pagesMap.set(defaultPageId, {
            id: defaultPageId,
            name: '메인 ERD',
            order: 0,
          });
          newPageId = `page_${Date.now() + 1}_${Math.random().toString(36).substring(2, 7)}`;
          manager.pagesMap.set(newPageId, {
            id: newPageId,
            name: name || '페이지 2',
            order: 1,
          });
        }, manager.doc.clientID);
        if (newPageId) {
          setActivePageId(newPageId);
        }
        return;
      }
      const count = Object.keys(pages).length;
      const newPageId = addPageAction(manager, name || `페이지 ${count + 1}`);
      setActivePageId(newPageId);
    },
    [manager, isReadOnly, pages]
  );

  const handleUpdatePage = useCallback(
    (pageId: string, updates: Partial<PageModel>) => {
      if (!manager || isReadOnly) return;
      updatePageAction(manager, pageId, updates);
    },
    [manager, isReadOnly]
  );

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (!manager || isReadOnly) return;
      deletePageAction(manager, pageId);

      // Select next remaining page
      const remaining: PageModel[] = [];
      manager.pagesMap.forEach((p) => {
        if (p.id !== pageId) remaining.push(p);
      });
      remaining.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (remaining.length > 0) {
        setActivePageId(remaining[0].id);
      } else {
        const sorted = Object.values(pages).filter((p) => p.id !== pageId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setActivePageId(sorted[0]?.id || 'page_default');
      }
    },
    [manager, isReadOnly, pages]
  );

  const handleDuplicatePage = useCallback(
    (sourcePageId: string) => {
      if (!manager || isReadOnly) return;
      const sourcePage = pages[sourcePageId];
      const newPageName = sourcePage ? `${sourcePage.name} (복사본)` : '페이지 복사본';
      const newPageId = addPageAction(manager, newPageName);

      const sortedPages = Object.values(pages).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const isFirstPage = sortedPages.length === 0 || sourcePageId === 'page_default' || sourcePageId === sortedPages[0]?.id;

      const isItemOnSourcePage = (itemPageId?: string) => {
        if (itemPageId) return itemPageId === sourcePageId;
        return isFirstPage;
      };

      // Duplicate tables, relationships, memos, and diagrams associated with the page
      manager.doc.transact(() => {
        const tableIdMap: Record<string, string> = {};

        // 1. Copy tables & nodes
        Object.values(tables).forEach((table) => {
          if (isItemOnSourcePage(table.pageId)) {
            const newTblId = `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            tableIdMap[table.id] = newTblId;
            const oldNode = nodes[table.id] || {
              id: `node_${table.id}`,
              tableId: table.id,
              position: { x: 100, y: 100 },
            };
            manager.tablesMap.set(newTblId, { ...table, id: newTblId, pageId: newPageId });
            manager.nodesMap.set(newTblId, {
              ...oldNode,
              id: `node_${newTblId}`,
              tableId: newTblId,
              position: { ...oldNode.position },
            });
          }
        });

        // 2. Copy relationships between duplicated tables
        Object.values(relationships).forEach((rel) => {
          const newParentId = tableIdMap[rel.parentTableId];
          const newChildId = tableIdMap[rel.childTableId];
          if (newParentId && newChildId) {
            const newRelId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            manager.relationshipsMap.set(newRelId, {
              ...rel,
              id: newRelId,
              parentTableId: newParentId,
              childTableId: newChildId,
            });
          }
        });

        // 3. Copy memos
        Object.values(memos).forEach((memo) => {
          if (isItemOnSourcePage(memo.pageId)) {
            const newMemoId = `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            manager.memosMap.set(newMemoId, {
              ...memo,
              id: newMemoId,
              pageId: newPageId,
              position: { ...memo.position },
            });
          }
        });

        // 4. Copy diagrams
        Object.values(diagrams).forEach((diag) => {
          if (isItemOnSourcePage(diag.pageId)) {
            const newDiagId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            manager.diagramsMap.set(newDiagId, {
              ...diag,
              id: newDiagId,
              pageId: newPageId,
              position: { ...diag.position },
            });
          }
        });
      }, manager.doc.clientID);

      setActivePageId(newPageId);
    },
    [manager, isReadOnly, pages, tables, memos, diagrams, nodes, relationships]
  );

  // Global Keyboard Shortcuts (Shift + T, Shift + M, Shift + D, V, ESC)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // ESC cancels active tool
      if (e.key === 'Escape') {
        setActiveTool('select');
      }

      // Global Search shortcut (Ctrl+F or Cmd+F) - works everywhere
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]'))
      ) {
        return;
      }

      if (isReadOnly) return;

      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      if (e.shiftKey && !hasModifier) {
        const key = e.key.toLowerCase();
        const code = e.code;

        // Shift + T (테이블 추가: 대소문자, 한영, 물리키 KeyT 모두 지원)
        if (key === 't' || key === 'ㅅ' || code === 'KeyT') {
          e.preventDefault();
          handleAddTable();
          return;
        }

        // Shift + M (메모 추가: 대소문자, 한영, 물리키 KeyM 모두 지원)
        if (key === 'm' || key === 'ㅡ' || code === 'KeyM') {
          e.preventDefault();
          handleAddMemo();
          return;
        }

        // Shift + D (다이어그램 추가: 대소문자, 한영, 물리키 KeyD 모두 지원)
        if (key === 'd' || key === 'ㅇ' || code === 'KeyD') {
          e.preventDefault();
          handleAddDiagram();
          return;
        }
      }

      // V (뷰어 모드 토글: 대소문자, 한영, 물리키 KeyV 지원)
      if (!e.shiftKey && !hasModifier) {
        const key = e.key.toLowerCase();
        const code = e.code;
        if (key === 'v' || key === 'ㅍ' || code === 'KeyV') {
          e.preventDefault();
          setIsViewerMode((prev) => {
            const next = !prev;
            if (next) setActiveTool('select');
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleAddTable, handleAddMemo, handleAddDiagram, isReadOnly, setActiveTool, setIsViewerMode, setIsGlobalSearchOpen]);

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

  // Table Focus & Selection Handler (used by Entity List & Global Search)
  const handleFocusTable = useCallback((tableId: string) => {
    const node = nodes[tableId];
    if (node && reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.setCenter(
        node.position.x + (node.position.width || 300) / 2,
        node.position.y + (node.position.height || 200) / 2,
        { zoom: 1.25, duration: 600 }
      );
      if (reactFlowInstanceRef.current.setNodes) {
        reactFlowInstanceRef.current.setNodes((nds: any[]) =>
          nds.map((n) => ({
            ...n,
            selected: n.id === tableId,
          }))
        );
      }
    }
  }, [nodes]);

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
        saveStatus={saveStatus}
        userRole={myRole}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        memberCount={registeredMemberCount}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleEntityList={() => setIsEntityListOpen((prev) => !prev)}
        isEntityListOpen={isEntityListOpen}
        onToggleVersionHistory={() => setIsVersionHistoryOpen((prev) => !prev)}
        isVersionHistoryOpen={isVersionHistoryOpen}
        versionCount={versions.length}
        tableCount={Object.keys(tables).length}
        isViewerMode={isViewerMode}
        onToggleViewerMode={() => setIsViewerMode((prev) => !prev)}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
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
          onAddDiagram={() => handleAddDiagram()}
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
              diagrams={diagrams}
              pages={pages}
              activePageId={activePageId}
              domains={domains}
              displayMode={displayMode}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              isIdentifyingMode={isIdentifyingMode}
              isMiniMapOpen={isMiniMapOpen}
              isViewerMode={isReadOnly || isViewerMode}
              reactFlowInstanceRef={reactFlowInstanceRef}
              canvasSettings={canvasSettings}
              onOpenDiagramEditor={handleOpenDiagramEditor}
            />
          )}

          {/* Left Sliding Entity List Panel */}
          <EntityListPanel
            isOpen={isEntityListOpen}
            onClose={() => setIsEntityListOpen(false)}
            tables={tables}
            nodes={nodes}
            onFocusTable={handleFocusTable}
            onDeleteTable={handleDeleteTable}
            onAddTable={() => handleAddTable()}
            isReadOnly={isReadOnly || isViewerMode}
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

          {/* Figma Style Multi-Page Floating Tab Bar (Bottom Left) */}
          <div className="absolute bottom-3 left-3 z-30 pointer-events-auto">
            <CanvasPagesTabBar
              pages={pages}
              activePageId={activePageId}
              onSelectPage={(pId) => setActivePageId(pId)}
              onAddPage={handleAddPage}
              onUpdatePage={handleUpdatePage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              isReadOnly={isReadOnly || isViewerMode}
            />
          </div>

          {/* Read Only Watermark Notice for Viewer */}
          {(isReadOnly || isViewerMode) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1e1e1e]/90 border border-purple-500/30 px-3.5 py-1 rounded-full backdrop-blur-md shadow-xl flex items-center gap-2 text-xs text-neutral-200 pointer-events-none z-20 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>
                현재 <strong>{isViewerMode ? '뷰어 모드 (편집 잠금)' : 'Viewer(읽기 전용)'}</strong> 상태입니다.
              </span>
            </div>
          )}

          {/* Floating Validation Panel */}
          <ValidationPanel
            isOpen={isValidationOpen}
            onClose={() => setIsValidationOpen(false)}
            issues={issues}
          />
        </main>

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

      {/* Mermaid Diagram Code Editor Modal */}
      <MermaidEditorModal
        isOpen={isDiagramModalOpen}
        onClose={() => setIsDiagramModalOpen(false)}
        diagram={editingDiagram}
        onSave={handleSaveDiagram}
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
          onMembersChange={setRegisteredMemberCount}
        />
      )}

      {/* Global Search Modal (Ctrl + F: Tables & Columns) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        tables={tables}
        onSelectResult={handleFocusTable}
      />
    </div>
  );
}
