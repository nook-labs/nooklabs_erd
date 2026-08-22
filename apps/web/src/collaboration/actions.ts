import { ERDDocManager } from './doc';
import {
  TableModel,
  ColumnModel,
  RelationshipModel,
  NodeView,
  RelationshipType,
  Cardinality,
  CrowsFootMultiplicity,
  MemoModel,
  DomainItem,
  DiagramModel,
  PageModel,
} from '@/types/erd';

export function createDefaultColumn(index: number = 1): ColumnModel {
  const id = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    logicalName: index === 1 ? '아이디' : `컬럼_${index}`,
    physicalName: index === 1 ? 'id' : `column_${index}`,
    type: { name: index === 1 ? 'BIGINT' : 'VARCHAR', length: index === 1 ? undefined : 255 },
    nullable: index === 1 ? false : true,
    isPk: index === 1,
    isFk: false,
    autoIncrement: index === 1,
    domain: '',
    defaultExpression: '',
    comment: '',
    origin: 'user',
  };
}

export function addTableAction(
  manager: ERDDocManager,
  logicalName: string = '신규 테이블',
  physicalName: string = 'new_table',
  x: number = 200,
  y: number = 200,
  headerColor: string = '#4f46e5',
  pageId?: string
): string {
  const tableId = `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultCol = createDefaultColumn(1);

  const table: TableModel = {
    id: tableId,
    schemaName: 'public',
    logicalName,
    physicalName,
    comment: '',
    headerColor,
    columnOrder: [defaultCol.id],
    columnsById: { [defaultCol.id]: defaultCol },
    primaryKeyId: defaultCol.id,
    indexIds: [],
    constraintIds: [],
    pageId,
  };

  const nodeView: NodeView = {
    id: `node_${tableId}`,
    tableId,
    position: { x, y, width: 340, height: 220 },
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, table);
    manager.nodesMap.set(tableId, nodeView);
  }, manager.doc.clientID);

  return tableId;
}

export function duplicateTableAction(
  manager: ERDDocManager,
  tableId: string
): string | null {
  const original = manager.tablesMap.get(tableId);
  const originalNode = manager.nodesMap.get(tableId);
  if (!original) return null;

  const newTableId = `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newColumnsById: Record<string, ColumnModel> = {};
  const newColumnOrder: string[] = [];

  original.columnOrder.forEach((colId) => {
    const col = original.columnsById[colId];
    if (col) {
      const newColId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      newColumnsById[newColId] = {
        ...col,
        id: newColId,
      };
      newColumnOrder.push(newColId);
    }
  });

  const duplicatedTable: TableModel = {
    ...original,
    id: newTableId,
    logicalName: `${original.logicalName} (복사본)`,
    physicalName: `${original.physicalName}_copy`,
    columnOrder: newColumnOrder,
    columnsById: newColumnsById,
    primaryKeyId: newColumnOrder[0],
  };

  const posX = (originalNode?.position.x ?? 100) + 40;
  const posY = (originalNode?.position.y ?? 100) + 40;

  const nodeView: NodeView = {
    id: `node_${newTableId}`,
    tableId: newTableId,
    position: { x: posX, y: posY, width: 340, height: 220 },
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(newTableId, duplicatedTable);
    manager.nodesMap.set(newTableId, nodeView);
  }, manager.doc.clientID);

  return newTableId;
}

export function updateTableAction(
  manager: ERDDocManager,
  tableId: string,
  updates: Partial<TableModel>
) {
  const current = manager.tablesMap.get(tableId);
  if (!current) return;

  const updated: TableModel = {
    ...current,
    ...updates,
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, updated);
  }, manager.doc.clientID);
}

