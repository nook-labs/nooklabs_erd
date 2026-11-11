import { DataTypeSpec } from '@/types/erd';

const PRECISION_TYPES = new Set(['decimal', 'numeric', 'number']);

/**
 * "varchar(30)", "decimal(18,2)", "timestamptz", "text[]" 같은 타입 문자열을 DataTypeSpec으로 변환
 */
export function parseDataType(raw: string): DataTypeSpec {
  const trimmed = (raw || '').trim();
  const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_ ]*?(?:\[\])?)\s*(?:\(\s*(\d+)\s*(?:,\s*(\d+)\s*)?\))?\s*(\[\])?$/);
  if (!match) return { name: trimmed };

  const name = `${match[1].trim()}${match[4] || ''}`;
  const a = match[2] !== undefined ? parseInt(match[2], 10) : undefined;
  const b = match[3] !== undefined ? parseInt(match[3], 10) : undefined;

  if (a === undefined) return { name };
  if (b !== undefined || PRECISION_TYPES.has(name.toLowerCase())) {
    return { name, precision: a, ...(b !== undefined ? { scale: b } : {}) };
  }
  return { name, length: a };
}

/** DataTypeSpec을 화면 표시용 문자열로 변환 */
export function formatDataType(type?: DataTypeSpec): string {
  if (!type?.name) return 'varchar(255)';
  const name = type.name.toLowerCase();
  // 이전에 "varchar(30)"처럼 통째로 저장된 데이터는 그대로 표시
  if (name.includes('(')) return name;
  if (type.precision !== undefined) {
    return `${name}(${type.precision}${type.scale !== undefined ? `,${type.scale}` : ''})`;
  }
  if (type.length) return `${name}(${type.length})`;
  return name;
}
