import { TableModel, ColumnModel, RelationshipModel, DomainItem, ERDSnapshot } from '@/types/erd';

interface GenerateAiSchemaOptions {
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  domains?: DomainItem[];
  projectTitle: string;
}

function getTableColumns(tbl: TableModel): ColumnModel[] {
  if (!tbl || !tbl.columnsById) return [];
  const order = tbl.columnOrder || Object.keys(tbl.columnsById);
  return order.map((cId) => tbl.columnsById[cId]).filter((c): c is ColumnModel => !!c);
}

/**
 * 모든 AI 프롬프트에 공통으로 붙는 "ERD 도구 / 병합 규칙 / JSON 규격" 안내
 * - importActions.ts의 병합 동작과 반드시 일치해야 함 (병합 규칙을 바꾸면 여기도 수정)
 */
export function buildErdImportGuide(): string {
  let md = '';
  md += `---\n`;
  md += `## 🧭 [AI 필독] 이 ERD의 관리 방식과 스키마 변경 제안 방법\n\n`;

  md += `### 1) 이 ERD는 어떤 문서인가\n`;
  md += `- 위 스키마는 **웹 기반 ERD 설계 도구**에서 관리되는 설계 문서입니다. 애플리케이션 코드 저장소나 실제 DB 마이그레이션 파일과는 **별도로 관리**됩니다.\n`;
  md += `- 따라서 ERD는 "설계 기준"이며, 실제 운영 DB와 일시적으로 다를 수 있습니다. 실제 DB 반영이 필요하면 마이그레이션 SQL을 별도로 작성해야 합니다.\n`;
  md += `- 당신(AI)은 ERD를 직접 수정할 수 없습니다. 스키마 변경을 제안할 때는 **아래 규격의 JSON**을 출력하면, 사용자가 ERD 도구의 **[불러오기 → 병합]** 에 붙여넣어 캔버스에 반영합니다. (병합은 실행 취소 가능)\n\n`;

  md += `### 2) 병합(Merge) 동작 규칙\n`;
  md += `1. **테이블 매칭**: \`physicalName\`(대소문자 무시)이 같은 테이블이 캔버스에 있으면 **기존 테이블을 업데이트**합니다(캔버스 위치·색상·페이지는 유지). 없으면 **신규 테이블**로 추가되며, 연결된 테이블 옆에 자동 배치됩니다.\n`;
  md += `2. **컬럼 목록은 JSON이 기준**: 기존 테이블을 업데이트할 때 **JSON에 없는 컬럼은 삭제**됩니다(단, 관계선이 참조 중인 FK 컬럼은 보존). → 기존 테이블을 수정할 때는 **바뀌지 않은 컬럼까지 전체 컬럼을 순서대로** 출력하세요. 출력 순서가 곧 컬럼 순서입니다.\n`;
  md += `3. **컬럼 매칭**: 컬럼은 \`physicalName\`으로 매칭됩니다. 컬럼명을 바꾸면 "기존 컬럼 삭제 + 새 컬럼 추가"로 처리되어 기존 설명 등이 사라지므로, 이름 변경은 답변 본문에 따로 안내하세요.\n`;
  md += `4. **속성별 적용 규칙**:\n\n`;
  md += `| 속성 | JSON에 값이 있을 때 | 키를 생략했을 때 |\n|---|---|---|\n`;
  md += `| \`type\`, \`logicalName\` | 그 값으로 변경 | (type 생략 시 varchar(255)) |\n`;
  md += `| \`isPk\`, \`isFk\` | 그 값으로 변경 | \`false\`로 간주 |\n`;
  md += `| \`nullable\` | 그 값으로 변경 | 기존 값 유지 (신규 컬럼은 \`true\`) |\n`;
  md += `| \`defaultExpression\` | 그 값으로 변경. **\`null\` 또는 \`""\`이면 기본값 삭제** | 기존 값 유지 |\n`;
  md += `| \`comment\` (테이블·컬럼) | 비어있지 않은 값일 때만 변경 | 기존 값 유지 (\`""\`도 유지 → 설명 삭제는 불가) |\n\n`;
  md += `5. **관계선**: \`parentTable\`/\`childTable\`에는 테이블 \`physicalName\`을 씁니다. **캔버스에 이미 있는 테이블도 참조 가능**하므로, 관계만 맺을 기존 테이블을 \`tables\`에 다시 넣을 필요는 없습니다(넣으면 2번 규칙대로 컬럼이 덮어써집니다). 같은 부모-자식 관계선이 이미 있으면 새로 만들지 않고 **명시한 속성만 업데이트**합니다.\n`;
  md += `6. **FK 컬럼 연결**: \`parentColumn\`(부모 PK)과 \`childColumn\`(자식 FK)을 **명시하세요**. 생략하면 부모 PK와 자식의 \`isFk\` 컬럼을 이름으로 추론합니다(예: \`user_profiles.id\` ↔ \`user_id\`). FK 컬럼 자체는 자식 테이블 \`columns\`에 \`"isFk": true\`로 포함해야 합니다.\n`;
  md += `7. **병합으로 할 수 없는 것**: 테이블 삭제, 관계선 삭제, 테이블 이름(\`physicalName\`) 변경(새 테이블로 생성됨), 설명 삭제. 이런 변경이 필요하면 JSON에 넣지 말고 답변 본문에 **"ERD에서 직접 수정할 항목"** 으로 따로 정리하세요.\n\n`;

  md += `### 3) JSON 규격\n`;
  md += `- \`type\`: SQL 타입 문자열 그대로 (예: \`"uuid"\`, \`"varchar(30)"\`, \`"decimal(18,2)"\`, \`"timestamptz"\`, \`"jsonb"\`, \`"text[]"\`)\n`;
  md += `- \`defaultExpression\`: SQL 기본값 식 그대로 (문자열 리터럴은 작은따옴표 포함: \`"'active'"\`, 함수: \`"now()"\`, \`"gen_random_uuid()"\`, 숫자/불리언: \`"0"\`, \`"true"\`)\n`;
  md += `- \`relationshipType\`: \`"identifying"\`(식별, 자식 PK에 포함) | \`"non-identifying"\`(비식별)\n`;
  md += `- \`cardinality\`: \`"one-to-one"\` | \`"one-to-many"\` | \`"many-to-many"\`\n`;
  md += `- 선택: \`onDelete\`/\`onUpdate\` (\`"CASCADE"\` | \`"SET NULL"\` | \`"NO ACTION"\` | \`"RESTRICT"\`)\n\n`;
  md += `예시 — 신규 테이블 \`user_handle_holds\` 추가 + 기존 \`users\`와 관계 연결:\n\n`;
  md += `\`\`\`json\n`;
  md += `{\n`;
  md += `  "tables": [\n`;
  md += `    {\n`;
  md += `      "physicalName": "user_handle_holds",\n`;
  md += `      "logicalName": "아이디 보류",\n`;
  md += `      "comment": "아이디 변경 시 이전 아이디를 30일간 보류",\n`;
  md += `      "columns": [\n`;
  md += `        { "physicalName": "handle", "logicalName": "보류아이디", "type": "varchar(30)", "isPk": true, "nullable": false, "comment": "소문자만 허용" },\n`;
  md += `        { "physicalName": "user_id", "logicalName": "회원ID", "type": "uuid", "isFk": true, "nullable": false },\n`;
  md += `        { "physicalName": "expires_at", "logicalName": "보류만료일시", "type": "timestamptz", "nullable": false },\n`;
  md += `        { "physicalName": "created_at", "logicalName": "생성일시", "type": "timestamptz", "nullable": false, "defaultExpression": "now()" }\n`;
  md += `      ]\n`;
  md += `    }\n`;
  md += `  ],\n`;
  md += `  "relationships": [\n`;
  md += `    {\n`;
  md += `      "parentTable": "users",\n`;
  md += `      "childTable": "user_handle_holds",\n`;
  md += `      "parentColumn": "id",\n`;
  md += `      "childColumn": "user_id",\n`;
  md += `      "relationshipType": "non-identifying",\n`;
  md += `      "cardinality": "one-to-many",\n`;
  md += `      "onDelete": "CASCADE"\n`;
  md += `    }\n`;
  md += `  ]\n`;
  md += `}\n`;
  md += `\`\`\`\n\n`;

  md += `### 4) 출력 규칙\n`;
  md += `- 스키마 변경을 제안할 때만, **답변 마지막에 \`\`\`json 코드 블록 하나**로 출력하세요. 변경이 없으면 JSON을 출력하지 마세요.\n`;
  md += `- JSON 안에 주석(\`//\`)을 넣지 마세요. 설명은 \`comment\` 필드나 답변 본문에 쓰세요.\n`;
  md += `- **변경되는 테이블만** 포함하세요. 기존 테이블을 수정할 때는 전체 컬럼을 포함하세요(2번 규칙).\n`;
  md += `- JSON 앞에 변경 요약(추가/수정/삭제될 컬럼, ERD에서 직접 수정할 항목)을 짧게 적어주세요.\n`;
  return md;
}

