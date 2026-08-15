import { SchemaModel, TableModel, ColumnModel } from '@/types/erd';

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  tableId?: string;
  columnId?: string;
  tableName?: string;
  columnName?: string;
  message: string;
  suggestion: string;
}

const RESERVED_WORDS = new Set([
  'USER', 'ORDER', 'GROUP', 'SELECT', 'WHERE', 'FROM', 'TABLE', 'INDEX',
  'KEY', 'PRIMARY', 'FOREIGN', 'CHECK', 'DEFAULT', 'NULL', 'CONSTRAINT',
  'DATABASE', 'ALTER', 'DROP', 'CREATE', 'ADD', 'UPDATE', 'DELETE'
]);

export function validateSchema(schemaModel: SchemaModel): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const tables = Object.values(schemaModel.tablesById);
  const tablePhysicalNames = new Map<string, string[]>(); // name -> tableIds

  tables.forEach((table) => {
    const fullPhysicalName = `${table.schemaName || 'dbo'}.${table.physicalName.toLowerCase()}`;
    if (!tablePhysicalNames.has(fullPhysicalName)) {
      tablePhysicalNames.set(fullPhysicalName, []);
    }
    tablePhysicalNames.get(fullPhysicalName)!.push(table.id);

    // Warning: Missing PK
    const cols = Object.values(table.columnsById);
    const pkCols = cols.filter((c) => c.isPk);

    if (pkCols.length === 0) {
      issues.push({
        id: `warn_no_pk_${table.id}`,
        severity: 'warning',
        tableId: table.id,
        tableName: table.physicalName,
        message: `테이블 [${table.physicalName}]에 기본키(PK)가 정의되어 있지 않습니다.`,
        suggestion: '기본키 컬럼을 지정하세요.',
      });
    }

    // Reserved word warning
    if (RESERVED_WORDS.has(table.physicalName.toUpperCase())) {
      issues.push({
        id: `warn_reserved_table_${table.id}`,
        severity: 'warning',
        tableId: table.id,
        tableName: table.physicalName,
        message: `테이블명 [${table.physicalName}]은 DB 예약어입니다.`,
        suggestion: '식별자를 변경하거나 인용부호([ ])를 사용하세요.',
      });
    }

    // Check duplicate column names inside table
    const colNames = new Set<string>();
    cols.forEach((col) => {
      const lowerColName = col.physicalName.toLowerCase();
      if (colNames.has(lowerColName)) {
        issues.push({
          id: `err_dup_col_${table.id}_${col.id}`,
          severity: 'error',
          tableId: table.id,
          columnId: col.id,
          tableName: table.physicalName,
          columnName: col.physicalName,
          message: `테이블 [${table.physicalName}] 내에 중복된 컬럼명 [${col.physicalName}]이(가) 있습니다.`,
          suggestion: '컬럼 물리명을 고유하게 변경하세요.',
        });
      }
      colNames.add(lowerColName);

      // Error: PK is Nullable
      if (col.isPk && col.nullable) {
        issues.push({
          id: `err_pk_nullable_${table.id}_${col.id}`,
          severity: 'error',
          tableId: table.id,
          columnId: col.id,
          tableName: table.physicalName,
          columnName: col.physicalName,
          message: `PK 컬럼 [${col.physicalName}]은 NULL을 허용할 수 없습니다.`,
          suggestion: 'Nullable 옵션을 해제(NOT NULL)하세요.',
        });
      }
    });
  });

  // Duplicate Table Name Errors
  tablePhysicalNames.forEach((ids, name) => {
    if (ids.length > 1) {
      ids.forEach((id) => {
        const table = schemaModel.tablesById[id];
        issues.push({
          id: `err_dup_table_${id}`,
          severity: 'error',
          tableId: id,
          tableName: table?.physicalName,
          message: `중복된 테이블 물리명 [${name}]이(가) 존재합니다.`,
          suggestion: '테이블 물리명을 고유하게 수정하세요.',
        });
      });
    }
  });

  return issues;
}
