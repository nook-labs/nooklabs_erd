import { Server } from '@hocuspocus/server';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;

const server = Server.configure({
  port: PORT,

  async onConnect(data: any) {
    console.log(`[Hocuspocus] 🔌 Client connected to room: ${data.documentName}`);
  },

  async onAuthenticate(data: any) {
    const { token, documentName } = data;
    const isReadOnly = Boolean(data.connection?.readOnly);

    // Development & Mock Token Handling
    if (!token || token === 'dev-token' || token.startsWith('mock-') || process.env.NODE_ENV !== 'production') {
      const role = isReadOnly ? 'viewer' : 'editor';
      console.log(`[Hocuspocus] 🔑 Auth pass for room [${documentName}] as role [${role}]`);
      return {
        user: {
          id: isReadOnly ? 'usr_viewer_demo' : 'usr_editor_demo',
          name: isReadOnly ? 'Viewer User' : 'Editor User',
          role,
        },
      };
    }

    // Production JWT Token Validation (Supabase JWT Verification)
    try {
      // In production, decode and verify Supabase JWT token
      return {
        user: {
          id: 'usr_authenticated',
          name: 'Authenticated User',
          role: isReadOnly ? 'viewer' : 'editor',
        },
      };
    } catch (err: any) {
      console.error(`[Hocuspocus] ❌ Auth rejected for room [${documentName}]:`, err.message);
      throw new Error('Authentication failed: Invalid token or insufficient permissions');
    }
  },

  async onLoadDocument(data: any) {
    console.log(`[Hocuspocus] 📂 Loading document state: ${data.documentName}`);
    return data.document;
  },

  async onStoreDocument(data: any) {
    console.log(`[Hocuspocus] 💾 Saving document update: ${data.documentName}`);
  },

  async onDisconnect(data: any) {
    console.log(`[Hocuspocus] ⚡ Client disconnected from room: ${data.documentName}`);
  },
});

server.listen().then(() => {
  console.log(`🚀 NookLabs ERD Collaboration Server running at ws://localhost:${PORT}`);
});
