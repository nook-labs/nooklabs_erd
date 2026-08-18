import { ERDDocManager } from './doc';
import {
  ERDSnapshot,
  TableModel,
  RelationshipModel,
  NodeView,
  MemoModel,
  DomainItem,
  ColumnModel,
} from '@/types/erd';
import { restoreVersionSnapshotAction } from './versionActions';

export interface ImportParsedResult {
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  nodes: Record<string, NodeView>;
  memos: Record<string, MemoModel>;
  domains: DomainItem[];
  projectTitle?: string;
}

/**
 * Normalizes a single table to ensure columnsById, columnOrder, and primaryKeyId are robust
 */
function normalizeTable(rawTable: any, tableId: string): TableModel {
  const normalizedId = rawTable.id || tableId;
  const logicalName = rawTable.logicalName || rawTable.name || '신규 테이블';
  const physicalName = rawTable.physicalName || rawTable.name || 'new_table';

  const columnsById: Record<string, ColumnModel> = {};
  const columnOrder: string[] = [];

  // If table has columns as an array (e.g. columns: [...])
  if (Array.isArray(rawTable.columns)) {
    rawTable.columns.forEach((col: any, idx: number) => {
      const colId = col.id || `col_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const colType =
        typeof col.type === 'string'
          ? { name: col.type }
          : col.type && col.type.name
          ? col.type
          : { name: 'VARCHAR', length: 255 };

      columnsById[colId] = {
        id: colId,
        logicalName: col.logicalName || col.name || `컬럼_${idx + 1}`,
        physicalName: col.physicalName || col.name || `col_${idx + 1}`,
        type: colType,
        nullable: col.nullable ?? true,
        isPk: Boolean(col.isPk || col.pk),
        isFk: Boolean(col.isFk || col.fk),
        autoIncrement: Boolean(col.autoIncrement),
        domain: col.domain || '',
        defaultExpression: col.defaultExpression || '',
        comment: col.comment || '',
        origin: col.origin || 'user',
      };
      columnOrder.push(colId);
    });
  }
  // If table already has columnsById & columnOrder
  else if (rawTable.columnsById && typeof rawTable.columnsById === 'object') {
    Object.entries(rawTable.columnsById).forEach(([cId, col]: [string, any]) => {
      const colType =
        typeof col.type === 'string'
          ? { name: col.type }
          : col.type && col.type.name
          ? col.type
          : { name: 'VARCHAR', length: 255 };

      columnsById[cId] = {
        ...col,
        id: cId,
        type: colType,
      };
    });

    if (Array.isArray(rawTable.columnOrder) && rawTable.columnOrder.length > 0) {
      columnOrder.push(...rawTable.columnOrder);
    } else {
      columnOrder.push(...Object.keys(columnsById));
    }
  }

  // Ensure Primary Key is identified
  let primaryKeyId = rawTable.primaryKeyId;
  if (!primaryKeyId || !columnsById[primaryKeyId]) {
    const foundPk = Object.values(columnsById).find((c) => c.isPk);
    primaryKeyId = foundPk ? foundPk.id : columnOrder[0];
  }

  return {
    id: normalizedId,
    schemaName: rawTable.schemaName || 'public',
    logicalName,
    physicalName,
    comment: rawTable.comment || '',
    headerColor: rawTable.headerColor || '#4f46e5',
    columnOrder,
    columnsById,
    primaryKeyId,
    indexIds: rawTable.indexIds || [],
    constraintIds: rawTable.constraintIds || [],
  };
}

/**
 * Normalizes relationships to ensure validity
 */
function normalizeRelationship(rawRel: any, relId: string): RelationshipModel {
  return {
    id: rawRel.id || relId,
    parentTableId: rawRel.parentTableId,
    childTableId: rawRel.childTableId,
    columnMappings: Array.isArray(rawRel.columnMappings) ? rawRel.columnMappings : [],
    relationshipType: rawRel.relationshipType || 'non-identifying',
    cardinality: rawRel.cardinality || 'one-to-many',
    sourceMultiplicity: rawRel.sourceMultiplicity || 'one',
    targetMultiplicity: rawRel.targetMultiplicity || 'optional-many',
    onDelete: rawRel.onDelete || 'NO ACTION',
    onUpdate: rawRel.onUpdate || 'NO ACTION',
    constraintName: rawRel.constraintName || `FK_${relId}`,
  };
}

/**
 * Parses raw JSON text and normalizes into ImportParsedResult with robust fallback
 */
export function parseImportJSON(jsonString: string): ImportParsedResult {
  const parsed = JSON.parse(jsonString);

  const result: ImportParsedResult = {
    tables: {},
    relationships: {},
    nodes: {},
    memos: {},
    domains: [],
  };

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('유효하지 않은 JSON 데이터입니다.');
  }

  // Format 1: SchemaModel format ({ tablesById, relationshipsById })
  if (parsed.tablesById && typeof parsed.tablesById === 'object') {
    Object.entries(parsed.tablesById).forEach(([tblId, tbl]: [string, any]) => {
      result.tables[tblId] = normalizeTable(tbl, tblId);
    });

    if (parsed.relationshipsById && typeof parsed.relationshipsById === 'object') {
      Object.entries(parsed.relationshipsById).forEach(([relId, rel]: [string, any]) => {
        result.relationships[relId] = normalizeRelationship(rel, relId);
      });
    }
  }
  // Format 2: ERDSnapshot format ({ tables, relationships, nodes, memos, domains })
  else if (parsed.tables && typeof parsed.tables === 'object') {
    Object.entries(parsed.tables).forEach(([tblId, tbl]: [string, any]) => {
      result.tables[tblId] = normalizeTable(tbl, tblId);
    });

    if (parsed.relationships && typeof parsed.relationships === 'object') {
      Object.entries(parsed.relationships).forEach(([relId, rel]: [string, any]) => {
        result.relationships[relId] = normalizeRelationship(rel, relId);
      });
    }

    if (parsed.nodes && typeof parsed.nodes === 'object') {
      Object.entries(parsed.nodes).forEach(([nodeId, node]: [string, any]) => {
        result.nodes[nodeId] = {
          id: node.id || `node_${nodeId}`,
          tableId: node.tableId || nodeId,
          position: {
            x: typeof node.position?.x === 'number' ? node.position.x : 100,
            y: typeof node.position?.y === 'number' ? node.position.y : 100,
            width: node.position?.width || 340,
            height: node.position?.height || 220,
          },
        };
      });
    }

    if (parsed.memos && typeof parsed.memos === 'object') {
      result.memos = { ...parsed.memos };
    }

    if (Array.isArray(parsed.domains)) {
      result.domains = [...parsed.domains];
    }

    if (parsed.projectTitle) {
      result.projectTitle = parsed.projectTitle;
    }
  }
  // Format 3: Raw array of tables [{ id, physicalName, ... }]
  else if (Array.isArray(parsed)) {
    parsed.forEach((item: any, idx: number) => {
      const tblId = item.id || `tbl_${Date.now()}_${idx}`;
      result.tables[tblId] = normalizeTable(item, tblId);
    });
  } else {
    throw new Error('인식할 수 없는 ERD 스키마 포맷입니다. tablesById 또는 tables 필드가 필요합니다.');
  }

  // Generate missing nodes (Auto Grid Placement) for tables that don't have node coordinates
  const tableKeys = Object.keys(result.tables);
  const cols = Math.max(1, Math.ceil(Math.sqrt(tableKeys.length)));
  const spacingX = 400;
  const spacingY = 300;

  tableKeys.forEach((tblId, idx) => {
    if (!result.nodes[tblId]) {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      result.nodes[tblId] = {
        id: `node_${tblId}`,
        tableId: tblId,
        position: {
          x: 100 + col * spacingX,
          y: 100 + row * spacingY,
          width: 340,
          height: 220,
        },
      };
    }
  });

  return result;
}

/**
 * Replace entire Yjs doc with parsed JSON data
 */
export function importReplaceAction(
  manager: ERDDocManager,
  data: ImportParsedResult
): void {
  const snapshot: ERDSnapshot = {
    tables: data.tables,
    relationships: data.relationships,
    nodes: data.nodes,
    memos: data.memos,
    domains: data.domains,
    projectTitle: data.projectTitle,
  };

  restoreVersionSnapshotAction(manager, snapshot);
}

/**
 * Merge parsed JSON data into existing Yjs doc
 */
export function importMergeAction(
  manager: ERDDocManager,
  data: ImportParsedResult
): void {
  manager.doc.transact(() => {
    // Merge Tables & Nodes
    Object.entries(data.tables).forEach(([tableId, table]) => {
      manager.tablesMap.set(tableId, table);
    });

    Object.entries(data.nodes).forEach(([nodeId, node]) => {
      manager.nodesMap.set(nodeId, node);
    });

    // Merge Relationships
    Object.entries(data.relationships).forEach(([relId, rel]) => {
      manager.relationshipsMap.set(relId, rel);
    });

    // Merge Memos
    Object.entries(data.memos).forEach(([memoId, memo]) => {
      manager.memosMap.set(memoId, memo);
    });

    // Merge Domains
    data.domains.forEach((dom) => {
      manager.domainsMap.set(dom.id, dom);
    });
  }, manager.doc.clientID);
}
