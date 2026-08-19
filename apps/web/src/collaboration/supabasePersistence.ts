import * as Y from 'yjs';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Uint8Array 바이너리를 PostgreSQL Bytea 호환 Hex 문자열(\x...)로 변환합니다.
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, '0');
  }
  return '\\x' + hex;
}

/**
 * PostgreSQL Bytea 결과(Hex, Base64, ArrayBuffer 등)를 Uint8Array로 변환합니다.
 */
export function parseByteaToUint8Array(val: any): Uint8Array | null {
  if (!val) return null;

  if (val instanceof Uint8Array) {
    return val;
  }

  if (Array.isArray(val)) {
    return new Uint8Array(val);
  }

  if (typeof val === 'string') {
    // 1. PostgreSQL Hex Format (\x...)
    if (val.startsWith('\\x') || val.startsWith('0x')) {
      const cleanHex = val.slice(2);
      const length = cleanHex.length / 2;
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
      }
      return bytes;
    }

    // 2. Base64 format fallback
    try {
      const binaryString = atob(val);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch {
      // Not base64
    }
  }

  return null;
}

/**
 * Supabase DB에서 최신 Yjs 문서를 가져와 Y.Doc에 직접 적용합니다.
 */
export async function loadDocFromSupabase(projectId: string, doc: Y.Doc): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !projectId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('project_documents')
      .select('ydoc_state, updated_at')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      console.warn('[SupabasePersistence] DB 조회 실패 (RLS 또는 네트워크):', error.message);
      return false;
    }

    if (data?.ydoc_state) {
      const binary = parseByteaToUint8Array(data.ydoc_state);
      if (binary && binary.byteLength > 0) {
        Y.applyUpdate(doc, binary, 'supabase-direct-load');
        console.log(
          `[SupabasePersistence] ✅ Supabase DB에서 최신 데이터 복원 완료 (${binary.byteLength} bytes, updated: ${data.updated_at})`
        );
        return true;
      }
    }
  } catch (err: any) {
    console.warn('[SupabasePersistence] DB 로드 예외 발생:', err.message);
  }

  return false;
}

/**
 * 현재 Yjs 문서를 바이너리로 추출하여 Supabase DB에 직접 upsert 합니다.
 * 이전 저장된 바이너리와 동일하면 불필요한 네트워크 API 호출을 건너뜁니다.
 */
let lastSavedStateHex: string | null = null;

export async function saveDocToSupabase(
  projectId: string,
  doc: Y.Doc,
  force: boolean = false
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !projectId) {
    return false;
  }

  try {
    const state = Y.encodeStateAsUpdate(doc);
    if (state.byteLength === 0) return true;

    const hexState = uint8ArrayToHex(state);

    // [비용 최적화 1] 이전 저장본과 완전히 동일한 경우 불필요한 Supabase API 호출 건너뛰기
    if (!force && lastSavedStateHex === hexState) {
      return true;
    }

    const { error } = await supabase.from('project_documents').upsert(
      {
        project_id: projectId,
        ydoc_state: hexState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    if (error) {
      console.warn('[SupabasePersistence] ⚠️ Supabase DB 저장 실패:', error.message);
      return false;
    }

    lastSavedStateHex = hexState;
    console.log(`[SupabasePersistence] 💾 Supabase DB에 최신 상태 저장 완료 (${state.byteLength} bytes)`);
    return true;
  } catch (err: any) {
    console.warn('[SupabasePersistence] ⚠️ Supabase DB 저장 중 예외 발생:', err.message);
    return false;
  }
}

export type SaveStatus = 'synced' | 'saving' | 'error';

/**
 * Yjs 문서 변경을 감지하여 Supabase DB로 디바운스(Debounce) 자동 저장을 수행하는 관리자를 생성합니다.
 * 비용 효율성:
 * 1. 로컬 사용자가 직접 수정한 변경(origin === clientID)에 대해서만 자동 저장을 스케줄링하여 다중 사용자 협업 시 중복 API 호출을 방지합니다.
 * 2. 2초 디바운스로 연속 편집 시 Supabase API 호출 횟수를 최소화합니다.
 * 3. 상태 변경이 없을 경우 네트워크 전송을 완전히 생략합니다.
 */
export function createDebouncedDocSaver(
  projectId: string,
  doc: Y.Doc,
  options: {
    delayMs?: number;
    onStatusChange?: (status: SaveStatus) => void;
  } = {}
) {
  const delayMs = options.delayMs ?? 2000;
  let timer: NodeJS.Timeout | null = null;
  let isDestroyed = false;

  const triggerSave = () => {
    if (timer) clearTimeout(timer);
    options.onStatusChange?.('saving');

    timer = setTimeout(async () => {
      if (isDestroyed) return;
      const success = await saveDocToSupabase(projectId, doc);
      if (!isDestroyed) {
        options.onStatusChange?.(success ? 'synced' : 'error');
      }
    }, delayMs);
  };

  // Yjs update 리스너
  const handleDocUpdate = (update: Uint8Array, origin: any) => {
    // 1. Supabase 초기 로드 시에는 저장 트리거 제외
    if (origin === 'supabase-direct-load') {
      // 초기 로드된 상태를 lastSavedStateHex로 등록하여 초기 불필요한 upsert 방지
      try {
        const state = Y.encodeStateAsUpdate(doc);
        lastSavedStateHex = uint8ArrayToHex(state);
      } catch {}
      return;
    }

    // 2. [비용 최적화 2] 다중 접속 협업 시 타인이 발생시킨 원격 업데이트는 제외하고,
    // 오직 내가 직접 수정한 로컬 트랜잭션(origin === doc.clientID 또는 로컬 액션)일 때만 저장 트리거
    const isLocalChange = origin === doc.clientID || origin === null || typeof origin === 'string' || origin === undefined;
    if (!isLocalChange) {
      return;
    }

    triggerSave();
  };

  doc.on('update', handleDocUpdate);

  return {
    saveNow: async (force: boolean = false) => {
      if (timer) clearTimeout(timer);
      options.onStatusChange?.('saving');
      const success = await saveDocToSupabase(projectId, doc, force);
      options.onStatusChange?.(success ? 'synced' : 'error');
      return success;
    },
    destroy: () => {
      isDestroyed = true;
      if (timer) clearTimeout(timer);
      doc.off('update', handleDocUpdate);
    },
  };
}
