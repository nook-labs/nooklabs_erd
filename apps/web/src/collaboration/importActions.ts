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
import { parseDataType } from '@/lib/dataType';

export interface ImportParsedResult {
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  nodes: Record<string, NodeView>;
  memos: Record<string, MemoModel>;
  domains: DomainItem[];
  projectTitle?: string;
  /** JSON에 좌표(nodes)가 명시적으로 들어있던 테이블 ID */
  providedNodeIds: string[];
  /** AI JSON에서 컬럼을 이름으로 지정한 관계선 힌트 */
  relationshipColumnHints: Record<string, { parentColumn?: string; childColumn?: string }[]>;
}

/**
 * 불러온 컬럼별로 JSON에 "명시적으로 들어있던" 속성 키 기록
 * - 병합 시 키가 있으면 그 값으로 덮어쓰고, 없으면 기존 값을 유지하기 위함
 * - 저장 데이터를 오염시키지 않도록 WeakMap에 별도 보관
 */
const explicitColumnKeys = new WeakMap<ColumnModel, Set<string>>();
const explicitRelationshipKeys = new WeakMap<RelationshipModel, Set<string>>();

const has = (obj: any, ...keys: string[]) =>
  keys.some((k) => Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined);

function toDataType(rawType: any) {
  if (typeof rawType === 'string') return parseDataType(rawType);
  if (rawType && rawType.name) {
    // { name: "varchar(30)" } 처럼 괄호가 포함된 이름도 분해
    return rawType.name.includes('(') && rawType.length === undefined && rawType.precision === undefined
      ? parseDataType(rawType.name)
      : rawType;
  }
  return { name: 'VARCHAR', length: 255 };
}