function formatColumnType(col: ColumnModel): string {
  if (!col.type?.name) return 'varchar(255)';
  const t = col.type;
  const args =
    t.precision !== undefined
      ? `(${t.precision}${t.scale !== undefined ? `,${t.scale}` : ''})`
      : t.length
      ? `(${t.length})`
      : '';
  return `${t.name.toLowerCase()}${args}`;
}

function formatColumnLine(col: ColumnModel): string {
  const pName = col.physicalName || col.logicalName || 'unnamed_col';
  const flags: string[] = [];
  if (col.isPk) flags.push('PK');
  if (col.isFk) flags.push('FK');
  flags.push(col.nullable ? 'NULL' : 'NOT NULL');
  if (col.isUnique) flags.push('UNIQUE');
  if (col.autoIncrement) flags.push('AUTO_INCREMENT');
  if (col.defaultExpression) flags.push(`default: ${col.defaultExpression}`);
  if (col.domain) flags.push(`domain: ${col.domain}`);
  return `| \`${pName}\` | ${col.logicalName || ''} | \`${formatColumnType(col)}\` | ${flags.join(', ')} | ${(col.comment || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`;
}

/**
 * 단일 테이블을 AI에게 설명/작업 요청하기 위한 스크립트 생성
 * - 대상 테이블 전체 정의 + 직접 연결된 테이블(부모/자식)의 키 컬럼 + 관계(FK 매핑)
 */
