import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { TableModel, RelationshipModel, NodeView, MemoModel, DomainItem } from '@/types/erd';

export interface ERDDocManager {
  doc: Y.Doc;
  tablesMap: Y.Map<TableModel>;
  relationshipsMap: Y.Map<RelationshipModel>;
  nodesMap: Y.Map<NodeView>;
  memosMap: Y.Map<MemoModel>;
  domainsMap: Y.Map<DomainItem>;
  metaMap: Y.Map<any>;
  provider: HocuspocusProvider | null;
  persistence: IndexeddbPersistence | null;
  undoManager: Y.UndoManager;
}

export function createERDDoc(roomName: string, wsUrl: string = 'ws://localhost:1234'): ERDDocManager {
  const doc = new Y.Doc();

  const tablesMap = doc.getMap<TableModel>('tables');
  const relationshipsMap = doc.getMap<RelationshipModel>('relationships');
  const nodesMap = doc.getMap<NodeView>('nodes');
  const memosMap = doc.getMap<MemoModel>('memos');
  const domainsMap = doc.getMap<DomainItem>('domains');
  const metaMap = doc.getMap<any>('meta');

  // IndexedDB persistence for offline caching
  let persistence: IndexeddbPersistence | null = null;
  if (typeof window !== 'undefined') {
    persistence = new IndexeddbPersistence(`erd-room-${roomName}`, doc);
  }

  // Hocuspocus Provider
  let provider: HocuspocusProvider | null = null;
  if (typeof window !== 'undefined') {
    provider = new HocuspocusProvider({
      url: wsUrl,
      name: roomName,
      document: doc,
    });
  }

  // UndoManager restricted to local transaction origin
  const undoManager = new Y.UndoManager([tablesMap, relationshipsMap, nodesMap, memosMap], {
    trackedOrigins: new Set([doc.clientID]),
  });

  return {
    doc,
    tablesMap,
    relationshipsMap,
    nodesMap,
    memosMap,
    domainsMap,
    metaMap,
    provider,
    persistence,
    undoManager,
  };
}