export function deleteTableAction(manager: ERDDocManager, tableId: string) {
  manager.doc.transact(() => {
    manager.tablesMap.delete(tableId);
    manager.nodesMap.delete(tableId);

    // Clean up associated relationships
    const relsToDelete: string[] = [];
    manager.relationshipsMap.forEach((rel, relId) => {
      if (rel.parentTableId === tableId || rel.childTableId === tableId) {
        relsToDelete.push(relId);
      }
    });

    relsToDelete.forEach((relId) => manager.relationshipsMap.delete(relId));
  }, manager.doc.clientID);
}

export function addColumnAction(
  manager: ERDDocManager,
  tableId: string,
  columnData?: Partial<ColumnModel>,
  insertIndex?: number
): string | null {
  const table = manager.tablesMap.get(tableId);
  if (!table) return null;

  const nextIndex = table.columnOrder.length + 1;
  const newCol: ColumnModel = {
    ...createDefaultColumn(nextIndex),
    isPk: false,
    nullable: true,
    autoIncrement: false,
    ...columnData,
  };

  const newColumnOrder = [...table.columnOrder];
  if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newColumnOrder.length) {
    newColumnOrder.splice(insertIndex, 0, newCol.id);
  } else {
    newColumnOrder.push(newCol.id);
  }

  const updatedTable: TableModel = {
    ...table,
    columnOrder: newColumnOrder,
    columnsById: {
      ...table.columnsById,
      [newCol.id]: newCol,
    },
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, updatedTable);
  }, manager.doc.clientID);

  return newCol.id;
}

export function reorderColumnsAction(
  manager: ERDDocManager,
  tableId: string,
  newColumnOrder: string[]
) {
  const table = manager.tablesMap.get(tableId);
  if (!table) return;

  const updatedTable: TableModel = {
    ...table,
    columnOrder: newColumnOrder,
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, updatedTable);
  }, manager.doc.clientID);
}

export function moveColumnAction(
  manager: ERDDocManager,
  tableId: string,
  columnId: string,
  direction: 'up' | 'down'
) {
  const table = manager.tablesMap.get(tableId);
  if (!table) return;

  const idx = table.columnOrder.indexOf(columnId);
  if (idx === -1) return;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= table.columnOrder.length) return;

  const nextOrder = [...table.columnOrder];
  const [removed] = nextOrder.splice(idx, 1);
  nextOrder.splice(targetIdx, 0, removed);

  const updatedTable: TableModel = {
    ...table,
    columnOrder: nextOrder,
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, updatedTable);
  }, manager.doc.clientID);
}

export function updateColumnAction(
  manager: ERDDocManager,
  tableId: string,
  columnId: string,
  updates: Partial<ColumnModel>
) {
  const table = manager.tablesMap.get(tableId);
  if (!table || !table.columnsById[columnId]) return;

  const prevCol = table.columnsById[columnId];
  const updatedColumn: ColumnModel = {
    ...prevCol,
    ...updates,
  };

  // If changing PK
  let newPkId = table.primaryKeyId;
  if (updates.isPk !== undefined) {
    if (updates.isPk) {
      newPkId = columnId;
      updatedColumn.nullable = false;
    } else if (table.primaryKeyId === columnId) {
      newPkId = undefined;
    }
  }

  const updatedTable: TableModel = {
    ...table,
    primaryKeyId: newPkId,
    columnsById: {
      ...table.columnsById,
      [columnId]: updatedColumn,
    },
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, updatedTable);
  }, manager.doc.clientID);
}

export function deleteColumnAction(manager: ERDDocManager, tableId: string, columnId: string) {
  const table = manager.tablesMap.get(tableId);
  if (!table) return;

  const newColumnOrder = table.columnOrder.filter((id) => id !== columnId);
  const newColumnsById = { ...table.columnsById };
  delete newColumnsById[columnId];

  const updatedTable: TableModel = {
    ...table,
    columnOrder: newColumnOrder,
    columnsById: newColumnsById,
    primaryKeyId: table.primaryKeyId === columnId ? newColumnOrder[0] : table.primaryKeyId,
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(tableId, updatedTable);
  }, manager.doc.clientID);
}

