'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  TableModel,
  RelationshipModel,
  NodeView,
  DisplayMode,
  ActiveTool,
  MemoModel,
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
  addRelationshipAction,
  updateRelationshipAction,
  deleteRelationshipAction,
  updateMemoAction,
  deleteMemoAction,
} from '@/collaboration/actions';
import { RelationshipModal } from './RelationshipModal';
import { CreateRelationshipModal } from './CreateRelationshipModal';

interface ERDCanvasProps {
  manager: ERDDocManager;
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  nodes: Record<string, NodeView>;
  memos: Record<string, MemoModel>;
  displayMode: DisplayMode;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isIdentifyingMode: boolean;
  isMiniMapOpen: boolean;
  reactFlowInstanceRef?: React.MutableRefObject<any>;
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
  displayMode,
  activeTool,
  setActiveTool,
  isMiniMapOpen,
  reactFlowInstanceRef,
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
          isSourceCandidate,
          isTargetCandidate,
          onUpdateTable: (tId: string, updates: Partial<TableModel>) =>
            updateTableAction(manager, tId, updates),
          onDuplicateTable: (tId: string) => duplicateTableAction(manager, tId),
          onDeleteTable: (tId: string) => deleteTableAction(manager, tId),
          onAddColumn: (tId: string, colData?: any) => addColumnAction(manager, tId, colData),
          onUpdateColumn: (tId: string, cId: string, updates: any) =>
            updateColumnAction(manager, tId, cId, updates),
          onDeleteColumn: (tId: string, cId: string) => deleteColumnAction(manager, tId, cId),
          onTableClick: (tId: string) => {
            if (activeTool.startsWith('rel-')) {
              if (!selectedParentTableId) {
                // Step 1: Select Parent
                setSelectedParentTableId(tId);
              } else if (selectedParentTableId !== tId) {
                // Step 2: Prompt Identifying vs Non-Identifying Choice
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
        onUpdate: (mId: string, updates: Partial<MemoModel>) =>
          updateMemoAction(manager, mId, updates),
        onDelete: (mId: string) => deleteMemoAction(manager, mId),
      },
    }));

    return [...tableNodes, ...memoNodes];
  }, [tables, nodes, memos, displayMode, selectedParentTableId, activeTool, manager, setActiveTool]);

  // Convert Yjs relationships to React Flow Edges with Exact Handle Names matching TableNode
  // Convert Yjs relationships to React Flow Edges with Dynamic Multi-Edge Offset Distribution
  const computedEdges: Edge[] = useMemo(() => {
    const relList = Object.values(relationships);

    // Pass 1: Determine optimal handles for each relationship
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
          // Diagonal placement: distribute to top/bottom on target so horizontal edges can use left/right without collision
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

    // Pass 2: Calculate target & source grouping & offsets for parallel edge routing
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
        const spacing = 28; // 28px gap
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

  // Local state for smooth 60fps dragging
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(computedNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Sync external changes to local state
  useEffect(() => {
    setRfNodes(computedNodes);
  }, [computedNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(computedEdges);
  }, [computedEdges, setRfEdges]);

  // Node drag stop -> persist position to Yjs
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (node.type === 'memoNode') {
        updateMemoAction(manager, node.id, {
          position: { x: node.position.x, y: node.position.y },
        });
      } else {
        updateNodePositionAction(manager, node.id, node.position.x, node.position.y);
      }
    },
    [manager]
  );

  // Handle Drag & Drop connection between node handles -> Prompt modal
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.source !== params.target) {
        setPendingCreation({
          parentId: params.source,
          childId: params.target,
          multiplicity: 'optional-many',
        });
      }
    },
    []
  );

  const handleConfirmCreate = (relType: any) => {
    if (!pendingCreation) return;
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

  const pendingParentTable = pendingCreation ? tables[pendingCreation.parentId] : null;
  const pendingChildTable = pendingCreation ? tables[pendingCreation.childId] : null;

  const parentTable = editingRelationship ? tables[editingRelationship.parentTableId] : null;
  const childTable = editingRelationship ? tables[editingRelationship.childTableId] : null;

  return (
    <div className="w-full h-full bg-[#07090e] relative overflow-hidden">
      {/* Floating Relationship Mode Pill Banner */}
      {activeTool.startsWith('rel-') && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#0d111a]/95 border border-indigo-500/80 text-white px-4 py-2 rounded-full shadow-[0_10px_30px_rgba(79,70,229,0.3)] backdrop-blur-xl flex items-center gap-3 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-medium text-slate-200">
            {!selectedParentTableId
              ? '① 부모 테이블(1)을 클릭하세요'
              : '② 자식 테이블(N)을 클릭하여 관계를 연결하세요'}
          </span>
          <button
            onClick={() => {
              setActiveTool('select');
              setSelectedParentTableId(null);
            }}
            className="text-[11px] text-indigo-400 hover:text-white underline font-semibold ml-2 transition-colors"
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onInit={(instance) => {
          if (reactFlowInstanceRef) {
            reactFlowInstanceRef.current = instance;
          }
        }}
        fitView
        colorMode="dark"
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'relationshipEdge' }}
      >
        <Background color="#131926" gap={24} size={1} />
        {isMiniMapOpen && (
          <MiniMap
            nodeColor={(n) => (n.type === 'memoNode' ? '#fef08a' : '#4f46e5')}
            maskColor="rgba(7, 9, 14, 0.85)"
            position="bottom-right"
          />
        )}
      </ReactFlow>

      {/* Relationship Creation Confirmation Modal (Identifying vs Non-Identifying) */}
      <CreateRelationshipModal
        isOpen={!!pendingCreation}
        onClose={() => setPendingCreation(null)}
        parentTableName={pendingParentTable?.physicalName || 'Parent'}
        childTableName={pendingChildTable?.physicalName || 'Child'}
        multiplicity={pendingCreation?.multiplicity || 'optional-many'}
        onConfirm={handleConfirmCreate}
      />

      {/* Relationship Settings Modal */}
      <RelationshipModal
        isOpen={!!editingRelationship}
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
    </div>
  );
};
