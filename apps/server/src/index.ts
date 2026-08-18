import { Server } from '@hocuspocus/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Local disk persistence fallback directory
const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[Server] Could not create local .data dir:', err);
  }
}

// Supabase Admin Client
let supabaseAdmin: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('[Hocuspocus] 🔗 Supabase Client Connected for Persistence');
  } catch (err: any) {
    console.warn('[Hocuspocus] Supabase connection failed, using local disk persistence:', err.message);
  }
}

// Cache resolved project IDs to avoid repetitive DB lookups
const documentProjectMap = new Map<string, string>();

async function resolveProjectId(documentName: string): Promise<string | null> {
  if (documentProjectMap.has(documentName)) {
    return documentProjectMap.get(documentName)!;
  }

  // If documentName is already a standard UUID or proj-id
  let candidateId = documentName.replace(/^erd-proj-/, '');

  if (!supabaseAdmin) {
    documentProjectMap.set(documentName, candidateId);
    return candidateId;
  }

  try {
    // 1. Try querying by id
    const { data: byId } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', candidateId)
      .maybeSingle();

    if (byId?.id) {
      documentProjectMap.set(documentName, byId.id);
      return byId.id;
    }

    // 2. Try querying by room_id
    const { data: byRoom } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('room_id', documentName)
      .maybeSingle();

    if (byRoom?.id) {
      documentProjectMap.set(documentName, byRoom.id);
      return byRoom.id;
    }
  } catch (err: any) {
    console.warn(`[Hocuspocus] Failed to resolve projectId for room [${documentName}]:`, err.message);
  }

  documentProjectMap.set(documentName, candidateId);
  return candidateId;
}

// Local File Persistence Helpers
function saveToLocalDisk(documentName: string, state: Uint8Array) {
  try {
    const filePath = path.join(DATA_DIR, `doc_${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.bin`);
    fs.writeFileSync(filePath, Buffer.from(state));
  } catch (err: any) {
    console.error(`[Hocuspocus] Failed to save local file for [${documentName}]:`, err.message);
  }
}

function loadFromLocalDisk(documentName: string): Uint8Array | null {
  try {
    const filePath = path.join(DATA_DIR, `doc_${documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}.bin`);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return new Uint8Array(buffer);
    }
  } catch (err: any) {
    console.error(`[Hocuspocus] Failed to load local file for [${documentName}]:`, err.message);
  }
  return null;
}

const server = Server.configure({
  port: PORT,

  async onConnect(data: any) {
    console.log(`[Hocuspocus] 🔌 Client connected to room: ${data.documentName}`);
  },

  async onAuthenticate(data: any) {
    const { token, documentName } = data;
    const isReadOnly = Boolean(data.connection?.readOnly || token === 'token-viewer');

    if (!token || token === 'dev-token' || token.startsWith('token-') || process.env.NODE_ENV !== 'production') {
      const role = isReadOnly ? 'viewer' : 'editor';
      console.log(`[Hocuspocus] 🔑 Auth pass for room [${documentName}] as role [${role}]`);
      return {
        user: {
          id: isReadOnly ? 'usr_viewer' : 'usr_editor',
          name: isReadOnly ? 'Viewer' : 'Editor',
          role,
        },
        readOnly: isReadOnly,
      };
    }

    return {
      user: {
        id: 'usr_authenticated',
        name: 'Authenticated User',
        role: isReadOnly ? 'viewer' : 'editor',
      },
      readOnly: isReadOnly,
    };
  },

  async onLoadDocument(data: any) {
    const { documentName, document } = data;
    console.log(`[Hocuspocus] 📂 Loading document state for room: ${documentName}`);

    const projectId = await resolveProjectId(documentName);
    let loadedFromDb = false;

    // 1. Try loading from Supabase project_documents
    if (supabaseAdmin && projectId) {
      try {
        const { data: docRecord, error } = await supabaseAdmin
          .from('project_documents')
          .select('ydoc_state')
          .eq('project_id', projectId)
          .maybeSingle();

        if (!error && docRecord?.ydoc_state) {
          let binaryState: Uint8Array;
          if (typeof docRecord.ydoc_state === 'string') {
            // Hex / base64 string handling
            if (docRecord.ydoc_state.startsWith('\\x')) {
              binaryState = new Uint8Array(Buffer.from(docRecord.ydoc_state.slice(2), 'hex'));
            } else {
              binaryState = new Uint8Array(Buffer.from(docRecord.ydoc_state, 'base64'));
            }
          } else {
            binaryState = new Uint8Array(docRecord.ydoc_state);
          }

          if (binaryState.byteLength > 0) {
            Y.applyUpdate(document, binaryState);
            console.log(
              `[Hocuspocus] ✅ Successfully restored [${documentName}] from Supabase (${binaryState.byteLength} bytes)`
            );
            loadedFromDb = true;
          }
        }
      } catch (err: any) {
        console.warn(`[Hocuspocus] ⚠️ Supabase load error for [${documentName}]:`, err.message);
      }
    }

    // 2. Fallback to Local Disk if not found in DB
    if (!loadedFromDb) {
      const diskState = loadFromLocalDisk(documentName);
      if (diskState && diskState.byteLength > 0) {
        Y.applyUpdate(document, diskState);
        console.log(
          `[Hocuspocus] 💾 Restored [${documentName}] from local disk backup (${diskState.byteLength} bytes)`
        );
      } else {
        console.log(`[Hocuspocus] 📄 Initializing fresh document for [${documentName}]`);
      }
    }

    return document;
  },

  async onStoreDocument(data: any) {
    const { documentName, document } = data;
    const state = Y.encodeStateAsUpdate(document);

    console.log(`[Hocuspocus] 💾 Saving document update for [${documentName}] (${state.byteLength} bytes)`);

    // 1. Save to Local Disk immediately
    saveToLocalDisk(documentName, state);

    // 2. Save to Supabase project_documents asynchronously
    const projectId = await resolveProjectId(documentName);
    if (supabaseAdmin && projectId) {
      try {
        const hexState = '\\x' + Buffer.from(state).toString('hex');
        const { error } = await supabaseAdmin.from('project_documents').upsert({
          project_id: projectId,
          ydoc_state: hexState,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          // If hex string fails on some setups, try raw buffer
          const { error: retryError } = await supabaseAdmin.from('project_documents').upsert({
            project_id: projectId,
            ydoc_state: Buffer.from(state) as any,
            updated_at: new Date().toISOString(),
          });
          if (retryError) {
            console.warn(`[Hocuspocus] ⚠️ Failed to upsert to Supabase [${projectId}]:`, retryError.message);
          } else {
            console.log(`[Hocuspocus] ✨ Supabase saved [${projectId}] successfully (buffer)`);
          }
        } else {
          console.log(`[Hocuspocus] ✨ Supabase saved [${projectId}] successfully (hex)`);
        }
      } catch (err: any) {
        console.warn(`[Hocuspocus] Supabase save exception for [${projectId}]:`, err.message);
      }
    }
  },

  async onDisconnect(data: any) {
    console.log(`[Hocuspocus] ⚡ Client disconnected from room: ${data.documentName}`);
  },
});

server.listen().then(() => {
  console.log(`🚀 NookLabs ERD Collaboration Server running at ws://localhost:${PORT}`);
});