export function addRelationshipAction(
  manager: ERDDocManager,
  parentTableId: string,
  childTableId: string,
  relationshipType: RelationshipType = 'non-identifying',
  cardinality: Cardinality = 'one-to-many',
  sourceMultiplicity?: CrowsFootMultiplicity,
  targetMultiplicity?: CrowsFootMultiplicity
): string | null {
  const parentTable = manager.tablesMap.get(parentTableId);
  const childTable = manager.tablesMap.get(childTableId);
  if (!parentTable || !childTable) return null;

  // Find parent PK column or default column
  const parentPkColId = parentTable.primaryKeyId || parentTable.columnOrder[0];
  const parentPkCol = parentTable.columnsById[parentPkColId] || Object.values(parentTable.columnsById)[0];
  if (!parentPkCol) return null;

  const relId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Generate unique FK column names for child table
  const baseFkName = `${parentTable.physicalName}_${parentPkCol.physicalName}`;
  const baseFkLogical = `${parentTable.logicalName || parentTable.physicalName} ${parentPkCol.logicalName || parentPkCol.physicalName}`;

  let fkColName = baseFkName;
  let fkLogicalName = baseFkLogical;
  let counter = 1;
  const existingNames = new Set(Object.values(childTable.columnsById).map((c) => c.physicalName));
  while (existingNames.has(fkColName)) {
    fkColName = `${baseFkName}_${counter}`;
    fkLogicalName = `${baseFkLogical} ${counter}`;
    counter++;
  }

  const fkCol: ColumnModel = {
    id: `col_fk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    logicalName: fkLogicalName,
    physicalName: fkColName,
    type: { ...parentPkCol.type },
    nullable: relationshipType === 'non-identifying',
    isPk: relationshipType === 'identifying',
    isFk: true,
    origin: 'relationship-generated',
    relationshipId: relId,
    sourceColumnId: parentPkCol.id,
  };

  const updatedChildTable: TableModel = {
    ...childTable,
    columnOrder: [...childTable.columnOrder, fkCol.id],
    columnsById: {
      ...childTable.columnsById,
      [fkCol.id]: fkCol,
    },
  };

  const relationship: RelationshipModel = {
    id: relId,
    parentTableId,
    childTableId,
    columnMappings: [
      {
        parentColumnId: parentPkCol.id,
        childColumnId: fkCol.id,
      },
    ],
    relationshipType,
    cardinality,
    sourceMultiplicity:
      sourceMultiplicity || (cardinality === 'one-to-one' ? 'one' : 'one'),
    targetMultiplicity:
      targetMultiplicity ||
      (cardinality === 'one-to-one'
        ? 'one'
        : (relationshipType === 'identifying' ? 'mandatory-many' : 'optional-many')),
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
    constraintName: `FK_${childTable.physicalName}_${parentTable.physicalName}_${counter > 1 ? counter : Date.now().toString().slice(-4)}`,
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(childTableId, updatedChildTable);
    manager.relationshipsMap.set(relId, relationship);
  }, manager.doc.clientID);

  return relId;
}


export function updateRelationshipAction(
  manager: ERDDocManager,
  relId: string,
  updates: Partial<RelationshipModel>
) {
  const current = manager.relationshipsMap.get(relId);
  if (!current) return;

  const updated: RelationshipModel = {
    ...current,
    ...updates,
  };

  manager.doc.transact(() => {
    manager.relationshipsMap.set(relId, updated);
  }, manager.doc.clientID);
}

export function deleteRelationshipAction(manager: ERDDocManager, relId: string) {
  const rel = manager.relationshipsMap.get(relId);
  manager.doc.transact(() => {
    if (rel) {
      // Remove FK columns generated by this relationship in child table
      const childTable = manager.tablesMap.get(rel.childTableId);
      if (childTable) {
        const generatedColIds = new Set(rel.columnMappings.map((m) => m.childColumnId));
        const newOrder = childTable.columnOrder.filter((id) => !generatedColIds.has(id));
        const newCols = { ...childTable.columnsById };
        generatedColIds.forEach((id) => delete newCols[id]);

        manager.tablesMap.set(rel.childTableId, {
          ...childTable,
          columnOrder: newOrder,
          columnsById: newCols,
        });
      }
    }
    manager.relationshipsMap.delete(relId);
  }, manager.doc.clientID);
}

export function attachManualFkAction(
  manager: ERDDocManager,
  childTableId: string,
  childColumnId: string,
  parentTableId: string,
  parentColumnId: string,
  relationshipType: RelationshipType = 'non-identifying',
  cardinality: Cardinality = 'one-to-many',
  sourceMultiplicity?: CrowsFootMultiplicity,
  targetMultiplicity?: CrowsFootMultiplicity
): string | null {
  const childTable = manager.tablesMap.get(childTableId);
  const parentTable = manager.tablesMap.get(parentTableId);
  if (!childTable || !parentTable) return null;

  const childCol = childTable.columnsById[childColumnId];
  const parentCol = parentTable.columnsById[parentColumnId];
  if (!childCol || !parentCol) return null;

  const relId = `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const updatedChildCol: ColumnModel = {
    ...childCol,
    isFk: true,
    relationshipId: relId,
    sourceColumnId: parentCol.id,
  };

  const updatedChildTable: TableModel = {
    ...childTable,
    columnsById: {
      ...childTable.columnsById,
      [childColumnId]: updatedChildCol,
    },
  };

  const relationship: RelationshipModel = {
    id: relId,
    parentTableId,
    childTableId,
    columnMappings: [
      {
        parentColumnId: parentCol.id,
        childColumnId: childCol.id,
      },
    ],
    relationshipType,
    cardinality,
    sourceMultiplicity: sourceMultiplicity || 'one',
    targetMultiplicity:
      targetMultiplicity ||
      (cardinality === 'one-to-one'
        ? 'one'
        : relationshipType === 'identifying'
        ? 'mandatory-many'
        : 'optional-many'),
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
    constraintName: `FK_${childTable.physicalName}_${parentTable.physicalName}_${Date.now().toString().slice(-4)}`,
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(childTableId, updatedChildTable);
    manager.relationshipsMap.set(relId, relationship);
  }, manager.doc.clientID);

  return relId;
}