export function generateTableAiScript({
  tableId,
  tables,
  relationships,
  projectTitle,
}: {
  tableId: string;
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  projectTitle?: string;
}): string {
  const tbl = tables[tableId];
  if (!tbl) return '';

  const name = (t?: TableModel) => t?.physicalName || t?.logicalName || '(unknown)';
  const colName = (t: TableModel | undefined, colId: string) => {
    const c = t?.columnsById?.[colId];
    return c ? c.physicalName || c.logicalName : '?';
  };

  const rels = Object.values(relationships || {});
  const parentRels = rels.filter((r) => r.childTableId === tableId && tables[r.parentTableId]);
  const childRels = rels.filter((r) => r.parentTableId === tableId && tables[r.childTableId]);

  const cardText = (r: RelationshipModel) =>
    r.cardinality === 'one-to-one' ? '1:1' : r.cardinality === 'many-to-many' ? 'N:M' : '1:N';
  const relKind = (r: RelationshipModel) => (r.relationshipType === 'identifying' ? '식별' : '비식별');
  const mappingText = (r: RelationshipModel) => {
    const p = tables[r.parentTableId];
    const c = tables[r.childTableId];
    const maps = (r.columnMappings || []).map(
      (m) => `\`${name(c)}.${colName(c, m.childColumnId)}\` → \`${name(p)}.${colName(p, m.parentColumnId)}\``
    );
    return maps.length > 0 ? maps.join(', ') : '(컬럼 매핑 미지정)';
  };

  let md = `# [테이블 컨텍스트] \`${name(tbl)}\`${tbl.logicalName && tbl.logicalName !== tbl.physicalName ? ` (${tbl.logicalName})` : ''}\n\n`;
  md += `> 프로젝트: ${projectTitle || 'ERD Project'} / 스키마: ${tbl.schemaName || 'public'}\n`;
  md += `> 아래는 ERD 도구에서 추출한 이 테이블의 최신 정의입니다. 답변 시 이 정의를 기준으로 삼아주세요.\n\n`;

  if (tbl.comment) {
    md += `## 테이블 설명\n${tbl.comment}\n\n`;
  }

  md += `## 컬럼 정의\n`;
  md += `| 물리명 | 논리명 | 타입 | 제약 | 설명 |\n|---|---|---|---|---|\n`;
  getTableColumns(tbl).forEach((col) => {
    md += `${formatColumnLine(col)}\n`;
  });
  md += `\n`;

  md += `## 관계\n`;
  if (parentRels.length === 0 && childRels.length === 0) {
    md += `(연결된 관계선 없음)\n\n`;
  } else {
    if (parentRels.length > 0) {
      md += `### 참조하는 부모 테이블\n`;
      parentRels.forEach((r) => {
        md += `- \`${name(tables[r.parentTableId])}\` ${cardText(r)} ${relKind(r)} 관계 — ${mappingText(r)} (ON DELETE ${r.onDelete || 'NO ACTION'})\n`;
      });
      md += `\n`;
    }
    if (childRels.length > 0) {
      md += `### 이 테이블을 참조하는 자식 테이블\n`;
      childRels.forEach((r) => {
        md += `- \`${name(tables[r.childTableId])}\` ${cardText(r)} ${relKind(r)} 관계 — ${mappingText(r)} (ON DELETE ${r.onDelete || 'NO ACTION'})\n`;
      });
      md += `\n`;
    }
  }

  // 연결된 테이블 요약 (키 컬럼 + 설명)
  const relatedIds = Array.from(
    new Set([...parentRels.map((r) => r.parentTableId), ...childRels.map((r) => r.childTableId)])
  ).filter((id) => id !== tableId);

  if (relatedIds.length > 0) {
    md += `## 연관 테이블 요약\n`;
    relatedIds.forEach((id) => {
      const t = tables[id];
      const keyCols = getTableColumns(t).filter((c) => c.isPk || c.isFk);
      md += `- \`${name(t)}\`${t.logicalName && t.logicalName !== t.physicalName ? ` (${t.logicalName})` : ''}`;
      if (t.comment) md += ` — ${t.comment.replace(/\n/g, ' ')}`;
      md += `\n`;
      if (keyCols.length > 0) {
        md += `  - 키: ${keyCols
          .map((c) => `\`${c.physicalName}\` ${formatColumnType(c)}${c.isPk ? ' PK' : ''}${c.isFk ? ' FK' : ''}`)
          .join(', ')}\n`;
      }
    });
    md += `\n`;
  }

  md += `> 참고: 위에는 이 테이블과 직접 연결된 테이블만 포함되어 있습니다. 다른 테이블 정보가 필요하면 추측하지 말고 사용자에게 요청하세요.\n`;
  md += `> 이 테이블을 수정하는 JSON을 만들 때는 위 "컬럼 정의"의 **모든 컬럼을 포함**해야 합니다(빠진 컬럼은 삭제됨).\n\n`;

  md += buildErdImportGuide();

  md += `\n---\n`;
  md += `## 요청\n`;
  md += `(여기에 이 테이블과 관련해 원하는 작업을 적어주세요. 예: 이 테이블의 용도와 각 컬럼 의미를 설명해줘 / 이 테이블 CRUD API를 작성해줘 / 컬럼을 추가·변경하려는데 검토하고 병합용 JSON을 만들어줘)\n`;

  return md;
}

/**
 * Generates a clean, token-efficient Markdown prompt representing the entire ERD schema for LLMs.
 */
export function generateAiSchemaPrompt({
  tables,
  relationships,
  domains = [],
  projectTitle,
}: GenerateAiSchemaOptions): string {
  const tableList = Object.values(tables || {});
  const relationshipList = Object.values(relationships || {});

  let md = `# [Database Schema Context] ${projectTitle || 'ERD Project'}\n\n`;
  md += `> 이 문서는 웹 ERD 설계 도구에서 추출한 최신 스키마 설계입니다. 백엔드 API, 쿼리, 엔티티 코드를 작성할 때 이 스키마를 설계 기준으로 참조하세요. ERD는 코드 저장소·실제 DB와 별도로 관리되므로, 코드나 마이그레이션과 내용이 다르면 임의로 판단하지 말고 사용자에게 확인하세요. (관리 방식과 변경 제안 방법은 문서 하단 참고)\n\n`;

  // 1. Domains
  if (domains.length > 0) {
    md += `## 1. 표준 도메인 정의 (Domains)\n`;
    domains.forEach((d) => {
      md += `- **${d.name}**: \`${d.dataType}\`${d.defaultValue ? ` (default: \`${d.defaultValue}\`)` : ''}\n`;
    });
    md += `\n`;
  }

  // 2. Tables & Columns
  md += `## 2. 테이블 상세 정의 (${tableList.length}개)\n\n`;

  if (tableList.length === 0) {
    md += `(정의된 테이블이 없습니다.)\n\n`;
  } else {
    tableList.forEach((tbl) => {
      const pName = tbl.physicalName || tbl.logicalName || 'unnamed_table';
      const lName = tbl.logicalName && tbl.logicalName !== pName ? ` (${tbl.logicalName})` : '';
      md += `### \`${pName}\`${lName}\n`;
      if (tbl.comment) {
        md += `> 설명: ${tbl.comment}\n`;
      }

      const cols = getTableColumns(tbl);
      if (cols.length === 0) {
        md += `- (컬럼 없음)\n\n`;
        return;
      }

      cols.forEach((col) => {
        const colPName = col.physicalName || col.logicalName || 'unnamed_col';
        const colLName = col.logicalName && col.logicalName !== colPName ? ` [${col.logicalName}]` : '';
        const typeStr = col.type?.name
          ? `${col.type.name.toLowerCase()}${col.type.length ? `(${col.type.length})` : ''}`
          : 'varchar(255)';

        const flags: string[] = [];
        if (col.isPk) flags.push('PK');
        if (col.isFk) flags.push('FK');
        flags.push(col.nullable ? 'NULL' : 'NOT NULL');
        if (col.isUnique) flags.push('UNIQUE');
        if (col.defaultExpression) flags.push(`default: ${col.defaultExpression}`);
        if (col.domain) flags.push(`domain: ${col.domain}`);

        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        const commentStr = col.comment ? ` - ${col.comment}` : '';

        md += `- \`${colPName}\`: \`${typeStr}\`${flagStr}${colLName}${commentStr}\n`;
      });
      md += `\n`;
    });
  }

  // 3. Relationships
  md += `## 3. 테이블 간 외래키 관계선 (Relationships)\n\n`;

  if (relationshipList.length === 0) {
    md += `(정의된 관계선이 없습니다.)\n\n`;
  } else {
    relationshipList.forEach((rel) => {
      const parent = tables[rel.parentTableId];
      const child = tables[rel.childTableId];
      const pTable = parent?.physicalName || 'Parent';
      const cTable = child?.physicalName || 'Child';
      const relType = rel.cardinality || 'one-to-many';
      const isIdent = rel.relationshipType === 'identifying' ? '식별' : '비식별';

      const cardSymbol =
        relType === 'one-to-one'
          ? '1 : 1'
          : relType === 'many-to-many'
          ? 'N : M'
          : '1 : N';

      const mappings = (rel.columnMappings || [])
        .map((m) => {
          const pc = parent?.columnsById?.[m.parentColumnId]?.physicalName || '?';
          const cc = child?.columnsById?.[m.childColumnId]?.physicalName || '?';
          return `${cTable}.${cc} → ${pTable}.${pc}`;
        })
        .join(', ');

      md += `- \`${pTable}\` (${cardSymbol}) ──▶ \`${cTable}\` — ${isIdent}, ON DELETE ${rel.onDelete || 'NO ACTION'}${
        mappings ? ` — \`${mappings}\`` : ''
      }\n`;
    });
    md += `\n`;
  }

  md += buildErdImportGuide();

  md += `\n## 💡 질의 템플릿 예시\n`;
  md += `1. **신규 기능 추가**: "현재 스키마에 [쿠폰 및 프로모션 할인 / 다중 배송지] 기능을 추가하려고 해. 기존 테이블과의 관계를 고려해서 새 테이블 구조를 설계하고, 병합용 JSON 블록으로 출력해줘."\n`;
  md += `2. **기존 테이블 수정**: "[테이블]에 [컬럼]을 추가하고 [컬럼]의 기본값을 없애줘. 병합용 JSON으로 출력해줘."\n`;
  md += `3. **API 및 비즈니스 로직**: "위 스키마를 바탕으로 [특정 테이블] 관련 API 라우트를 작성해줘."\n`;

  return md;
}

interface GenerateSchemaDiffOptions {
  baseSnapshot: ERDSnapshot;
  currentTables: Record<string, TableModel>;
  currentRelationships: Record<string, RelationshipModel>;
  projectTitle: string;
  versionName: string;
  versionCreatedAt?: string;
}

/**
 * Computes semantic structural difference between a base version and current schema,
 * and formats it into an actionable AI migration/update prompt.
 */
export function generateSchemaDiffPrompt({
  baseSnapshot,
  currentTables,
  currentRelationships,
  projectTitle,
  versionName,
  versionCreatedAt,
}: GenerateSchemaDiffOptions): string {
  const oldTables = baseSnapshot.tables || {};
  const newTables = currentTables || {};

  const oldRels = baseSnapshot.relationships || {};
  const newRels = currentRelationships || {};

  const oldTableKeys = new Set(Object.keys(oldTables));
  const newTableKeys = new Set(Object.keys(newTables));

  // 1. Table diffs
  const addedTableIds = Array.from(newTableKeys).filter((id) => !oldTableKeys.has(id));
  const removedTableIds = Array.from(oldTableKeys).filter((id) => !newTableKeys.has(id));
  const commonTableIds = Array.from(newTableKeys).filter((id) => oldTableKeys.has(id));

  interface TableColumnDiff {
    tableName: string;
    physicalName: string;
    addedCols: string[];
    removedCols: string[];
    modifiedCols: string[];
  }

  const modifiedTables: TableColumnDiff[] = [];

  commonTableIds.forEach((tId) => {
    const oldT = oldTables[tId];
    const newT = newTables[tId];
    if (!oldT || !newT) return;

    const oldCols = getTableColumns(oldT);
    const newCols = getTableColumns(newT);

    const oldColMap = new Map<string, ColumnModel>(oldCols.map((c) => [c.physicalName || c.logicalName, c]));
    const newColMap = new Map<string, ColumnModel>(newCols.map((c) => [c.physicalName || c.logicalName, c]));

    const addedCols: string[] = [];
    const removedCols: string[] = [];
    const modifiedCols: string[] = [];

    newColMap.forEach((newCol, colName) => {
      const oldCol = oldColMap.get(colName);
      if (!oldCol) {
        const typeStr = newCol.type?.name || 'varchar(255)';
        addedCols.push(`+ \`${colName}\` (${typeStr}${newCol.nullable ? ', NULL' : ', NOT NULL'}${newCol.isPk ? ', PK' : ''}${newCol.isFk ? ', FK' : ''})`);
      } else {
        const oldType = oldCol.type?.name || 'varchar(255)';
        const newType = newCol.type?.name || 'varchar(255)';
        const oldNull = oldCol.nullable;
        const newNull = newCol.nullable;

        const changes: string[] = [];
        if (oldType !== newType) changes.push(`타입: \`${oldType}\` ➔ \`${newType}\``);
        if (oldNull !== newNull) changes.push(`NULL: \`${oldNull ? 'NULL' : 'NOT NULL'}\` ➔ \`${newNull ? 'NULL' : 'NOT NULL'}\``);

        if (changes.length > 0) {
          modifiedCols.push(`~ \`${colName}\` (${changes.join(', ')})`);
        }
      }
    });

    oldColMap.forEach((_, colName) => {
      if (!newColMap.has(colName)) {
        removedCols.push(`- \`${colName}\``);
      }
    });

    if (addedCols.length > 0 || removedCols.length > 0 || modifiedCols.length > 0) {
      modifiedTables.push({
        tableName: newT.logicalName || newT.physicalName,
        physicalName: newT.physicalName || newT.logicalName,
        addedCols,
        removedCols,
        modifiedCols,
      });
    }
  });

  // 2. Relationship diffs
  const oldRelKeys = new Set(Object.keys(oldRels));
  const newRelKeys = new Set(Object.keys(newRels));
  const addedRelIds = Array.from(newRelKeys).filter((id) => !oldRelKeys.has(id));
  const removedRelIds = Array.from(oldRelKeys).filter((id) => !newRelKeys.has(id));

  // Build Markdown
  let md = `# [스키마 변경 내역 Diff] ${projectTitle || 'ERD Project'}\n\n`;
  md += `> 기준 버전: **${versionName}** ${versionCreatedAt ? `(${versionCreatedAt})` : ''} 대비 현재 스키마 변경 사항\n\n`;

  const hasAnyChanges =
    addedTableIds.length > 0 ||
    removedTableIds.length > 0 ||
    modifiedTables.length > 0 ||
    addedRelIds.length > 0 ||
    removedRelIds.length > 0;

  if (!hasAnyChanges) {
    md += `🎉 **기준 버전과 현재 스키마 사이에 변경된 내용이 없습니다 (동일한 스키마).**\n\n`;
    return md;
  }

  // 1. Added Tables
  if (addedTableIds.length > 0) {
    md += `### 1. 신규 추가된 테이블 (${addedTableIds.length}개)\n`;
    addedTableIds.forEach((tId) => {
      const tbl = newTables[tId];
      if (tbl) {
        md += `- **\`${tbl.physicalName}\`** (${tbl.logicalName || '테이블'})\n`;
      }
    });
    md += `\n`;
  }

  // 2. Removed Tables
  if (removedTableIds.length > 0) {
    md += `### 2. 삭제된 테이블 (${removedTableIds.length}개)\n`;
    removedTableIds.forEach((tId) => {
      const tbl = oldTables[tId];
      if (tbl) {
        md += `- **\`${tbl.physicalName}\`** (${tbl.logicalName || '삭제됨'})\n`;
      }
    });
    md += `\n`;
  }

  // 3. Modified Tables
  if (modifiedTables.length > 0) {
    md += `### 3. 컬럼 구조가 변경된 테이블 (${modifiedTables.length}개)\n`;
    modifiedTables.forEach((diff) => {
      md += `#### \`${diff.physicalName}\` (${diff.tableName})\n`;
      if (diff.addedCols.length > 0) {
        md += `  - **추가된 컬럼**:\n`;
        diff.addedCols.forEach((c) => (md += `    ${c}\n`));
      }
      if (diff.modifiedCols.length > 0) {
        md += `  - **수정된 컬럼**:\n`;
        diff.modifiedCols.forEach((c) => (md += `    ${c}\n`));
      }
      if (diff.removedCols.length > 0) {
        md += `  - **삭제된 컬럼**:\n`;
        diff.removedCols.forEach((c) => (md += `    ${c}\n`));
      }
      md += `\n`;
    });
  }

  // 4. Relationships
  if (addedRelIds.length > 0 || removedRelIds.length > 0) {
    md += `### 4. 외래키 관계선 변경점\n`;
    addedRelIds.forEach((rId) => {
      const rel = newRels[rId];
      if (rel) {
        const pTable = newTables[rel.parentTableId]?.physicalName || 'Parent';
        const cTable = newTables[rel.childTableId]?.physicalName || 'Child';
        md += `- [추가] \`${pTable}\` ──▶ \`${cTable}\` (${rel.cardinality || '1:N'})\n`;
      }
    });
    removedRelIds.forEach((rId) => {
      const rel = oldRels[rId];
      if (rel) {
        const pTable = oldTables[rel.parentTableId]?.physicalName || 'Parent';
        const cTable = oldTables[rel.childTableId]?.physicalName || 'Child';
        md += `- [삭제] \`${pTable}\` ──▶ \`${cTable}\`\n`;
      }
    });
    md += `\n`;
  }

  // 5. AI Prompt Task Template
  md += `---\n`;
  md += `## 🤖 AI 마이그레이션 요청문 (Prompt Instructions)\n`;
  md += `위의 **스키마 변경 내역(Diff)**을 바탕으로 아래 작업을 정확하게 수행해줘:\n\n`;
  md += `1. **데이터베이스 마이그레이션 SQL**: 기존 데이터를 유실하지 않도록 안전한 \`ALTER TABLE\`, \`ADD COLUMN\`, \`ADD CONSTRAINT\` DDL 스크립트를 작성해줘.\n`;
  md += `2. **백엔드 엔티티 / 모델 업데이트**: 변경된 테이블과 컬럼에 맞추어 프로젝트의 ORM 엔티티(또는 타입 인터페이스)를 업데이트해줘.\n`;
  md += `3. **사이드이펙트 점검**: 컬럼 삭제나 타입 변경으로 인해 기존 비즈니스 로직에서 깨질 수 있는 잠재적 위험 요소를 짚어줘.\n`;
  md += `4. **ERD 추가 변경 제안 시**: 아래 규격의 병합용 JSON 코드 블록을 포함해줘.\n\n`;
  md += buildErdImportGuide();

  return md;
}
