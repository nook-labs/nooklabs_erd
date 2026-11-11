'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Node,
  Edge,
  Connection,
  SelectionMode,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';


import {
  TableModel,
  ColumnModel,
  RelationshipModel,
  NodeView,
  DisplayMode,
  ActiveTool,
  MemoModel,
  DomainItem,
  DiagramModel,
  PageModel,
} from '@/types/erd';
import { ERDDocManager } from '@/collaboration/doc';
import { TableNode } from './TableNode';
import { generateTableAiScript } from '@/lib/aiPromptGenerator';
import { MemoNode } from './MemoNode';
import { MermaidNode } from './MermaidNode';
import { RelationshipEdge } from './RelationshipEdge';
import {
  updateNodePositionAction,
  updateTableAction,
  deleteTableAction,
  duplicateTableAction,
  addColumnAction,
  updateColumnAction,
  deleteColumnAction,
  reorderColumnsAction,
  moveColumnAction,
  addRelationshipAction,
  updateRelationshipAction,
  deleteRelationshipAction,
  attachManualFkAction,
  detachFkAction,
  updateMemoAction,
  deleteMemoAction,
  addMemoAction,
  addDiagramAction,
  updateDiagramAction,
  deleteDiagramAction,
  duplicateDiagramAction,
  DEFAULT_MERMAID_SEQUENCE,
} from '@/collaboration/actions';
import { RelationshipModal } from './RelationshipModal';
import { ManualFkModal } from './ManualFkModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { MultiplayerCursors } from './MultiplayerCursors';
import { CanvasSettings } from './CanvasInspector';
import {
  Table2,
  FileText,
  Workflow,
  History,
  FolderArchive,
  Undo2,
  Redo2,
  Plus,
  Minus,
  Maximize2,
  Scan,
  Map,
  Share2,
} from 'lucide-react';

interface ERDCanvasProps {
  manager: ERDDocManager;
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  nodes: Record<string, NodeView>;
  memos: Record<string, MemoModel>;
  diagrams?: Record<string, DiagramModel>;
  pages?: Record<string, PageModel>;
  activePageId?: string;
  defaultPageId?: string;
  domains?: DomainItem[];
  displayMode: DisplayMode;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isIdentifyingMode: boolean;
  isMiniMapOpen: boolean;
  onToggleMiniMap?: () => void;
  isViewerMode?: boolean;
  reactFlowInstanceRef?: React.MutableRefObject<any>;
  canvasSettings: CanvasSettings;
  onOpenDiagramEditor?: (diagram: DiagramModel) => void;
  focusedDiagramId?: string | null;
  onToggleEntityList?: () => void;
  onToggleDiagramList?: () => void;
  onToggleVersionHistory?: () => void;
  onOpenDomain?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  creatorName?: string;
  onOpenShareModal?: () => void;
}