export function detachFkAction(
  manager: ERDDocManager,
  childTableId: string,
  childColumnId: string
) {
  const childTable = manager.tablesMap.get(childTableId);
  if (!childTable) return;

  const col = childTable.columnsById[childColumnId];
  if (!col) return;

  const relId = col.relationshipId;

  const updatedCol: ColumnModel = {
    ...col,
    isFk: false,
    relationshipId: undefined,
    sourceColumnId: undefined,
  };

  const updatedChildTable: TableModel = {
    ...childTable,
    columnsById: {
      ...childTable.columnsById,
      [childColumnId]: updatedCol,
    },
  };

  manager.doc.transact(() => {
    manager.tablesMap.set(childTableId, updatedChildTable);
    if (relId) {
      // If there are no other columns using this relId, delete relationship
      const rel = manager.relationshipsMap.get(relId);
      if (rel) {
        const remainingMappings = rel.columnMappings.filter((m) => m.childColumnId !== childColumnId);
        if (remainingMappings.length === 0) {
          manager.relationshipsMap.delete(relId);
        } else {
          manager.relationshipsMap.set(relId, {
            ...rel,
            columnMappings: remainingMappings,
          });
        }
      }
    }
  }, manager.doc.clientID);
}


// Memo Actions
export function addMemoAction(
  manager: ERDDocManager,
  content: string = '새로운 메모를 입력하세요...',
  x: number = 300,
  y: number = 300,
  color: string = '#fef08a',
  pageId?: string
): string {
  const memoId = `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const memo: MemoModel = {
    id: memoId,
    content,
    color,
    position: { x, y, width: 220, height: 160 },
    pageId,
  };

  manager.doc.transact(() => {
    manager.memosMap.set(memoId, memo);
  }, manager.doc.clientID);

  return memoId;
}

export function updateMemoAction(
  manager: ERDDocManager,
  memoId: string,
  updates: Partial<MemoModel>
) {
  const current = manager.memosMap.get(memoId);
  if (!current) return;

  const updated: MemoModel = {
    ...current,
    ...updates,
    position: updates.position
      ? { ...current.position, ...updates.position }
      : current.position,
  };

  manager.doc.transact(() => {
    manager.memosMap.set(memoId, updated);
  }, manager.doc.clientID);
}

export function deleteMemoAction(manager: ERDDocManager, memoId: string) {
  manager.doc.transact(() => {
    manager.memosMap.delete(memoId);
  }, manager.doc.clientID);
}

// Diagram Actions (Mermaid Sequence, Flowchart, etc.)
export const DEFAULT_MERMAID_SEQUENCE = `sequenceDiagram
    autonumber
    actor User as 사용자
    participant UI as 앱 화면 (Riverpod)
    participant Auth as SupabaseAuth
    participant Sync as SupabaseSyncService
    participant Hive as Local Hive DB
    participant Cloud as Supabase Cloud DB

    User->>Auth: 소셜 로그인 완료 (카카오/구글)
    Note over UI: 🔄 "데이터 동기화 중..." 로딩 오버레이 표시
    Auth->>Sync: syncOnAuthChange(userId) 트리거
    
    alt 기존 회원 (Cloud 데이터 존재)
        Sync->>Hive: _clearLocalBoxesForCleanPull() (tags 박스 포함 모두 클리어)
        Sync->>Cloud: pullSupabaseToLocalHive() (태그, 루틴, 설정 등 다운로드)
        Cloud-->>Hive: 사용자 고유 데이터만 로컬 Hive에 저장
    else 신규 회원 (첫 가입)
        Sync->>Cloud: migrateLocalHiveToSupabase() (게스트 데이터 업로드)
        Sync->>Hive: _clearLocalBoxesForCleanPull()
        Sync->>Cloud: pullSupabaseToLocalHive() (UUID 기반 정규 데이터로 재구축)
    end

    Sync-->>UI: ref.invalidate() 프로바이더 갱신
    Note over UI: ✅ 로딩 해제 및 내 클라우드 데이터만 깔끔하게 표시`;

export const DEFAULT_MERMAID_FLOWCHART = `flowchart TD
    Start([시작]) --> Auth{로그인 여부 확인}
    Auth -- 로그인됨 --> CloudSync[Supabase 클라우드 동기화]
    Auth -- 비로그인 --> LocalStorage[로컬 Hive DB 저장]
    CloudSync --> Cache[로컬 캐시 갱신]
    LocalStorage --> Main[메인 대시보드]
    Cache --> Main
    Main --> End([완료])`;

export function addDiagramAction(
  manager: ERDDocManager,
  title: string = '시스템 시퀀스 다이어그램',
  code: string = DEFAULT_MERMAID_SEQUENCE,
  x: number = 250,
  y: number = 200,
  type: string = 'sequence',
  pageId?: string
): string {
  const diagramId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const diagram: DiagramModel = {
    id: diagramId,
    title,
    type: type as any,
    code,
    theme: 'dark',
    position: { x, y, width: 480, height: 380 },
    pageId,
  };

  manager.doc.transact(() => {
    manager.diagramsMap.set(diagramId, diagram);
  }, manager.doc.clientID);

  return diagramId;
}

export function updateDiagramAction(
  manager: ERDDocManager,
  diagramId: string,
  updates: Partial<DiagramModel>
) {
  const current = manager.diagramsMap.get(diagramId);
  if (!current) return;

  const updated: DiagramModel = {
    ...current,
    ...updates,
    position: updates.position
      ? { ...current.position, ...updates.position }
      : current.position,
  };

  manager.doc.transact(() => {
    manager.diagramsMap.set(diagramId, updated);
  }, manager.doc.clientID);
}

export function deleteDiagramAction(manager: ERDDocManager, diagramId: string) {
  manager.doc.transact(() => {
    manager.diagramsMap.delete(diagramId);
  }, manager.doc.clientID);
}

export function duplicateDiagramAction(
  manager: ERDDocManager,
  diagramId: string
): string | null {
  const original = manager.diagramsMap.get(diagramId);
  if (!original) return null;

  const newDiagramId = `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const duplicated: DiagramModel = {
    ...original,
    id: newDiagramId,
    title: `${original.title} (복사본)`,
    position: {
      ...original.position,
      x: (original.position?.x ?? 200) + 40,
      y: (original.position?.y ?? 200) + 40,
    },
  };

  manager.doc.transact(() => {
    manager.diagramsMap.set(newDiagramId, duplicated);
  }, manager.doc.clientID);

  return newDiagramId;
}