function readDefaultExpression(col: any): string | undefined {
  const key = ['defaultExpression', 'default', 'defaultValue'].find((k) =>
    Object.prototype.hasOwnProperty.call(col, k)
  );
  if (!key) return undefined;
  const v = col[key];
  if (v === null || v === undefined) return '';
  return String(v).trim();
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
      const colType = toDataType(col.type);
      const nullable =
        typeof col.nullable === 'boolean'
          ? col.nullable
          : typeof col.notNull === 'boolean'
          ? !col.notNull
          : true;

      columnsById[colId] = {
        id: colId,
        logicalName: col.logicalName || col.name || `컬럼_${idx + 1}`,
        physicalName: col.physicalName || col.name || `col_${idx + 1}`,
        type: colType,
        nullable,
        isPk: Boolean(col.isPk || col.pk),
        isFk: Boolean(col.isFk || col.fk),
        autoIncrement: Boolean(col.autoIncrement),
        domain: col.domain || '',
        // 키가 명시되어 있으면(null/'' 포함) 그 값을 그대로 사용 → 병합 시 기본값 삭제 가능
        // 키 자체가 없으면 undefined → 병합 시 기존 값 유지
        defaultExpression: readDefaultExpression(col),
        comment: col.comment || '',
        origin: col.origin || 'user',
      };
      const keys = new Set<string>();
      if (has(col, 'nullable', 'notNull')) keys.add('nullable');
      if (has(col, 'autoIncrement')) keys.add('autoIncrement');
      explicitColumnKeys.set(columnsById[colId], keys);
      columnOrder.push(colId);
    });
  }
  // If table already has columnsById & columnOrder
  else if (rawTable.columnsById && typeof rawTable.columnsById === 'object') {
    Object.entries(rawTable.columnsById).forEach(([cId, col]: [string, any]) => {
      const colType = toDataType(col.type);

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
    headerColor: rawTable.headerColor || undefined,
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
/**
 * Normalizes relationships to ensure validity, with smart physicalName lookup for AI-generated JSON
 */
function normalizeRelationship(
  rawRel: any,
  relId: string,
  tableMap?: Record<string, TableModel>
): RelationshipModel {
  let parentId = rawRel.parentTableId || rawRel.parentTable || rawRel.parent;
  let childId = rawRel.childTableId || rawRel.childTable || rawRel.child;

  // If AI provided physical table names instead of IDs (e.g. parentTable: "users", childTable: "orders")
  if (tableMap) {
    const tableList = Object.values(tableMap);
    const foundParent = tableList.find(
      (t) => t.id === parentId || t.physicalName === parentId || t.logicalName === parentId
    );
    if (foundParent) parentId = foundParent.id;

    const foundChild = tableList.find(
      (t) => t.id === childId || t.physicalName === childId || t.logicalName === childId
    );
    if (foundChild) childId = foundChild.id;
  }

  const relationshipType: RelationshipModel['relationshipType'] =
    rawRel.relationshipType === 'identifying' ? 'identifying' : 'non-identifying';
  const cardinality: RelationshipModel['cardinality'] =
    rawRel.cardinality === 'one-to-one' || rawRel.cardinality === 'many-to-many'
      ? rawRel.cardinality
      : 'one-to-many';

  const rel: RelationshipModel = {
    id: rawRel.id || relId,
    parentTableId: parentId || '',
    childTableId: childId || '',
    columnMappings: Array.isArray(rawRel.columnMappings)
      ? rawRel.columnMappings.filter((m: any) => m && m.parentColumnId && m.childColumnId)
      : [],
    relationshipType,
    cardinality,
    sourceMultiplicity: rawRel.sourceMultiplicity || 'one',
    // 수동 생성(addRelationshipAction)과 동일한 기본 기호 규칙
    targetMultiplicity:
      rawRel.targetMultiplicity || defaultTargetMultiplicity(relationshipType, cardinality),
    onDelete: rawRel.onDelete || 'NO ACTION',
    onUpdate: rawRel.onUpdate || 'NO ACTION',
    constraintName: rawRel.constraintName || undefined,
  };

  explicitRelationshipKeys.set(
    rel,
    new Set(
      [
        'relationshipType',
        'cardinality',
        'sourceMultiplicity',
        'targetMultiplicity',
        'onDelete',
        'onUpdate',
        'constraintName',
      ].filter((k) => has(rawRel, k))
    )
  );
  return rel;
}

function defaultTargetMultiplicity(
  relationshipType: RelationshipModel['relationshipType'],
  cardinality: RelationshipModel['cardinality']
): NonNullable<RelationshipModel['targetMultiplicity']> {
  if (cardinality === 'one-to-one') return 'one';
  return relationshipType === 'identifying' ? 'mandatory-many' : 'optional-many';
}

/**
 * AI JSON에서 흔히 쓰는 컬럼 이름 기반 매핑 표기를 수집
 *  - { parentColumn: "id", childColumn: "user_id" }
 *  - { columnMappings: [{ parentColumn: "id", childColumn: "user_id" }] }
 */
function collectColumnHints(result: ImportParsedResult, relId: string, rawRel: any) {
  const hints: { parentColumn?: string; childColumn?: string }[] = [];
  const pc = rawRel.parentColumn || rawRel.parentColumnName || rawRel.referencedColumn;
  const cc = rawRel.childColumn || rawRel.childColumnName || rawRel.foreignKey || rawRel.fkColumn;
  if (pc || cc) hints.push({ parentColumn: pc, childColumn: cc });
  if (Array.isArray(rawRel.columnMappings)) {
    rawRel.columnMappings.forEach((m: any) => {
      if (!m || (m.parentColumnId && m.childColumnId)) return;
      const mp = m.parentColumn || m.parentColumnName;
      const mc = m.childColumn || m.childColumnName;
      if (mp || mc) hints.push({ parentColumn: mp, childColumn: mc });
    });
  }
  if (hints.length > 0) result.relationshipColumnHints[relId] = hints;
}

/**
 * Strips markdown code blocks and extracts outermost JSON structure from AI response text
 */
function extractJsonFromText(rawText: string): string {
  let cleaned = rawText.trim();

  // 1. If wrapped in markdown code fence (```json ... ``` or ``` ...)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 2. Find outermost JSON boundaries ({...} or [...])
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIndex = -1;
  let isObject = false;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isObject = false;
  }

  if (startIndex !== -1) {
    const lastChar = isObject ? '}' : ']';
    const endIndex = cleaned.lastIndexOf(lastChar);
    if (endIndex !== -1 && endIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
  }

  return cleaned;
}

/**
 * Parses raw JSON text and normalizes into ImportParsedResult with robust fallback for AI JSON
 */
export function parseImportJSON(jsonString: string): ImportParsedResult {
  const cleanedText = extractJsonFromText(jsonString);
  const parsed = JSON.parse(cleanedText);

  const result: ImportParsedResult = {
    tables: {},
    relationships: {},
    nodes: {},
    memos: {},
    domains: [],
    providedNodeIds: [],
    relationshipColumnHints: {},
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
        result.relationships[relId] = normalizeRelationship(rel, relId, result.tables);
        collectColumnHints(result, relId, rel);
      });
    }
  }
  // Format 2: ERDSnapshot / AI friendly format ({ tables, relationships, nodes, memos, domains })
  else if (parsed.tables) {
    // 2-A. tables as Array (AI favorite format: { tables: [ ... ] })
    if (Array.isArray(parsed.tables)) {
      parsed.tables.forEach((tbl: any, idx: number) => {
        const tblId = tbl.id || `tbl_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        result.tables[tblId] = normalizeTable(tbl, tblId);
      });
    }
    // 2-B. tables as Object Record ({ tbl_1: { ... } })
    else if (typeof parsed.tables === 'object') {
      Object.entries(parsed.tables).forEach(([tblId, tbl]: [string, any]) => {
        result.tables[tblId] = normalizeTable(tbl, tblId);
      });
    }

    // Relationships (supports Array or Object)
    if (Array.isArray(parsed.relationships)) {
      parsed.relationships.forEach((rel: any, idx: number) => {
        const relId = rel.id || `rel_${Date.now()}_${idx}`;
        result.relationships[relId] = normalizeRelationship(rel, relId, result.tables);
        collectColumnHints(result, relId, rel);
      });
    } else if (parsed.relationships && typeof parsed.relationships === 'object') {
      Object.entries(parsed.relationships).forEach(([relId, rel]: [string, any]) => {
        result.relationships[relId] = normalizeRelationship(rel, relId, result.tables);
        collectColumnHints(result, relId, rel);
      });
    }

    if (parsed.nodes && typeof parsed.nodes === 'object') {
      Object.entries(parsed.nodes).forEach(([nodeId, node]: [string, any]) => {
        result.providedNodeIds.push(node.tableId || nodeId);
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

// ─────────────────────────────────────────────────────────────
// 병합(Merge) 계획: 기존 캔버스와 매칭하여 위치 유지 + 내용 업데이트
// ─────────────────────────────────────────────────────────────

export interface ImportMergePlan {
  /** 최종으로 set 할 테이블 (기존 업데이트 + 신규) */
  tables: Record<string, TableModel>;
  /** 신규 테이블의 노드 (기존 테이블은 위치 유지 → 포함하지 않음) */
  nodes: Record<string, NodeView>;
  /** 최종으로 set 할 관계선 (기존 업데이트 + 신규) */
  relationships: Record<string, RelationshipModel>;
  updatedTableNames: string[];
  newTableNames: string[];
  newRelationshipCount: number;
  updatedRelationshipCount: number;
  warnings: string[];
}

export interface ExistingState {
  tables: Record<string, TableModel>;
  nodes: Record<string, NodeView>;
  relationships: Record<string, RelationshipModel>;
}

const norm = (v?: string) => (v || '').trim().toLowerCase();

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ses') || word.endsWith('xes')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function findTableByRef(tables: Record<string, TableModel>, ref: string): TableModel | undefined {
  if (!ref) return undefined;
  if (tables[ref]) return tables[ref];
  const key = norm(ref);
  const list = Object.values(tables);
  return (
    list.find((t) => norm(t.physicalName) === key) ||
    list.find((t) => norm(t.logicalName) === key)
  );
}

function findColumnByName(table: TableModel, name?: string): ColumnModel | undefined {
  if (!name) return undefined;
  if (table.columnsById[name]) return table.columnsById[name];
  const key = norm(name);
  const cols = Object.values(table.columnsById);
  return cols.find((c) => norm(c.physicalName) === key) || cols.find((c) => norm(c.logicalName) === key);
}

function estimateTableHeight(table: TableModel): number {
  return 30 + (table.columnOrder?.length || 1) * 22 + 20;
}

/** 신규 컬럼은 undefined 대신 빈 문자열로 저장 */
function withDefinedDefaults(col: ColumnModel): ColumnModel {
  return col.defaultExpression === undefined ? { ...col, defaultExpression: '' } : col;
}

function finalizeNewTable(table: TableModel): TableModel {
  const columnsById: Record<string, ColumnModel> = {};
  Object.entries(table.columnsById).forEach(([id, c]) => (columnsById[id] = withDefinedDefaults(c)));
  return { ...table, columnsById };
}

/** 기존 테이블 위에 불러온 테이블 내용을 덮어씀 (ID/위치/페이지/색상 유지) */
function mergeTableContent(
  existing: TableModel,
  incoming: TableModel,
  referencedColumnIds: Set<string>
): TableModel {
  const existingByName = new Map<string, ColumnModel>();
  Object.values(existing.columnsById).forEach((c) => existingByName.set(norm(c.physicalName), c));

  const columnsById: Record<string, ColumnModel> = {};
  const columnOrder: string[] = [];

  incoming.columnOrder.forEach((inId) => {
    const inCol = incoming.columnsById[inId];
    if (!inCol) return;
    const match = existingByName.get(norm(inCol.physicalName)) || existing.columnsById[inCol.id];
    if (match && !columnsById[match.id]) {
      const explicit = explicitColumnKeys.get(inCol) || new Set<string>();
      columnsById[match.id] = {
        ...match,
        logicalName: inCol.logicalName || match.logicalName,
        physicalName: inCol.physicalName || match.physicalName,
        type: inCol.type,
        nullable: explicit.has('nullable') ? inCol.nullable : match.nullable,
        isPk: inCol.isPk,
        // 관계선이 참조 중인 FK는 유지, 그 외에는 JSON 값을 따름
        isFk: Boolean(inCol.isFk || (match.isFk && referencedColumnIds.has(match.id))),
        autoIncrement: explicit.has('autoIncrement') ? inCol.autoIncrement : match.autoIncrement,
        defaultExpression:
          inCol.defaultExpression !== undefined ? inCol.defaultExpression : match.defaultExpression || '',
        comment: inCol.comment || match.comment,
        domain: inCol.domain || match.domain,
      };
      columnOrder.push(match.id);
    } else {
      columnsById[inCol.id] = withDefinedDefaults(inCol);
      columnOrder.push(inCol.id);
    }
  });

  // 불러온 JSON에 없지만 관계선이 참조 중인 컬럼은 보존 (관계선 깨짐 방지)
  existing.columnOrder.forEach((cId) => {
    if (!columnsById[cId] && referencedColumnIds.has(cId) && existing.columnsById[cId]) {
      columnsById[cId] = existing.columnsById[cId];
      columnOrder.push(cId);
    }
  });

  const pk = Object.values(columnsById).find((c) => c.isPk);

  return {
    ...existing,
    logicalName: incoming.logicalName || existing.logicalName,
    physicalName: incoming.physicalName || existing.physicalName,
    comment: incoming.comment || existing.comment,
    headerColor: incoming.headerColor || existing.headerColor,
    columnsById,
    columnOrder,
    primaryKeyId: pk ? pk.id : columnOrder[0],
  };
}

/** 관계선에 컬럼 매핑이 없으면 부모 PK ↔ 자식 FK 컬럼을 이름으로 추론 */
function inferColumnMappings(
  parent: TableModel,
  child: TableModel,
  usedChildColumnIds: Set<string>
): { parentColumnId: string; childColumnId: string }[] {
  const parentPks = Object.values(parent.columnsById).filter((c) => c.isPk);
  if (parentPks.length === 0) {
    const fallback = parent.columnsById[parent.primaryKeyId || parent.columnOrder[0]];
    if (fallback) parentPks.push(fallback);
  }

  const childCols = child.columnOrder.map((id) => child.columnsById[id]).filter(Boolean);
  const parentName = norm(parent.physicalName);
  const tokens = parentName.split('_').filter(Boolean);
  const mappings: { parentColumnId: string; childColumnId: string }[] = [];

  parentPks.forEach((pk) => {
    const pkName = norm(pk.physicalName);
    const candidates = new Set<string>([
      `${parentName}_${pkName}`,
      `${singularize(parentName)}_${pkName}`,
    ]);
    if (tokens.length > 0) {
      candidates.add(`${singularize(tokens[0])}_${pkName}`);
      candidates.add(`${singularize(tokens[tokens.length - 1])}_${pkName}`);
    }

    let found = childCols.find(
      (c) => !usedChildColumnIds.has(c.id) && candidates.has(norm(c.physicalName))
    );
    // 이름이 PK와 같은 FK 컬럼 (예: 부모 PK가 user_id, 자식도 user_id)
    if (!found) {
      found = childCols.find(
        (c) => !usedChildColumnIds.has(c.id) && c.isFk && norm(c.physicalName) === pkName
      );
    }
    // 자식에 미사용 FK 컬럼이 딱 하나뿐이면 그것으로 연결
    if (!found && parentPks.length === 1) {
      const freeFks = childCols.filter((c) => c.isFk && !usedChildColumnIds.has(c.id));
      if (freeFks.length === 1) found = freeFks[0];
    }

    if (found) {
      usedChildColumnIds.add(found.id);
      mappings.push({ parentColumnId: pk.id, childColumnId: found.id });
    }
  });

  return mappings;
}

/**
 * 불러온 데이터를 현재 캔버스 상태와 비교하여 병합 계획을 생성 (순수 함수, 미리보기용)
 */
export function buildImportMergePlan(
  existing: ExistingState,
  data: ImportParsedResult,
  activePageId?: string
): ImportMergePlan {
  const warnings: string[] = [];
  const updatedTableNames: string[] = [];
  const newTableNames: string[] = [];

  // 관계선이 참조 중인 기존 컬럼 ID
  const referencedColumnIds = new Set<string>();
  Object.values(existing.relationships).forEach((rel) =>
    (rel.columnMappings || []).forEach((m) => {
      referencedColumnIds.add(m.parentColumnId);
      referencedColumnIds.add(m.childColumnId);
    })
  );

  // 1. 테이블 매칭 (ID 또는 물리명)
  const idMap: Record<string, string> = {}; // importedId -> finalId
  const finalTables: Record<string, TableModel> = {};
  const newTableIds: string[] = [];

  Object.entries(data.tables).forEach(([importId, incoming]) => {
    const match =
      existing.tables[incoming.id] ||
      Object.values(existing.tables).find((t) => norm(t.physicalName) === norm(incoming.physicalName));

    if (match) {
      idMap[importId] = match.id;
      finalTables[match.id] = mergeTableContent(match, incoming, referencedColumnIds);
      updatedTableNames.push(match.physicalName);
    } else {
      idMap[importId] = incoming.id;
      finalTables[incoming.id] = finalizeNewTable({ ...incoming, pageId: incoming.pageId || activePageId });
      newTableIds.push(incoming.id);
      newTableNames.push(incoming.physicalName);
    }
  });

  // 관계선 해석용: 기존 테이블 + 병합 결과
  const allTables: Record<string, TableModel> = { ...existing.tables, ...finalTables };
  const touchedTable = (id: string): TableModel => {
    if (!finalTables[id]) finalTables[id] = { ...allTables[id] };
    return finalTables[id];
  };

  // 2. 관계선 해석
  const finalRels: Record<string, RelationshipModel> = {};
  let newRelationshipCount = 0;
  let updatedRelationshipCount = 0;
  const usedChildCols = new Map<string, Set<string>>();
  Object.values(existing.relationships).forEach((rel) => {
    if (!usedChildCols.has(rel.childTableId)) usedChildCols.set(rel.childTableId, new Set());
    (rel.columnMappings || []).forEach((m) => usedChildCols.get(rel.childTableId)!.add(m.childColumnId));
  });

  Object.entries(data.relationships).forEach(([relId, rel]) => {
    const parentId = idMap[rel.parentTableId] || findTableByRef(allTables, rel.parentTableId)?.id;
    const childId = idMap[rel.childTableId] || findTableByRef(allTables, rel.childTableId)?.id;

    if (!parentId || !allTables[parentId] || !childId || !allTables[childId]) {
      const missing = [
        !parentId || !allTables[parentId] ? rel.parentTableId : null,
        !childId || !allTables[childId] ? rel.childTableId : null,
      ].filter(Boolean);
      warnings.push(`관계선 생략: '${missing.join(', ')}' 테이블을 캔버스/JSON에서 찾을 수 없습니다.`);
      return;
    }

    const parent = finalTables[parentId] || allTables[parentId];
    const child = finalTables[childId] || allTables[childId];
    if (!usedChildCols.has(childId)) usedChildCols.set(childId, new Set());
    const used = usedChildCols.get(childId)!;

    // 컬럼 매핑: (1) 유효한 ID 매핑 (2) 이름 힌트 (3) 이름 추론
    let mappings = rel.columnMappings.filter(
      (m) => parent.columnsById[m.parentColumnId] && child.columnsById[m.childColumnId]
    );
    const hints = data.relationshipColumnHints[relId];
    if (mappings.length === 0 && hints) {
      hints.forEach((h) => {
        const pc =
          findColumnByName(parent, h.parentColumn) ||
          parent.columnsById[parent.primaryKeyId || ''];
        const cc = findColumnByName(child, h.childColumn);
        if (pc && cc) {
          used.add(cc.id);
          mappings.push({ parentColumnId: pc.id, childColumnId: cc.id });
        }
      });
    }

    // 동일 부모-자식 관계가 이미 있으면 업데이트
    const existingRel = Object.values(existing.relationships).find(
      (r) =>
        r.parentTableId === parentId &&
        r.childTableId === childId &&
        (mappings.length === 0 ||
          (r.columnMappings || []).length === 0 ||
          r.columnMappings.some((m) => mappings.some((n) => n.childColumnId === m.childColumnId)))
    );

    if (mappings.length === 0 && existingRel && (existingRel.columnMappings || []).length > 0) {
      mappings = existingRel.columnMappings;
    }
    if (mappings.length === 0) {
      mappings = inferColumnMappings(parent, child, used);
      if (mappings.length === 0) {
        warnings.push(
          `'${parent.physicalName}' → '${child.physicalName}': FK 컬럼을 찾지 못해 컬럼 매핑 없이 관계선만 생성합니다.`
        );
      }
    }

    // 매핑된 자식 컬럼에 FK 표시
    mappings.forEach((m) => {
      const col = child.columnsById[m.childColumnId];
      if (col && (!col.isFk || col.sourceColumnId !== m.parentColumnId)) {
        const t = touchedTable(childId);
        t.columnsById = {
          ...t.columnsById,
          [col.id]: { ...col, isFk: true, sourceColumnId: m.parentColumnId },
        };
      }
    });

    const finalId = existingRel ? existingRel.id : relId;
    let base: RelationshipModel;
    if (existingRel) {
      // 기존 관계선은 JSON에 명시된 속성만 덮어씀 (나머지 기호/참조동작 설정 유지)
      const explicit = explicitRelationshipKeys.get(rel) || new Set<string>();
      base = { ...existingRel };
      explicit.forEach((k) => {
        (base as any)[k] = (rel as any)[k];
      });
      if (
        (explicit.has('relationshipType') || explicit.has('cardinality')) &&
        !explicit.has('targetMultiplicity')
      ) {
        base.targetMultiplicity = defaultTargetMultiplicity(base.relationshipType, base.cardinality);
      }
    } else {
      base = rel;
    }
    finalRels[finalId] = {
      ...base,
      id: finalId,
      parentTableId: parentId,
      childTableId: childId,
      columnMappings: mappings,
      constraintName: base.constraintName || `FK_${child.physicalName}_${parent.physicalName}`,
    };
    if (existingRel) updatedRelationshipCount++;
    else newRelationshipCount++;
  });

  // 3. 신규 테이블 배치 (기존 테이블과 겹치지 않게, 연결된 테이블 옆에)
  const finalNodes: Record<string, NodeView> = {};
  const placedRects: { x: number; y: number; w: number; h: number }[] = [];
  const isOnActivePage = (t?: TableModel) =>
    !!t && (!activePageId || !t.pageId || t.pageId === activePageId);

  Object.values(existing.nodes).forEach((n) => {
    const t = existing.tables[n.tableId];
    if (!t || !isOnActivePage(t) || !n.position) return;
    placedRects.push({ x: n.position.x, y: n.position.y, w: 360, h: estimateTableHeight(t) });
  });

  const overlaps = (x: number, y: number, w: number, h: number) =>
    placedRects.some(
      (r) => x < r.x + r.w + 40 && x + w + 40 > r.x && y < r.y + r.h + 40 && y + h + 40 > r.y
    );

  const maxX = placedRects.length > 0 ? Math.max(...placedRects.map((r) => r.x + r.w)) : 0;
  const minY = placedRects.length > 0 ? Math.min(...placedRects.map((r) => r.y)) : 100;
  let gridIndex = 0;

  newTableIds.forEach((tblId) => {
    const table = finalTables[tblId];
    const h = estimateTableHeight(table);
    const provided = data.providedNodeIds.includes(tblId) ? data.nodes[tblId] : undefined;

    let x: number;
    let y: number;
    if (provided) {
      x = provided.position.x;
      y = provided.position.y;
    } else {
      // 이미 배치된 연결 테이블(기존 또는 방금 배치한 신규) 옆에 둠
      const placedNode = (id: string) => existing.nodes[id] || finalNodes[id];
      const anchorRel = Object.values(finalRels).find(
        (r) =>
          (r.childTableId === tblId && placedNode(r.parentTableId)) ||
          (r.parentTableId === tblId && placedNode(r.childTableId))
      );
      const anchorId = anchorRel
        ? anchorRel.childTableId === tblId
          ? anchorRel.parentTableId
          : anchorRel.childTableId
        : undefined;
      const anchor = anchorId ? placedNode(anchorId) : undefined;

      if (anchor) {
        x = anchor.position.x + 420;
        y = anchor.position.y;
      } else {
        const col = gridIndex % 3;
        const row = Math.floor(gridIndex / 3);
        x = (placedRects.length > 0 ? maxX + 120 : 100) + col * 420;
        y = minY + row * 320;
        gridIndex++;
      }
      let guard = 0;
      while (overlaps(x, y, 360, h) && guard < 300) {
        y += 40;
        guard++;
      }
    }

    placedRects.push({ x, y, w: 360, h });
    finalNodes[tblId] = {
      id: `node_${tblId}`,
      tableId: tblId,
      position: { x, y, width: 340, height: 220 },
    };
  });

  return {
    tables: finalTables,
    nodes: finalNodes,
    relationships: finalRels,
    updatedTableNames,
    newTableNames,
    newRelationshipCount,
    updatedRelationshipCount,
    warnings,
  };
}

/** 현재 Yjs 문서를 순수 객체로 읽기 */
export function readExistingState(manager: ERDDocManager): ExistingState {
  const tables: Record<string, TableModel> = {};
  const nodes: Record<string, NodeView> = {};
  const relationships: Record<string, RelationshipModel> = {};
  manager.tablesMap.forEach((v, k) => (tables[k] = v));
  manager.nodesMap.forEach((v, k) => (nodes[k] = v));
  manager.relationshipsMap.forEach((v, k) => (relationships[k] = v));
  return { tables, nodes, relationships };
}

/**
 * Replace entire Yjs doc with parsed JSON data
 */
export function importReplaceAction(manager: ERDDocManager, data: ImportParsedResult): void {
  // 빈 캔버스 기준으로 계획을 세워 관계선/FK 매핑을 정규화
  const plan = buildImportMergePlan({ tables: {}, nodes: {}, relationships: {} }, data);
  const nodes: Record<string, NodeView> = {};
  Object.keys(plan.tables).forEach((tId) => {
    nodes[tId] = data.nodes[tId] || plan.nodes[tId];
  });

  const snapshot: ERDSnapshot = {
    tables: plan.tables,
    relationships: plan.relationships,
    nodes,
    memos: data.memos,
    domains: data.domains,
    projectTitle: data.projectTitle,
  };

  restoreVersionSnapshotAction(manager, snapshot);
}

/**
 * Merge parsed JSON data into existing Yjs doc
 * - 같은 물리명의 테이블이 있으면 위치/색상/페이지는 유지하고 내용만 업데이트
 * - 관계선은 기존 캔버스 테이블까지 포함해 연결
 */
export function importMergeAction(
  manager: ERDDocManager,
  data: ImportParsedResult,
  activePageId?: string
): ImportMergePlan {
  const plan = buildImportMergePlan(readExistingState(manager), data, activePageId);

  manager.doc.transact(() => {
    Object.entries(plan.tables).forEach(([id, table]) => manager.tablesMap.set(id, table));
    Object.entries(plan.nodes).forEach(([id, node]) => manager.nodesMap.set(id, node));
    Object.entries(plan.relationships).forEach(([id, rel]) => manager.relationshipsMap.set(id, rel));
    Object.entries(data.memos).forEach(([memoId, memo]) =>
      manager.memosMap.set(memoId, { ...memo, pageId: memo.pageId || activePageId })
    );
    data.domains.forEach((dom) => manager.domainsMap.set(dom.id, dom));
  }, manager.doc.clientID);

  return plan;
}
