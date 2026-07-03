export interface Env {
  DB: D1Database;
  SESSION_KV: KVNamespace;
  RATE_KV: KVNamespace;
  COLLAB_ROOM: DurableObjectNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  CORS_ORIGIN: string;
  APP_ENV: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  plan: string;
  jti: string;
}

export interface SyncPushRequest {
  bookId: string;
  clientTimestamp: number;
  book: {
    title: string;
    author: string;
    subtitle?: string;
    isbn?: string;
    language?: string;
    publisher?: string;
    configJson?: string;
    themeSlug?: string;
  };
  chapters: Array<{
    id: string;
    title: string;
    sortOrder: number;
    contentMarkdown: string;
    frontMatterJson?: string;
    lastModified: number;
  }>;
}

export interface ConflictedChapter {
  id: string;
  title: string;
  clientContent: string;
  serverContent: string;
  clientLastModified: number;
  serverLastModified: number;
}

export interface SyncPushResponse {
  success: boolean;
  conflicts: ConflictedChapter[];
  snapshotId: string | null;
  syncedAt: number;
}
