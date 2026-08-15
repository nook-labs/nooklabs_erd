import { Server } from '@hocuspocus/server';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;

const server = Server.configure({
  port: PORT,
  
  async onConnect(data: any) {
    console.log(`[Hocuspocus] Client connected to room: ${data.documentName}`);
  },

  async onAuthenticate(data: any) {
    const { token } = data;
    // MVP mode: allow anonymous/dev tokens or pass-through for development
    if (process.env.NODE_ENV === 'development' || !token) {
      return {
        user: {
          id: data.connection?.readOnly ? 'viewer-dev' : 'editor-dev',
          name: 'Dev User',
        },
      };
    }
    // Future: verify Supabase JWT token and project membership
    return {
      user: {
        id: 'user-authenticated',
        name: 'Authenticated User',
      },
    };
  },

  async onLoadDocument(data: any) {
    console.log(`[Hocuspocus] Loading document: ${data.documentName}`);
    // Future: load ydoc state from Supabase project_documents table
    return data.document;
  },

  async onStoreDocument(data: any) {
    console.log(`[Hocuspocus] Saving document update: ${data.documentName}`);
    // Future: save ydoc state to Supabase project_documents table
  },
});

server.listen().then(() => {
  console.log(`🚀 Collaboration Server running at ws://localhost:${PORT}`);
});