const nodeTypes = {
  tableNode: TableNode,
  memoNode: MemoNode,
  mermaidNode: MermaidNode,
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

const EMPTY_FOCUS_INFO = {
  hasActiveFocus: false,
  focusedTableIds: new Set<string>(),
  focusedEdgeIds: new Set<string>(),
  focusedColumnMap: {} as Record<string, string[]>,
};

export const ERDCanvas: React.FC<ERDCanvasProps> = ({
  manager,
  tables,
  relationships,
  nodes,
  memos,
  diagrams = {},
  pages = {},
  activePageId,
  defaultPageId,
  domains = [],
  displayMode,
  activeTool,
  setActiveTool,
  isIdentifyingMode = false,
  isMiniMapOpen,
  onToggleMiniMap,
  isViewerMode = false,
  reactFlowInstanceRef,
  canvasSettings,
  onOpenDiagramEditor,
  focusedDiagramId,
  onToggleEntityList,
  onToggleDiagramList,
  onToggleVersionHistory,
  onOpenDomain,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  creatorName,
  onOpenShareModal,
}) => {
  // Pending source table for Relationship creation (Click Parent -> Click Child)
  const [selectedParentTableId, setSelectedParentTableId] = useState<string | null>(null);

  // Selected Relationship for Modal Edit
  const [editingRelationship, setEditingRelationship] = useState<RelationshipModel | null>(null);

  // Manual FK Modal Target
  const [manualFkTarget, setManualFkTarget] = useState<{
    table: TableModel;
    column: ColumnModel;
  } | null>(null);

  // Real-time Spacebar Pan Cursor Detection
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // Currently selected node ID for interactive relationship highlighting & dimming
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Selected nodes awaiting deletion confirmation
  const [pendingDeleteNodes, setPendingDeleteNodes] = useState<Node[] | null>(null);

  // Reset focus/selection state when switching pages
  useEffect(() => {
    setSelectedNodeId(null);
    setSelectedParentTableId(null);
  }, [activePageId]);

  // Clean up selectedNodeId if the selected element was deleted
  useEffect(() => {
    if (selectedNodeId && !tables[selectedNodeId] && !memos[selectedNodeId] && !diagrams[selectedNodeId]) {
      setSelectedNodeId(null);
    }
  }, [tables, memos, diagrams, selectedNodeId]);

  // Compute relationship graph & column mappings
  const relationGraph = useMemo(() => {
    const tableNeighbors: Record<string, { parents: Set<string>; children: Set<string> }> = {};
    const tableConnectedEdges: Record<string, Set<string>> = {};

    Object.values(relationships).forEach((rel) => {
      if (!tableNeighbors[rel.parentTableId]) {
        tableNeighbors[rel.parentTableId] = { parents: new Set(), children: new Set() };
      }
      if (!tableNeighbors[rel.childTableId]) {
        tableNeighbors[rel.childTableId] = { parents: new Set(), children: new Set() };
      }
      tableNeighbors[rel.parentTableId].children.add(rel.childTableId);
      tableNeighbors[rel.childTableId].parents.add(rel.parentTableId);

      if (!tableConnectedEdges[rel.parentTableId]) {
        tableConnectedEdges[rel.parentTableId] = new Set();
      }
      if (!tableConnectedEdges[rel.childTableId]) {
        tableConnectedEdges[rel.childTableId] = new Set();
      }
      tableConnectedEdges[rel.parentTableId].add(rel.id);
      tableConnectedEdges[rel.childTableId].add(rel.id);
    });

    return { tableNeighbors, tableConnectedEdges };
  }, [relationships]);

  // Compute active focus info based on selected table node
  const focusInfo = useMemo(() => {
    if (!selectedNodeId || !tables[selectedNodeId]) {
      return EMPTY_FOCUS_INFO;
    }

    const focusedTableIds = new Set<string>([selectedNodeId]);
    const neighbors = relationGraph.tableNeighbors[selectedNodeId];
    if (neighbors) {
      neighbors.parents.forEach((id) => focusedTableIds.add(id));
      neighbors.children.forEach((id) => focusedTableIds.add(id));
    }

    const focusedEdgeIds = relationGraph.tableConnectedEdges[selectedNodeId] || new Set<string>();

    // Collect mapped columns between selected table and related tables
    const focusedColumnMap: Record<string, string[]> = {};
    Object.values(relationships).forEach((rel) => {
      if (rel.parentTableId === selectedNodeId || rel.childTableId === selectedNodeId) {
        (rel.columnMappings || []).forEach((mapping) => {
          if (mapping.parentColumnId) {
            if (!focusedColumnMap[rel.parentTableId]) focusedColumnMap[rel.parentTableId] = [];
            if (!focusedColumnMap[rel.parentTableId].includes(mapping.parentColumnId)) {
              focusedColumnMap[rel.parentTableId].push(mapping.parentColumnId);
            }
          }
          if (mapping.childColumnId) {
            if (!focusedColumnMap[rel.childTableId]) focusedColumnMap[rel.childTableId] = [];
            if (!focusedColumnMap[rel.childTableId].includes(mapping.childColumnId)) {
              focusedColumnMap[rel.childTableId].push(mapping.childColumnId);
            }
          }
        });
      }
    });

    return {
      hasActiveFocus: true,
      focusedTableIds,
      focusedEdgeIds,
      focusedColumnMap,
    };
  }, [selectedNodeId, tables, relationGraph, relationships]);

  // Convert Yjs tables, memos & diagrams to React Flow Nodes
  const computedNodes: Node[] = useMemo(() => {
    const sortedPages = Object.values(pages || {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const firstPageId = sortedPages[0]?.id;

    const isItemOnActivePage = (itemPageId?: string) => {
      if (!activePageId) return true;
      if (itemPageId) return itemPageId === activePageId;
      // If item has no pageId (legacy existing data), it automatically belongs to the default/1st page
      return (
        activePageId === 'page_default' ||
        activePageId === defaultPageId ||
        activePageId === firstPageId ||
        !pages ||
        Object.keys(pages).length === 0
      );
    };

    const tableNodes: Node[] = Object.values(tables)
      .filter((table) => isItemOnActivePage(table.pageId))
      .map((table) => {
        const nodeView = nodes[table.id] || {
          id: `node_${table.id}`,
          tableId: table.id,
          position: { x: 100, y: 100 },
        };

        const isSourceCandidate = selectedParentTableId === table.id;
        const isTargetCandidate = !!selectedParentTableId && selectedParentTableId !== table.id;

        const isDirectlySelected = selectedNodeId === table.id;
        const isNeighborFocused = focusInfo.hasActiveFocus && !isDirectlySelected && focusInfo.focusedTableIds.has(table.id);
        const isDimmed = canvasSettings.dimUnfocused ? (focusInfo.hasActiveFocus && !focusInfo.focusedTableIds.has(table.id)) : false;
        const highlightedColumnIds = focusInfo.hasActiveFocus ? (focusInfo.focusedColumnMap[table.id] || []) : [];
        const connectedParentsCount = relationGraph.tableNeighbors[table.id]?.parents.size || 0;
        const connectedChildrenCount = relationGraph.tableNeighbors[table.id]?.children.size || 0;

        return {
          id: table.id,
          type: 'tableNode',
          position: nodeView.position,
          selected: isDirectlySelected,
          zIndex: isDirectlySelected ? 100 : isNeighborFocused ? 50 : 1,
          style: {
            opacity: isDimmed ? 0.35 : 1,
            transition: 'opacity 0.2s ease',
          },
          draggable: isViewerMode ? false : !isSpaceDown,
          data: {
            table,
            displayMode,
            domains,
            zoomLabelScale: canvasSettings.zoomLabelScale ?? 1.45,
            showZoomLabels: canvasSettings.showZoomLabels ?? true,
            isSourceCandidate,
            isTargetCandidate,
            isViewerMode,
            isDimmed,
            isNeighborFocused,
            isDirectlySelected,
            highlightedColumnIds,
            connectedParentsCount,
            connectedChildrenCount,
            onOpenManualFk: (t: TableModel, c: any) => setManualFkTarget({ table: t, column: c }),
            onUpdateTable: (tId: string, updates: Partial<TableModel>) =>
              !isViewerMode && updateTableAction(manager, tId, updates),
            onDuplicateTable: (tId: string) => !isViewerMode && duplicateTableAction(manager, tId),
            onDeleteTable: (tId: string) => !isViewerMode && deleteTableAction(manager, tId),
            onAddColumn: (tId: string, colData?: any, insertIndex?: number) =>
              !isViewerMode && addColumnAction(manager, tId, colData, insertIndex),
            onUpdateColumn: (tId: string, cId: string, updates: any) =>
              !isViewerMode && updateColumnAction(manager, tId, cId, updates),
            onDeleteColumn: (tId: string, cId: string) =>
              !isViewerMode && deleteColumnAction(manager, tId, cId),
            onReorderColumns: (tId: string, newOrder: string[]) =>
              !isViewerMode && reorderColumnsAction(manager, tId, newOrder),
            onMoveColumn: (tId: string, cId: string, direction: 'up' | 'down') =>
              !isViewerMode && moveColumnAction(manager, tId, cId, direction),
            onCopyAiScript: async (tId: string) => {
              // 클릭 시점의 최신 문서 상태로 생성 (노드 재계산 의존성 불필요)
              const allTables: Record<string, TableModel> = {};
              const allRels: Record<string, RelationshipModel> = {};
              manager.tablesMap.forEach((v, k) => (allTables[k] = v));
              manager.relationshipsMap.forEach((v, k) => (allRels[k] = v));
              const script = generateTableAiScript({
                tableId: tId,
                tables: allTables,
                relationships: allRels,
                projectTitle: manager.metaMap.get('title'),
              });
              try {
                await navigator.clipboard.writeText(script);
                return true;
              } catch {
                return false;
              }
            },
            onTableClick: (tId: string) => {
              if (isViewerMode) {
                setSelectedNodeId(tId);
                return;
              }
              if (activeTool.startsWith('rel-')) {
                if (!selectedParentTableId) {
                  setSelectedParentTableId(tId);
                } else if (selectedParentTableId !== tId) {
                  const targetMult: any = activeTool.replace('rel-', '');
                  const relType = isIdentifyingMode ? 'identifying' : 'non-identifying';
                  const isOneToOne = ['optional-one', 'mandatory-one', 'one'].includes(targetMult);
                  const cardinality = isOneToOne ? 'one-to-one' : 'one-to-many';
                  addRelationshipAction(
                    manager,
                    selectedParentTableId,
                    tId,
                    relType,
                    cardinality,
                    'one',
                    targetMult
                  );
                  setSelectedParentTableId(null);
                  setActiveTool('select');
                }
              } else {
                setSelectedNodeId(tId);
              }
            },
          },
        };
      });

    const memoNodes: Node[] = Object.values(memos)
      .filter((memo) => isItemOnActivePage(memo.pageId))
      .map((memo) => ({
        id: memo.id,
        type: 'memoNode',
        position: memo.position,
        selected: selectedNodeId === memo.id,
        zIndex: selectedNodeId === memo.id ? 100 : 1,
        style: {
          opacity: !!canvasSettings.dimUnfocused && focusInfo.hasActiveFocus && selectedNodeId !== memo.id ? 0.35 : 1,
          transition: 'opacity 0.2s ease',
        },
        draggable: isViewerMode ? false : !isSpaceDown,
        data: {
          memo,
          isViewerMode,
          isDimmed: !!canvasSettings.dimUnfocused && focusInfo.hasActiveFocus && selectedNodeId !== memo.id,
          onUpdate: (mId: string, updates: Partial<MemoModel>) =>
            !isViewerMode && updateMemoAction(manager, mId, updates),
          onDelete: (mId: string) => !isViewerMode && deleteMemoAction(manager, mId),
        },
      }));

    const diagramNodes: Node[] = Object.values(diagrams || {})
      .filter((diag) => isItemOnActivePage(diag.pageId))
      .map((diag) => ({
        id: diag.id,
        type: 'mermaidNode',
        position: diag.position,
        selected: selectedNodeId === diag.id,
        zIndex: selectedNodeId === diag.id ? 100 : 1,
        style: {
          opacity: !!canvasSettings.dimUnfocused && focusInfo.hasActiveFocus && selectedNodeId !== diag.id ? 0.35 : 1,
          transition: 'opacity 0.2s ease',
        },
        draggable: isViewerMode ? false : !isSpaceDown,
        data: {
          diagram: diag,
          isViewerMode,
          isDimmed: focusInfo.hasActiveFocus && selectedNodeId !== diag.id,
          isSearchFocused: diag.id === focusedDiagramId,
          onUpdate: (dId: string, updates: Partial<DiagramModel>) =>
            !isViewerMode && updateDiagramAction(manager, dId, updates),
          onDelete: (dId: string) => !isViewerMode && deleteDiagramAction(manager, dId),
          onDuplicate: (dId: string) => !isViewerMode && duplicateDiagramAction(manager, dId),
          onOpenEditor: (d: DiagramModel) => onOpenDiagramEditor?.(d),
        },
      }));

    return [...tableNodes, ...memoNodes, ...diagramNodes];
  }, [
    tables,
    nodes,
    memos,
    diagrams,
    pages,
    activePageId,
    defaultPageId,
    displayMode,
    selectedParentTableId,
    activeTool,
    manager,
    setActiveTool,
    isViewerMode,
    canvasSettings.zoomLabelScale,
    canvasSettings.showZoomLabels,
    focusedDiagramId,
    domains,
    onOpenDiagramEditor,
    selectedNodeId,
    focusInfo,
    relationGraph,
    isSpaceDown,
  ]);

  // Convert Yjs relationships to React Flow Edges (only visible tables on current page)
  const computedEdges: Edge[] = useMemo(() => {
    const sortedPages = Object.values(pages || {}).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const firstPageId = sortedPages[0]?.id;

    const isItemOnActivePage = (itemPageId?: string) => {
      if (!activePageId) return true;
      if (itemPageId) return itemPageId === activePageId;
      return (
        activePageId === 'page_default' ||
        activePageId === defaultPageId ||
        activePageId === firstPageId ||
        !pages ||
        Object.keys(pages).length === 0
      );
    };

    const visibleTableIds = new Set(
      Object.values(tables)
        .filter((t) => isItemOnActivePage(t.pageId))
        .map((t) => t.id)
    );

    const relList = Object.values(relationships).filter(
      (rel) => visibleTableIds.has(rel.parentTableId) && visibleTableIds.has(rel.childTableId)
    );

    const edgeCalculations = relList.map((rel) => {
      const parentNode = nodes[rel.parentTableId];
      const childNode = nodes[rel.childTableId];

      let sourceHandle = 'source-right';
      let targetHandle = 'target-left';

      if (parentNode && childNode) {
        const px = (parentNode.position?.x ?? 0) + 170;
        const py = (parentNode.position?.y ?? 0) + 110;
        const cx = (childNode.position?.x ?? 0) + 170;
        const cy = (childNode.position?.y ?? 0) + 110;

        const dx = cx - px;
        const dy = cy - py;

        if (Math.abs(dx) > Math.abs(dy) * 1.3) {
          if (dx >= 0) {
            sourceHandle = 'source-right';
            targetHandle = 'target-left';
          } else {
            sourceHandle = 'source-left';
            targetHandle = 'target-right';
          }
        } else if (Math.abs(dy) > Math.abs(dx) * 1.3) {
          if (dy >= 0) {
            sourceHandle = 'source-bottom';
            targetHandle = 'target-top';
          } else {
            sourceHandle = 'source-top';
            targetHandle = 'target-bottom';
          }
        } else {
          if (dx > 0 && dy > 0) {
            sourceHandle = 'source-right';
            targetHandle = 'target-top';
          } else if (dx > 0 && dy <= 0) {
            sourceHandle = 'source-right';
            targetHandle = 'target-bottom';
          } else if (dx <= 0 && dy > 0) {
            sourceHandle = 'source-left';
            targetHandle = 'target-top';
          } else {
            sourceHandle = 'source-left';
            targetHandle = 'target-bottom';
          }
        }
      }

      return { rel, sourceHandle, targetHandle };
    });

    const targetGroups: Record<string, number[]> = {};
    const sourceGroups: Record<string, number[]> = {};

    edgeCalculations.forEach((item, index) => {
      const tKey = `${item.rel.childTableId}__${item.targetHandle}`;
      if (!targetGroups[tKey]) targetGroups[tKey] = [];
      targetGroups[tKey].push(index);

      const sKey = `${item.rel.parentTableId}__${item.sourceHandle}`;
      if (!sourceGroups[sKey]) sourceGroups[sKey] = [];
      sourceGroups[sKey].push(index);
    });

    const targetOffsets: Record<number, { y: number; x: number }> = {};
    Object.values(targetGroups).forEach((indices) => {
      if (indices.length === 1) {
        targetOffsets[indices[0]] = { y: 0, x: 0 };
      } else {
        const count = indices.length;
        const spacing = 28;
        indices.forEach((idx, i) => {
          const offsetVal = (i - (count - 1) / 2) * spacing;
          const targetHandle = edgeCalculations[idx].targetHandle;
          if (targetHandle.includes('left') || targetHandle.includes('right')) {
            targetOffsets[idx] = { y: offsetVal, x: 0 };
          } else {
            targetOffsets[idx] = { y: 0, x: offsetVal };
          }
        });
      }
    });

    const sourceOffsets: Record<number, { y: number; x: number }> = {};
    Object.values(sourceGroups).forEach((indices) => {
      if (indices.length === 1) {
        sourceOffsets[indices[0]] = { y: 0, x: 0 };
      } else {
        const count = indices.length;
        const spacing = 28;
        indices.forEach((idx, i) => {
          const offsetVal = (i - (count - 1) / 2) * spacing;
          const sourceHandle = edgeCalculations[idx].sourceHandle;
          if (sourceHandle.includes('left') || sourceHandle.includes('right')) {
            sourceOffsets[idx] = { y: offsetVal, x: 0 };
          } else {
            sourceOffsets[idx] = { y: 0, x: offsetVal };
          }
        });
      }
    });

    return edgeCalculations.map((item, idx) => {
      const { rel, sourceHandle, targetHandle } = item;
      const tOff = targetOffsets[idx] || { y: 0, x: 0 };
      const sOff = sourceOffsets[idx] || { y: 0, x: 0 };

      const isFocused = focusInfo.hasActiveFocus && focusInfo.focusedEdgeIds.has(rel.id);
      const isDimmed = focusInfo.hasActiveFocus && !isFocused;
      const isHidden =
        (canvasSettings.relationDisplayMode === 'hidden') ||
        (canvasSettings.relationDisplayMode === 'focused' && !isFocused);

      return {
        id: rel.id,
        source: rel.parentTableId,
        target: rel.childTableId,
        sourceHandle,
        targetHandle,
        type: 'relationshipEdge',
        hidden: isHidden,
        zIndex: isFocused ? 1000 : 1,
        animated: isFocused,
        style: {
          opacity: isDimmed ? 0.08 : 1,
          pointerEvents: isDimmed ? 'none' : 'auto',
          transition: 'opacity 0.2s ease',
        },
        data: {
          relationship: rel,
          sourceOffsetY: sOff.y,
          sourceOffsetX: sOff.x,
          targetOffsetY: tOff.y,
          targetOffsetX: tOff.x,
          isFocused,
          isDimmed,
          isViewerMode,
          relationDisplayMode: canvasSettings.relationDisplayMode ?? 'all',
          onEdit: (r: RelationshipModel) => !isViewerMode && setEditingRelationship(r),
          onDelete: (rId: string) => !isViewerMode && deleteRelationshipAction(manager, rId),
        },
      };
    });
  }, [
    relationships,
    nodes,
    tables,
    activePageId,
    defaultPageId,
    pages,
    manager,
    focusInfo,
    canvasSettings.relationDisplayMode,
    isViewerMode,
  ]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(computedNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Directly sync React Flow nodes with computedNodes while preserving multi-selection state
  useEffect(() => {
    setRfNodes((prevNodes) => {
      const prevSelectedMap: Record<string, boolean | undefined> = {};
      prevNodes.forEach((n) => {
        prevSelectedMap[n.id] = n.selected;
      });
      return computedNodes.map((node) => ({
        ...node,
        selected: prevSelectedMap[node.id] ?? node.selected,
      }));
    });
  }, [computedNodes, setRfNodes]);

  // Handle multi-node batch deletion inside a single Yjs transaction (single Ctrl+Z undoable)
  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteNodes || pendingDeleteNodes.length === 0 || isViewerMode) {
      setPendingDeleteNodes(null);
      return;
    }

    manager.doc.transact(() => {
      pendingDeleteNodes.forEach((node) => {
        if (node.type === 'tableNode') {
          deleteTableAction(manager, node.id);
        } else if (node.type === 'memoNode') {
          deleteMemoAction(manager, node.id);
        } else if (node.type === 'mermaidNode') {
          deleteDiagramAction(manager, node.id);
        }
      });
    }, manager.doc.clientID);

    setSelectedNodeId(null);
    if (reactFlowInstanceRef?.current?.setNodes) {
      reactFlowInstanceRef.current.setNodes((nds: any[]) =>
        nds.map((n) => ({ ...n, selected: false }))
      );
    }
    setPendingDeleteNodes(null);
  }, [pendingDeleteNodes, isViewerMode, manager, reactFlowInstanceRef]);

  // Directly sync React Flow edges with computedEdges
  useEffect(() => {
    setRfEdges(computedEdges);
  }, [computedEdges, setRfEdges]);

  // Handle node position / dimension changes from React Flow
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // When clicking on a node, set selectedNodeId immediately
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedNodeId(node.id);
    },
    []
  );

  // Deselect all nodes or create Memo/Diagram stamp on pane click
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      setSelectedNodeId(null);

      if (activeTool === 'memo' && !isViewerMode && reactFlowInstanceRef?.current) {
        const flowPos = reactFlowInstanceRef.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addMemoAction(manager, '새 메모', Math.round(flowPos.x - 125), Math.round(flowPos.y - 60), '#fef08a', activePageId);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'diagram' && !isViewerMode && reactFlowInstanceRef?.current) {
        const flowPos = reactFlowInstanceRef.current.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const createdId = addDiagramAction(
          manager,
          '시스템 시퀀스 다이어그램',
          DEFAULT_MERMAID_SEQUENCE,
          Math.round(flowPos.x - 240),
          Math.round(flowPos.y - 190),
          'sequence',
          activePageId
        );
        setActiveTool('select');
        const createdDiag = manager.diagramsMap.get(createdId);
        if (createdDiag && onOpenDiagramEditor) {
          onOpenDiagramEditor(createdDiag);
        }
        return;
      }
    },
    [activeTool, isViewerMode, manager, reactFlowInstanceRef, setActiveTool, activePageId, onOpenDiagramEditor]
  );

  const onNodeDragStop = useCallback(
    (_: any, node: Node, draggedNodes?: Node[]) => {
      if (isViewerMode) return;
      const targets = draggedNodes && draggedNodes.length > 0 ? draggedNodes : [node];
      manager.doc.transact(() => {
        targets.forEach((n) => {
          if (n.type === 'memoNode') {
            const currentMemo = manager.memosMap.get(n.id);
            updateMemoAction(manager, n.id, {
              position: {
                x: n.position.x,
                y: n.position.y,
                width: currentMemo?.position.width,
                height: currentMemo?.position.height,
              },
            });
          } else if (n.type === 'mermaidNode') {
            const currentDiag = manager.diagramsMap.get(n.id);
            updateDiagramAction(manager, n.id, {
              position: {
                x: n.position.x,
                y: n.position.y,
                width: currentDiag?.position.width,
                height: currentDiag?.position.height,
              },
            });
          } else {
            updateNodePositionAction(manager, n.id, n.position.x, n.position.y);
          }
        });
      }, manager.doc.clientID);
    },
    [manager, isViewerMode]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isViewerMode) return;
      if (params.source && params.target && params.source !== params.target) {
        const relType = isIdentifyingMode ? 'identifying' : 'non-identifying';
        addRelationshipAction(
          manager,
          params.source,
          params.target,
          relType,
          'one-to-many',
          'one',
          'optional-many'
        );
      }
    },
    [isViewerMode, isIdentifyingMode, manager]
  );

  const isRelToolActive = activeTool.startsWith('rel-');

  const parentTable = editingRelationship ? tables[editingRelationship.parentTableId] : null;
  const childTable = editingRelationship ? tables[editingRelationship.childTableId] : null;

  const lastPointerSentRef = useRef<number>(0);
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!manager?.provider?.awareness || !reactFlowInstanceRef?.current) return;
      const now = Date.now();
      // Throttle cursor broadcast to max ~25fps (40ms) to prevent high CPU / WebSocket message flood
      if (now - lastPointerSentRef.current < 40) return;
      lastPointerSentRef.current = now;

      const flowPos = reactFlowInstanceRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      manager.provider.awareness.setLocalStateField('cursor', flowPos);
    },
    [manager, reactFlowInstanceRef]
  );

  // Keyboard listener: Spacebar pan & Delete / Backspace multi-node removal
  useEffect(() => {
    const isTargetEditable = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true;
      if (target.isContentEditable) return true;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTargetEditable(e.target)) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceDown(true);
        return;
      }

      // Batch delete selected nodes on Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isViewerMode) {
        const allNodes = reactFlowInstanceRef?.current?.getNodes?.() || [];
        let selected = allNodes.filter((n: any) => n.selected);
        if (selected.length === 0 && selectedNodeIdRef.current) {
          const single = allNodes.find((n: any) => n.id === selectedNodeIdRef.current);
          if (single) selected = [single];
        }

        if (selected.length > 0) {
          e.preventDefault();
          setPendingDeleteNodes(selected);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };

    const handleWindowBlur = () => {
      setIsSpaceDown(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isViewerMode, reactFlowInstanceRef]);

  const handlePointerLeave = useCallback(() => {
    if (!manager?.provider?.awareness) return;
    manager.provider.awareness.setLocalStateField('cursor', null);
  }, [manager]);

  // Map Grid Variant
  const bgVariant = useMemo(() => {
    switch (canvasSettings.gridType) {
      case 'lines':
        return BackgroundVariant.Lines;
      case 'cross':
        return BackgroundVariant.Cross;
      case 'dots':
      default:
        return BackgroundVariant.Dots;
    }
  }, [canvasSettings.gridType]);

  const isLightBg = useMemo(() => {
    const hex = canvasSettings.backgroundColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 160;
    }
    return false;
  }, [canvasSettings.backgroundColor]);

  const gridDotColor = isLightBg ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ backgroundColor: canvasSettings.backgroundColor }}
      className={`w-full h-full relative overflow-hidden transition-colors duration-200 ${
        isSpaceDown || isViewerMode ? 'is-space-panning is-viewer-mode' : ''
      }`}
    >
      {/* Floating Relationship Mode Banner */}
      {activeTool.startsWith('rel-') && !isViewerMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#1e1e1e]/95 border border-[#0c8ce9] text-white px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs whitespace-nowrap">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-medium text-neutral-200">
            {!selectedParentTableId
              ? '① 부모 테이블(1) 클릭'
              : '② 자식 테이블(N) 클릭'}
          </span>
          <button
            onClick={() => {
              setActiveTool('select');
              setSelectedParentTableId(null);
            }}
            className="text-[11px] text-[#0c8ce9] hover:text-white underline font-semibold ml-1.5 transition-colors"
          >
            취소 (Esc)
          </button>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onConnect={isViewerMode ? undefined : onConnect}
        onInit={(instance) => {
          if (reactFlowInstanceRef) {
            reactFlowInstanceRef.current = instance;
          }
          instance.fitView({ padding: 0.2 });
        }}
        colorMode={isLightBg ? 'light' : 'dark'}
        minZoom={0.1}
        maxZoom={2.5}
        onlyRenderVisibleElements={true}
        selectionOnDrag={!isRelToolActive && !isSpaceDown && !isViewerMode}
        selectionMode={SelectionMode.Partial}
        panOnDrag={isViewerMode || isSpaceDown || isRelToolActive ? [0, 1, 2] : [1, 2]}
        panOnScroll={true}
        nodesDraggable={!isViewerMode && !isSpaceDown}
        elementsSelectable={true}
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
        deleteKeyCode={null}
        defaultEdgeOptions={{ type: 'relationshipEdge' }}
        style={{
          backgroundColor: canvasSettings.backgroundColor,
          cursor: activeTool === 'memo' ? 'crosshair' : undefined,
        }}
      >
        {canvasSettings.gridType !== 'none' && (
          <Background
            variant={bgVariant}
            color={gridDotColor}
            bgColor={canvasSettings.backgroundColor}
            gap={20}
            size={1.5}
          />
        )}

        {/* Live Multiplayer Cursors */}
        <MultiplayerCursors manager={manager} />

        {/* ERDCloud-style Colorful MiniMap */}
        {isMiniMapOpen && (
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'memoNode') return '#fde047';
              if (n.type === 'mermaidNode') return '#6366f1';
              return (n.data as any)?.table?.headerColor || '#1b5e20';
            }}
            maskColor="rgba(0, 0, 0, 0.45)"
            maskStrokeColor="#ef4444"
            maskStrokeWidth={2}
            className="!bg-[#222222] !border !border-white/20 !rounded-none !shadow-2xl !mb-8"
            position="bottom-right"
          />
        )}
      </ReactFlow>

      {/* ERDCloud Right Floating Dock */}
      <div className="absolute top-3 right-3 z-30 flex flex-col items-center bg-[#242424]/95 backdrop-blur-md border border-white/10 rounded-[3px] p-0.5 shadow-xl text-neutral-300">
        {onToggleEntityList && (
          <button
            onClick={onToggleEntityList}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="엔티티 목록"
          >
            <Table2 className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        )}
        {onToggleDiagramList && (
          <button
            onClick={onToggleDiagramList}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="다이어그램 목록"
          >
            <Workflow className="w-3.5 h-3.5 text-indigo-400" />
          </button>
        )}
        {onToggleVersionHistory && (
          <button
            onClick={onToggleVersionHistory}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="변경 이력 (버전 관리)"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
          </button>
        )}
        {onOpenDomain && (
          <button
            onClick={onOpenDomain}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="도메인 관리"
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
          </button>
        )}
        {(onUndo || onRedo) && <div className="w-3.5 h-[1px] bg-white/10 my-0.5" />}
        {onUndo && (
          <button
            onClick={onUndo}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="다시 실행 (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ERDCloud Floating Bottom-Right Zoom & View Controls */}
      <div className="absolute bottom-9 right-3 z-30 flex items-center bg-[#242424]/95 backdrop-blur-md border border-white/10 rounded-[3px] p-0.5 shadow-xl text-neutral-300 gap-0.5">
        {onToggleMiniMap && (
          <button
            onClick={onToggleMiniMap}
            className={`p-1.5 rounded-[2px] transition-colors ${
              isMiniMapOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-neutral-400 hover:text-white'
            }`}
            title="미니맵 토글"
          >
            <Map className="w-3.5 h-3.5" />
          </button>
        )}
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="확대 (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="축소 (-)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        )}
        {onFitView && (
          <button
            onClick={onFitView}
            className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
            title="화면 맞춤"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="p-1.5 hover:bg-white/10 rounded-[2px] text-neutral-300 hover:text-white transition-colors"
          title="전체 화면"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ERDCloud Style Creator Tag & Share Button (Bottom Right) */}
      <div className="absolute bottom-2 right-3 z-30 flex items-center gap-2 text-[11px] text-neutral-400 select-none">
        {creatorName && (
          <span className="flex items-center gap-1 bg-[#1e1e1e]/80 backdrop-blur-sm px-2 py-0.5 rounded-[2px] border border-white/5">
            <span className="opacity-70">생성자</span>
            <span className="text-neutral-200 font-medium">{creatorName}</span>
          </span>
        )}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
            title="공유"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Active Tool: Diagram Stamp Notice */}
      {activeTool === 'diagram' && !isViewerMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#1e2024] text-neutral-300 px-3 py-1 rounded text-[11px] font-sans flex items-center gap-2 border border-indigo-500/30 shadow-md pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>캔버스를 클릭하여 시퀀스/플로우 다이어그램을 배치하세요</span>
          <span className="text-[10px] text-neutral-500 bg-white/5 px-1 rounded font-mono">ESC</span>
        </div>
      )}

      {/* Active Tool: Memo Stamp Notice */}
      {activeTool === 'memo' && !isViewerMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#1e2024] text-neutral-300 px-3 py-1 rounded text-[11px] font-sans flex items-center gap-2 border border-white/10 shadow-md pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>캔버스를 클릭하여 메모를 추가하세요</span>
          <span className="text-[10px] text-neutral-500 bg-white/5 px-1 rounded font-mono">ESC</span>
        </div>
      )}

      {/* Active Tool: Relationship Connecting Notice */}
      {selectedParentTableId && !isViewerMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#1e2024] text-neutral-300 px-3 py-1 rounded text-[11px] font-sans flex items-center gap-2 border border-emerald-500/30 shadow-md pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>연결할 대상(자식) 테이블을 클릭하세요</span>
          <span className="text-[10px] text-neutral-500 bg-white/5 px-1 rounded font-mono">ESC 취소</span>
        </div>
      )}

      {/* Relationship Edit Modal */}
      <RelationshipModal
        isOpen={!!editingRelationship && !isViewerMode}
        onClose={() => setEditingRelationship(null)}
        relationship={editingRelationship}
        parentTableName={parentTable?.physicalName || 'Parent'}
        childTableName={childTable?.physicalName || 'Child'}
        onSave={(updates) => {
          if (editingRelationship) {
            updateRelationshipAction(manager, editingRelationship.id, updates);
          }
        }}
        onDelete={(rId) => deleteRelationshipAction(manager, rId)}
      />

      {/* Manual FK Modal */}
      {manualFkTarget && (
        <ManualFkModal
          isOpen={!!manualFkTarget}
          onClose={() => setManualFkTarget(null)}
          currentTable={manualFkTarget.table}
          currentColumn={manualFkTarget.column}
          allTables={tables}
          relationships={relationships}
          onAttachFk={(params) => {
            attachManualFkAction(
              manager,
              manualFkTarget.table.id,
              manualFkTarget.column.id,
              params.parentTableId,
              params.parentColumnId,
              params.relationshipType,
              'one-to-many',
              params.sourceMultiplicity,
              params.targetMultiplicity
            );
          }}
          onDetachFk={() => {
            detachFkAction(manager, manualFkTarget.table.id, manualFkTarget.column.id);
          }}
        />
      )}
      {/* Delete Confirmation Modal for Multi-Node / Single-Node Deletion */}
      <DeleteConfirmModal
        isOpen={!!pendingDeleteNodes && pendingDeleteNodes.length > 0}
        onClose={() => setPendingDeleteNodes(null)}
        onConfirm={handleConfirmDelete}
        targetNodes={pendingDeleteNodes || []}
        tables={tables}
        memos={memos}
        diagrams={diagrams}
        relationships={relationships}
      />
    </div>
  );
};