// Page Actions (Figma Style Multi-Page/Tabs)
export function addPageAction(
  manager: ERDDocManager,
  name: string = '새 페이지',
  icon?: string
): string {
  const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const count = manager.pagesMap.size;
  const page: PageModel = {
    id: pageId,
    name,
    order: count,
    icon,
  };

  manager.doc.transact(() => {
    manager.pagesMap.set(pageId, page);
  }, manager.doc.clientID);

  return pageId;
}

export function updatePageAction(
  manager: ERDDocManager,
  pageId: string,
  updates: Partial<PageModel>
) {
  const current = manager.pagesMap.get(pageId);
  if (!current) return;

  const updated: PageModel = { ...current, ...updates };
  manager.doc.transact(() => {
    manager.pagesMap.set(pageId, updated);
  }, manager.doc.clientID);
}

export function deletePageAction(manager: ERDDocManager, pageId: string) {
  manager.doc.transact(() => {
    // 1. 해당 페이지에 속한 테이블 & 노드 삭제
    const tablesToDelete: string[] = [];
    manager.tablesMap.forEach((table, tId) => {
      if (table.pageId === pageId) {
        tablesToDelete.push(tId);
      }
    });
    tablesToDelete.forEach((tId) => {
      manager.tablesMap.delete(tId);
      manager.nodesMap.delete(tId);
    });

    // 2. 해당 페이지에 속한 메모 삭제
    const memosToDelete: string[] = [];
    manager.memosMap.forEach((memo, mId) => {
      if (memo.pageId === pageId) {
        memosToDelete.push(mId);
      }
    });
    memosToDelete.forEach((mId) => manager.memosMap.delete(mId));

    // 3. 해당 페이지에 속한 다이어그램 삭제
    const diagsToDelete: string[] = [];
    manager.diagramsMap.forEach((diag, dId) => {
      if (diag.pageId === pageId) {
        diagsToDelete.push(dId);
      }
    });
    diagsToDelete.forEach((dId) => manager.diagramsMap.delete(dId));

    // 4. 고아 릴레이션십 정리
    const relsToDelete: string[] = [];
    manager.relationshipsMap.forEach((rel, rId) => {
      if (!manager.tablesMap.has(rel.parentTableId) || !manager.tablesMap.has(rel.childTableId)) {
        relsToDelete.push(rId);
      }
    });
    relsToDelete.forEach((rId) => manager.relationshipsMap.delete(rId));

    // 5. 페이지 자체 삭제
    manager.pagesMap.delete(pageId);

    // 만약 모든 페이지가 삭제되어 0개가 되었다면 기본 메인 ERD 페이지 1개 자동 복구
    if (manager.pagesMap.size === 0) {
      const defId = `page_${Date.now()}`;
      manager.pagesMap.set(defId, {
        id: defId,
        name: '메인 ERD',
        order: 0,
      });
    }
  }, manager.doc.clientID);
}

