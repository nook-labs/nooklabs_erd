// ERD Domain Models & Document Types based on web_erd_tool_planning_v2_1_realtime.md

export type DisplayMode = 'logical' | 'physical' | 'both';
export type RelationDisplayMode = 'all' | 'focused' | 'hidden';

export type RelationshipType = 'identifying' | 'non-identifying';
export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type ReferentialAction = 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT';

// ERD-Cloud Crow's Foot Multiplicity Notation (7종)
export type CrowsFootMultiplicity =
  | 'optional-many'     // 없거나 여러개 (O + <)
  | 'optional-one-many' // 없거나 한개 또는 여러개 (O + | + <)
  | 'optional-one'      // 없거나 한개 (O + |)
  | 'mandatory-many'    // 한개 또는 여러개 (| + <)
  | 'mandatory-one'     // 무조건 한개 (||)
  | 'many'              // 여러개 (<)
  | 'one';              // 한개 (|)

export type ActiveTool =
  | 'select'
  | 'table'
  | 'memo'
  | 'diagram'
  | 'rel-optional-many'
  | 'rel-optional-one-many'
  | 'rel-optional-one'
  | 'rel-mandatory-many'
  | 'rel-mandatory-one'
  | 'rel-many'
  | 'rel-one';

export interface DataTypeSpec {
  name: string; // e.g. VARCHAR, INT, BIGINT, DECIMAL, DATETIME, TEXT, BOOLEAN, JSON
  length?: number;
  precision?: number;
  scale?: number;
}

export interface IdentitySpec {
  seed: number;
  increment: number;
}

export interface ColumnModel {
  id: string;
  logicalName: string;
  physicalName: string;
  type: DataTypeSpec;
  nullable: boolean;
  isPk?: boolean;
  isFk?: boolean;
  isUnique?: boolean;
  autoIncrement?: boolean;
  domain?: string;
  domainId?: string;
  defaultExpression?: string;
  identity?: IdentitySpec;
  comment?: string;
  origin?: 'user' | 'relationship-generated' | 'detached';
  relationshipId?: string;
  sourceColumnId?: string;
  isHighlighted?: boolean; // 속성 강조 표시 (VS Code 중단점 스타일)
}

export interface TableModel {
  id: string;
  schemaName: string;
  logicalName: string;
  physicalName: string;
  comment: string;
  headerColor?: string; // e.g. '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#475569'
  columnWidths?: Record<string, number>;
  columnOrder: string[];
  columnsById: Record<string, ColumnModel>;
  primaryKeyId?: string;
  indexIds: string[];
  constraintIds: string[];
  pageId?: string; // Figma 스타일 다중 페이지 소속
}

export interface MemoTextStyle {
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | number | string; // 10px ~ 72px 이상 자유로운 크기 지원
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  textDecoration?: 'none' | 'underline' | 'line-through';
}

export interface MemoModel {
  id: string;
  content: string;
  color?: string; // e.g. '#fef08a' (yellow), '#fed7aa' (orange), '#bbf7d0' (green), '#bfdbfe' (blue), '#fbcfe8' (pink)
  textStyle?: MemoTextStyle;
  position: NodePosition;
  pageId?: string; // Figma 스타일 다중 페이지 소속
}

export type DiagramType = 'sequence' | 'flowchart' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'custom';

export interface DiagramModel {
  id: string;
  title: string;
  type?: DiagramType;
  code: string;
  theme?: 'dark' | 'forest' | 'neutral' | 'default';
  position: NodePosition;
  pageId?: string; // Figma 스타일 다중 페이지 소속
}

export interface PageModel {
  id: string;
  name: string;
  order: number;
  icon?: string;
}

export interface ColumnMapping {
  parentColumnId: string;
  childColumnId: string;
}

export interface RelationshipModel {
  id: string;
  parentTableId: string;
  childTableId: string;
  columnMappings: ColumnMapping[];
  relationshipType: RelationshipType; // 'identifying' (실선) | 'non-identifying' (점선)
  cardinality: Cardinality;
  sourceMultiplicity?: CrowsFootMultiplicity; // 부모측 기호 (기본: 'mandatory-one' 또는 'optional-one')
  targetMultiplicity?: CrowsFootMultiplicity; // 자식측 기호 (기본: 7종 중 선택)
  onDelete: ReferentialAction;
  onUpdate: ReferentialAction;
  constraintName?: string;
}

export interface NodePosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface NodeView {
  id: string;
  tableId: string;
  position: NodePosition;
}

export interface DomainItem {
  id: string;
  name: string; // e.g. '이메일', '전화번호', 'h12, h24'
  dataType: string; // e.g. 'VARCHAR(255)', 'enum', 'timestamptz'
  defaultValue?: string; // e.g. 'h24', 'now()', 'false'
}

export interface SchemaModel {
  tablesById: Record<string, TableModel>;
  relationshipsById: Record<string, RelationshipModel>;
}

export interface DiagramView {
  nodesById: Record<string, NodeView>;
  displayMode: DisplayMode;
}

export interface ProjectDocument {
  schemaVersion: number;
  model: SchemaModel;
  view: DiagramView;
}

// Presence & Awareness Types
export interface UserPresence {
  userId: string;
  displayName: string;
  color: string;
  avatarUrl?: string;
  cursor?: { x: number; y: number };
  selectedTableId?: string;
  selectedColumnId?: string;
  editingCell?: { tableId: string; columnId?: string; field: string };
  activePageId?: string; // 동료가 보고 있는 페이지
}

// Version History & Snapshots
export interface ERDSnapshot {
  tables: Record<string, TableModel>;
  relationships: Record<string, RelationshipModel>;
  nodes: Record<string, NodeView>;
  memos: Record<string, MemoModel>;
  diagrams?: Record<string, DiagramModel>;
  pages?: Record<string, PageModel>;
  domains: DomainItem[];
  projectTitle?: string;
  meta?: any;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  snapshot: ERDSnapshot;
  tableCount: number;
  relationshipCount: number;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  isAutoSnapshot?: boolean;
}

