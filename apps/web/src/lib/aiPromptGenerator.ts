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
  md += `> 이 문서는 현재 ERD의 최신 데이터베이스 스키마 정의입니다. 백엔드 API, 쿼리, 엔티티 코드를 작성할 때 이 스키마를 단일 진실 공급원(Single Source of Truth)으로 참조하세요.\n\n`;

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
      const pTable = tables[rel.parentTableId]?.physicalName || 'Parent';
      const cTable = tables[rel.childTableId]?.physicalName || 'Child';
      const relType = rel.cardinality || 'one-to-many';
      const isIdent = rel.relationshipType === 'identifying' ? '식별 관계 (CASCADE)' : '비식별 관계 (SET NULL/RESTRICT)';

      const cardSymbol =
        relType === 'one-to-one'
          ? '1 : 1'
          : relType === 'many-to-many'
          ? 'N : M'
          : '1 : N';

      md += `- \`${pTable}\` (${cardSymbol}) ──▶ \`${cTable}\` (${isIdent})\n`;
    });
    md += `\n`;
  }

  // 4. Quick Prompts & Importable JSON Guide
  md += `---\n`;
  md += `## 📥 ERD 원클릭 불러오기(Import)용 JSON 응답 규격 (AI 필수 준수)\n`;
  md += `신규 기능 구현을 위해 **새로운 테이블이나 외래키 관계선 추가를 제안할 경우**, 사용자가 복사하여 ERD 도구의 \`[불러오기 > 병합(Merge)]\`에 붙여넣어 즉시 캔버스에 자동 반영할 수 있도록, **답변 끝에 반드시 아래 형식의 JSON 코드 블록(\`\`\`json ... \`\`\`)을 포함**해줘:\n\n`;
  md += `\`\`\`json\n`;
  md += `{\n`;
  md += `  "tables": [\n`;
  md += `    {\n`;
  md += `      "physicalName": "신규_테이블_영문명",\n`;
  md += `      "logicalName": "신규 테이블 한글명",\n`;
  md += `      "comment": "테이블 용도 설명",\n`;
  md += `      "columns": [\n`;
  md += `        { "physicalName": "id", "logicalName": "ID", "type": "uuid", "isPk": true },\n`;
  md += `        { "physicalName": "user_id", "logicalName": "회원ID", "type": "uuid", "isFk": true },\n`;
  md += `        { "physicalName": "title", "logicalName": "제목", "type": "varchar(255)", "nullable": false },\n`;
  md += `        { "physicalName": "status", "logicalName": "상태", "type": "varchar(30)", "defaultExpression": "'ACTIVE'" },\n`;
  md += `        { "physicalName": "created_at", "logicalName": "생성일시", "type": "timestamptz", "defaultExpression": "now()" }\n`;
  md += `      ]\n`;
  md += `    }\n`;
  md += `  ],\n`;
  md += `  "relationships": [\n`;
  md += `    {\n`;
  md += `      "parentTable": "users",\n`;
  md += `      "childTable": "신규_테이블_영문명",\n`;
  md += `      "relationshipType": "non-identifying",\n`;
  md += `      "cardinality": "one-to-many"\n`;
  md += `    }\n`;
  md += `  ]\n`;
  md += `}\n`;
  md += `\`\`\`\n\n`;

  md += `## 💡 질의 템플릿 예시\n`;
  md += `1. **신규 기능 추가**: "현재 스키마에 [쿠폰 및 프로모션 할인 / 다중 배송지] 기능을 추가하려고 해. 기존 테이블과의 관계를 고려해서 새 테이블 구조를 설계하고, 위 규격의 JSON 블록으로 출력해줘."\n`;
  md += `2. **API 및 비즈니스 로직**: "위 스키마를 바탕으로 [특정 테이블] 관련 API 라우트를 작성해줘."\n`;

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
  md += `4. **신규 테이블 제안 시**: ERD 도구에 바로 추가 반영할 수 있도록 \`{"tables": [...], "relationships": [...]}\` JSON 코드 블록을 포함해줘.\n`;

  return md;
}
