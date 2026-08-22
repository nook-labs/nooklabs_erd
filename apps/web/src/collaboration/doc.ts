import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { TableModel, RelationshipModel, NodeView, MemoModel, DomainItem, DiagramModel, PageModel } from '@/types/erd';
import { UserProfile } from '@/lib/supabase/types';

export interface ERDDocManager {
  doc: Y.Doc;
  tablesMap: Y.Map<TableModel>;
  relationshipsMap: Y.Map<RelationshipModel>;
  nodesMap: Y.Map<NodeView>;
  memosMap: Y.Map<MemoModel>;
  diagramsMap: Y.Map<DiagramModel>;
  pagesMap: Y.Map<PageModel>;
  domainsMap: Y.Map<DomainItem>;
  metaMap: Y.Map<any>;
  provider: HocuspocusProvider | null;
  persistence: IndexeddbPersistence | null;
  undoManager: Y.UndoManager;
}

export interface CreateERDDocOptions {
  roomName: string;
  wsUrl?: string;
  user?: UserProfile | null;
  token?: string;
  readOnly?: boolean;
}

export function createERDDoc(
  optionsOrRoomName: string | CreateERDDocOptions,
  legacyWsUrl: string = 'ws://localhost:1234'
): ERDDocManager {
  const options: CreateERDDocOptions =
    typeof optionsOrRoomName === 'string'
      ? { roomName: optionsOrRoomName, wsUrl: legacyWsUrl }
      : optionsOrRoomName;

  const roomName = options.roomName;
  let wsUrl = options.wsUrl || process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234';

  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // HTTP(S) url이 들어왔을 경우 WS(S)로 변환
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    }

    // HTTPS 배포 환경에서 ws://로 시작하면 Mixed Content 차단 방지를 위해 wss://로 자동 승격
    if (isHttps && wsUrl.startsWith('ws://') && !wsUrl.includes('localhost') && !wsUrl.includes('127.0.0.1')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
    }

    // 로컬 개발 환경에서 모바일 IP 접속 시 로컬 1234 포트로 포워딩 지원
    if ((wsUrl.includes('localhost') || wsUrl.includes('127.0.0.1')) && !isLocalhost) {
      const isIpAddress = /^[0-9.]+$/.test(window.location.hostname);
      if (isIpAddress) {
        wsUrl = `ws://${window.location.hostname}:1234`;
      }
    }
  }
  const user = options.user;
  const token = options.token || (options.readOnly ? 'token-viewer' : 'token-editor');

  const doc = new Y.Doc();

  const tablesMap = doc.getMap<TableModel>('tables');
  const relationshipsMap = doc.getMap<RelationshipModel>('relationships');
  const nodesMap = doc.getMap<NodeView>('nodes');
  const memosMap = doc.getMap<MemoModel>('memos');
  const diagramsMap = doc.getMap<DiagramModel>('diagrams');
  const pagesMap = doc.getMap<PageModel>('pages');
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
      token,
      onAuthenticationFailed: ({ reason }) => {
        console.warn('[Hocuspocus] Auth failed:', reason);
      },
    });

    if (provider.awareness) {
      const clientId = doc.clientID;
      const userName = user?.display_name || user?.email || `동료_${clientId.toString().slice(-4)}`;
      const userColor = getRandomColor(`${user?.id || clientId}-${clientId}`);
      provider.awareness.setLocalStateField('user', {
        id: user?.id || `usr_${clientId}`,
        clientId,
        name: userName,
        color: userColor,
        avatar: user?.avatar_url,
      });
    }
  }

  // UndoManager restricted to local transaction origin
  const undoManager = new Y.UndoManager([tablesMap, relationshipsMap, nodesMap, memosMap, diagramsMap, pagesMap], {
    trackedOrigins: new Set([doc.clientID]),
  });

  return {
    doc,
    tablesMap,
    relationshipsMap,
    nodesMap,
    memosMap,
    diagramsMap,
    pagesMap,
    domainsMap,
    metaMap,
    provider,
    persistence,
    undoManager,
  };
}

function getRandomColor(seed: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#06b6d4', '#f59e0b'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
