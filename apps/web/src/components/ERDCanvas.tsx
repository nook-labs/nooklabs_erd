'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
} from '@/types/erd';
import { ERDDocManager } from '@/collaboration/doc';
import { TableNode } from './TableNode';
import { MemoNode } from './MemoNode';
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
} from '@/collaboration/actions';
import { RelationshipModal } from './RelationshipModal';
import { CreateRelationshipModal } from './CreateRelationshipModal';
import { ManualFkModal } from './ManualFkModal';
import { MultiplayerCursors } from './MultiplayerCursors';
import { CanvasSettings } from './CanvasInspector';

interface ERDCanvasProps {
  manager: ERDDocManager;
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  nodes: Record<string, NodeView>;
  memos: Record<string, MemoModel>;
  domains?: DomainItem[];
  displayMode: DisplayMode;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isIdentifyingMode: boolean;
  isMiniMapOpen: boolean;
  isViewerMode?: boolean;
  reactFlowInstanceRef?: React.MutableRefObject<any>;
  canvasSettings: CanvasSettings;
}

const nodeTypes = {
  tableNode: TableNode,
  memoNode: MemoNode,
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

export const ERDCanvas: React.FC<ERDCanvasProps> = ({
  manager,
  tables,
  relationships,
  nodes,
  memos,
  domains = [],
  displayMode,
  activeTool,
  setActiveTool,
  isMiniMapOpen,
  isViewerMode = false,
  reactFlowInstanceRef,
  canvasSettings,
}) => {
  // Pending source table for Relationship creation (Click Parent -> Click Child)
  const [selectedParentTableId, setSelectedParentTableId] = useState<string | null>(null);

  // Pending creation for modal prompt (Identifying vs Non-Identifying)
  const [pendingCreation, setPendingCreation] = useState<{
    parentId: string;
    childId: string;
    multiplicity: any;
  } | null>(null);

  // Selected Relationship for Modal Edit
  const [editingRelationship, setEditingRelationship] = useState<RelationshipModel | null>(null);

  // Manual FK Modal Target
  const [manualFkTarget, setManualFkTarget] = useState<{
    table: TableModel;
    column: ColumnModel;
  } | null>(null);

  // Real-time Spacebar Pan Cursor Detection
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // Convert Yjs tables & memos to React Flow Nodes
  const computedNodes: Node[] = useMemo(() => {
    const tableNodes: Node[] = Object.values(tables).map((table) => {
      const nodeView = nodes[table.id] || {
        id: `node_${table.id}`,
        tableId: table.id,
        position: { x: 100, y: 100 },
      };

      const isSourceCandidate = selectedParentTableId === table.id;
      const isTargetCandidate = !!selectedParentTableId && selectedParentTableId !== table.id;

      return {
        id: table.id,
        type: 'tableNode',
        position: nodeView.position,
        data: {
          table,
          displayMode,
          domains,
          zoomLabelScale: canvasSettings.zoomLabelScale ?? 1.45,
          isSourceCandidate,
          isTargetCandidate,
          isViewerMode,
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
          onTableClick: (tId: string) => {
            if (isViewerMode) return;
            if (activeTool.startsWith('rel-')) {
              if (!selectedParentTableId) {
                setSelectedParentTableId(tId);
              } else if (selectedParentTableId !== tId) {
                const targetMult: any = activeTool.replace('rel-', '');
                setPendingCreation({
                  parentId: selectedParentTableId,
                  childId: tId,
                  multiplicity: targetMult,
                });
                setSelectedParentTableId(null);
                setActiveTool('select');
              }
            }
          },
        },
      };
    });

    const memoNodes: Node[] = Object.values(memos).map((memo) => ({
      id: memo.id,
      type: 'memoNode',
      position: memo.position,
      data: {
        memo,
        isViewerMode,
        onUpdate: (mId: string, updates: Partial<MemoModel>) =>
          !isViewerMode && updateMemoAction(manager, mId, updates),
        onDelete: (mId: string) => !isViewerMode && deleteMemoAction(manager, mId),
      },
    }));

    return [...tableNodes, ...memoNodes];
  }, [
    tables,
    nodes,
    memos,
    displayMode,
    selectedParentTableId,
    activeTool,
    manager,
    setActiveTool,
    isViewerMode,
    canvasSettings.zoomLabelScale,
    domains,
  ]);

  // Convert Yjs relationships to React Flow Edges
  const computedEdges: Edge[] = useMemo(() => {
    const relList = Object.values(relationships);

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

      return {
        id: rel.id,
        source: rel.parentTableId,
        target: rel.childTableId,
        sourceHandle,
        targetHandle,
        type: 'relationshipEdge',
        data: {
          relationship: rel,
          sourceOffsetY: sOff.y,
          sourceOffsetX: sOff.x,
          targetOffsetY: tOff.y,
          targetOffsetX: tOff.x,
          onEdit: (r: RelationshipModel) => setEditingRelationship(r),
          onDelete: (rId: string) => deleteRelationshipAction(manager, rId),
        },
      };
    });
  }, [relationships, nodes, manager]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(computedNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Keep existing node selection state and update draggable (draggable only when selected)
  useEffect(() => {
    setRfNodes((prevNodes) => {
      const selectedMap = new Map(prevNodes.map((n) => [n.id, n.selected]));
      return computedNodes.map((n) => {
        const isSelected = selectedMap.get(n.id) ?? false;
        return {
          ...n,
          selected: isSelected,
          draggable: isViewerMode ? false : (!isSpaceDown && isSelected),
        };
      });
    });
  }, [computedNodes, setRfNodes, isViewerMode, isSpaceDown]);

  useEffect(() => {
    setRfEdges(computedEdges);
  }, [computedEdges, setRfEdges]);

  // Handle node selection changes to make selected nodes draggable
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // When clicking on a node, make it selected and draggable
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setRfNodes((nodes) =>
        nodes.map((n) => {
          const isTarget = n.id === node.id;
          return {
            ...n,
            selected: isTarget,
            draggable: isViewerMode ? false : (!isSpaceDown && isTarget),
          };
        })
      );
    },
    [setRfNodes, isViewerMode, isSpaceDown]
  );

  // Deselect all nodes only when explicitly clicking on the empty canvas pane
  const onPaneClick = useCallback(() => {
    setRfNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: false,
        draggable: false,
      }))
    );
  }, [setRfNodes]);

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
        setPendingCreation({
          parentId: params.source,
          childId: params.target,
          multiplicity: 'optional-many',
        });
      }
    },
    [isViewerMode]
  );

  const handleConfirmCreate = (relType: any) => {
    if (!pendingCreation || isViewerMode) return;
    const targetMult = pendingCreation.multiplicity;
    const isOneToOne = ['optional-one', 'mandatory-one', 'one'].includes(targetMult);
    const cardinality = isOneToOne ? 'one-to-one' : 'one-to-many';
    const sourceMult = 'one';

    addRelationshipAction(
      manager,
      pendingCreation.parentId,
      pendingCreation.childId,
      relType,
      cardinality,
      sourceMult,
      targetMult
    );
    setPendingCreation(null);
  };

  const isRelToolActive = activeTool.startsWith('rel-');

  const pendingParentTable = pendingCreation ? tables[pendingCreation.parentId] : null;
  const pendingChildTable = pendingCreation ? tables[pendingCreation.childId] : null;

  const parentTable = editingRelationship ? tables[editingRelationship.parentTableId] : null;
  const childTable = editingRelationship ? tables[editingRelationship.childTableId] : null;

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!manager?.provider?.awareness || !reactFlowInstanceRef?.current) return;
      const flowPos = reactFlowInstanceRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      manager.provider.awareness.setLocalStateField('cursor', flowPos);
    },
    [manager, reactFlowInstanceRef]
  );

  // Spacebar pan listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceDown(true);
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
  }, []);

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
        selectionOnDrag={!isRelToolActive && !isSpaceDown && !isViewerMode}
        selectionMode={SelectionMode.Partial}
        panOnDrag={isViewerMode || isSpaceDown || isRelToolActive ? [0, 1, 2] : [1, 2]}
        panOnScroll={true}
        nodesDraggable={!isViewerMode && !isSpaceDown}
        elementsSelectable={true}
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
        defaultEdgeOptions={{ type: 'relationshipEdge' }}
        style={{ backgroundColor: canvasSettings.backgroundColor }}
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

        {isMiniMapOpen && (
          <MiniMap
            nodeColor={(n) => (n.type === 'memoNode' ? '#fde047' : '#0c8ce9')}
            maskColor={isLightBg ? 'rgba(240, 240, 240, 0.7)' : 'rgba(20, 20, 20, 0.8)'}
            position="bottom-right"
          />
        )}
      </ReactFlow>


      {/* Relationship Creation Modal */}
      <CreateRelationshipModal
        isOpen={!!pendingCreation && !isViewerMode}
        onClose={() => setPendingCreation(null)}
        parentTableName={pendingParentTable?.physicalName || 'Parent'}
        childTableName={pendingChildTable?.physicalName || 'Child'}
        multiplicity={pendingCreation?.multiplicity || 'optional-many'}
        onConfirm={handleConfirmCreate}
      />

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
    </div>
  );
};