export function reorderPagesAction(manager: ERDDocManager, orderedPageIds: string[]) {
  manager.doc.transact(() => {
    orderedPageIds.forEach((pId, idx) => {
      const page = manager.pagesMap.get(pId);
      if (page && page.order !== idx) {
        manager.pagesMap.set(pId, { ...page, order: idx });
      }
    });
  }, manager.doc.clientID);
}

// Position updating
export function updateNodePositionAction(
  manager: ERDDocManager,
  tableId: string,
  x: number,
  y: number
) {
  const current = manager.nodesMap.get(tableId);
  if (!current) {
    const newNode: NodeView = {
      id: `node_${tableId}`,
      tableId,
      position: { x, y },
    };
    manager.doc.transact(() => {
      manager.nodesMap.set(tableId, newNode);
    }, manager.doc.clientID);
    return;
  }

  const updated: NodeView = {
    ...current,
    position: { ...current.position, x, y },
  };

  manager.doc.transact(() => {
    manager.nodesMap.set(tableId, updated);
  }, manager.doc.clientID);
}

// Domain Actions
export function addDomainAction(
  manager: ERDDocManager,
  name: string,
  dataType: string,
  defaultValue?: string
): string {
  const domainId = `dom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: DomainItem = {
    id: domainId,
    name,
    dataType,
    defaultValue: defaultValue || '',
  };
  manager.doc.transact(() => {
    manager.domainsMap.set(domainId, item);
  }, manager.doc.clientID);
  return domainId;
}

export function updateDomainAction(
  manager: ERDDocManager,
  domainId: string,
  updates: Partial<DomainItem>
) {
  const current = manager.domainsMap.get(domainId);
  if (!current) return;
  const updated: DomainItem = { ...current, ...updates };
  manager.doc.transact(() => {
    manager.domainsMap.set(domainId, updated);
  }, manager.doc.clientID);
}

export function deleteDomainAction(manager: ERDDocManager, domainId: string) {
  manager.doc.transact(() => {
    manager.domainsMap.delete(domainId);
  }, manager.doc.clientID);
}

/**
 * Cascade Sync: 해당 도메인을 사용하고 있는 전체 테이블의 모든 컬럼을 최신 타입/기본값으로 일괄 동기화
 */
export function syncDomainColumnsAction(
  manager: ERDDocManager,
  domain: DomainItem
): number {
  let updatedCount = 0;
  const dtVal = domain.dataType.trim();
  const match = dtVal.match(/^([a-zA-Z0-9_\[\]]+)(?:\((\d+)\))?/);
  const nextType = match
    ? { name: match[1], length: match[2] ? parseInt(match[2], 10) : undefined }
    : { name: dtVal };

  manager.doc.transact(() => {
    manager.tablesMap.forEach((table, tableId) => {
      let tableModified = false;
      const updatedCols = { ...table.columnsById };

      table.columnOrder.forEach((colId) => {
        const col = updatedCols[colId];
        if (col && (col.domainId === domain.id || col.domain === domain.name)) {
          updatedCols[colId] = {
            ...col,
            domainId: domain.id,
            domain: domain.name,
            type: nextType,
            defaultExpression: domain.defaultValue !== undefined ? domain.defaultValue : col.defaultExpression,
          };
          tableModified = true;
          updatedCount++;
        }
      });

      if (tableModified) {
        manager.tablesMap.set(tableId, {
          ...table,
          columnsById: updatedCols,
        });
      }
    });
  }, manager.doc.clientID);

  return updatedCount;
}

// Meta actions
export function updateProjectTitleAction(manager: ERDDocManager, title: string) {
  manager.doc.transact(() => {
    manager.metaMap.set('title', title);
  }, manager.doc.clientID);
}

