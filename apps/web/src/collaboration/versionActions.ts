import { ERDDocManager } from './doc';
import { ERDSnapshot, TableModel, RelationshipModel, NodeView, MemoModel, DomainItem } from '@/types/erd';

/**
 * Capture the full ERD state snapshot from the active Yjs Doc Manager
 */
export function captureCurrentSnapshot(manager: ERDDocManager, projectTitle?: string): ERDSnapshot {
  const tables: Record<string, TableModel> = {};
  manager.tablesMap.forEach((val, key) => {
    tables[key] = JSON.parse(JSON.stringify(val));
  });

  const relationships: Record<string, RelationshipModel> = {};
  manager.relationshipsMap.forEach((val, key) => {
    relationships[key] = JSON.parse(JSON.stringify(val));
  });

  const nodes: Record<string, NodeView> = {};
  manager.nodesMap.forEach((val, key) => {
    nodes[key] = JSON.parse(JSON.stringify(val));
  });

  const memos: Record<string, MemoModel> = {};
  manager.memosMap.forEach((val, key) => {
    memos[key] = JSON.parse(JSON.stringify(val));
  });

  const domains: DomainItem[] = [];
  manager.domainsMap.forEach((val) => {
    domains.push(JSON.parse(JSON.stringify(val)));
  });

  const meta: any = {};
  manager.metaMap.forEach((val, key) => {
    meta[key] = JSON.parse(JSON.stringify(val));
  });

  return {
    tables,
    relationships,
    nodes,
    memos,
    domains,
    projectTitle: projectTitle || manager.metaMap.get('title'),
    meta,
  };
}

/**
 * Safely and atomically restore all Yjs Maps to the given snapshot state
 */
export function restoreVersionSnapshotAction(
  manager: ERDDocManager,
  snapshot: ERDSnapshot
): void {
  if (!snapshot) return;

  manager.doc.transact(() => {
    // 1. Clear existing maps
    const currentTableKeys = Array.from(manager.tablesMap.keys());
    currentTableKeys.forEach((k) => manager.tablesMap.delete(k));

    const currentRelKeys = Array.from(manager.relationshipsMap.keys());
    currentRelKeys.forEach((k) => manager.relationshipsMap.delete(k));

    const currentNodeKeys = Array.from(manager.nodesMap.keys());
    currentNodeKeys.forEach((k) => manager.nodesMap.delete(k));

    const currentMemoKeys = Array.from(manager.memosMap.keys());
    currentMemoKeys.forEach((k) => manager.memosMap.delete(k));

    const currentDomainKeys = Array.from(manager.domainsMap.keys());
    currentDomainKeys.forEach((k) => manager.domainsMap.delete(k));

    // 2. Restore Tables
    if (snapshot.tables) {
      Object.entries(snapshot.tables).forEach(([k, table]) => {
        manager.tablesMap.set(k, table);
      });
    }

    // 3. Restore Relationships
    if (snapshot.relationships) {
      Object.entries(snapshot.relationships).forEach(([k, rel]) => {
        manager.relationshipsMap.set(k, rel);
      });
    }

    // 4. Restore Nodes
    if (snapshot.nodes) {
      Object.entries(snapshot.nodes).forEach(([k, node]) => {
        manager.nodesMap.set(k, node);
      });
    }

    // 5. Restore Memos
    if (snapshot.memos) {
      Object.entries(snapshot.memos).forEach(([k, memo]) => {
        manager.memosMap.set(k, memo);
      });
    }

    // 6. Restore Domains
    if (snapshot.domains && Array.isArray(snapshot.domains)) {
      snapshot.domains.forEach((dom) => {
        manager.domainsMap.set(dom.id, dom);
      });
    }

    // 7. Restore Title if present
    if (snapshot.projectTitle) {
      manager.metaMap.set('title', snapshot.projectTitle);
    }
  }, manager.doc.clientID);
}
