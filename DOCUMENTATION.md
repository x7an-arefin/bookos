# BookOS — Technical Documentation

> **Version**: 1.0.0 — Phase 4 Complete  
> **Stack**: Angular 18 · Cloudflare Workers · D1 (SQLite) · KV · Durable Objects · Y.js · Tiptap  
> **Live URLs**:
> - SPA: https://bookos-app.pages.dev  
> - API: https://bookos-api.x7an-arefin.workers.dev

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Local Development Setup](#4-local-development-setup)
5. [API Reference](#5-api-reference)
6. [Authentication System](#6-authentication-system)
7. [Cloud Sync System](#7-cloud-sync-system)
8. [Collaboration System](#8-collaboration-system)
9. [Version History & Snapshots](#9-version-history--snapshots)
10. [Export System](#10-export-system)
11. [Assets System](#11-assets-system)
12. [Email System](#12-email-system)
13. [Data Layer & Repository Pattern](#13-data-layer--repository-pattern)
14. [Electron Desktop Mode](#14-electron-desktop-mode)
15. [Database Schema](#15-database-schema)
16. [CI/CD Pipeline](#16-cicd-pipeline)
17. [Environment Configuration](#17-environment-configuration)
18. [Testing](#18-testing)
19. [Deployment Guide](#19-deployment-guide)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Overview

**BookOS** is a full-featured book authoring platform that runs in two modes:

| Mode | Hosting | Storage | Sync |
|------|---------|---------|------|
| **Browser (Web)** | Cloudflare Pages | D1 / IndexedDB | Real-time via Worker API |
| **Desktop (Electron)** | Local app | Local filesystem | Offline-first |

The application allows authors to:
- Write long-form books with a Tiptap rich-text editor
- Organize chapters with drag-and-drop reordering
- Sync work across devices via Cloudflare D1
- Collaborate in real-time with co-authors and beta readers
- Export books to PDF, EPUB, and DOCX formats
- Track version history via automatic and manual snapshots
- Manage cover images and inline media assets

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser / Electron                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Angular 18 SPA (Zoneless / Signals)           │ │
│  │                                                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │AuthStore │  │Workspace │  │ Editor   │  │ Export   │  │ │
│  │  │          │  │  Store   │  │  Store   │  │  Store   │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  │                                                            │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │             DAL — Repository Pattern               │   │ │
│  │  │  WORKSPACE_REPOSITORY  │  BUILD_REPOSITORY         │   │ │
│  │  │  ASSET_REPOSITORY      │  (DI Token injection)     │   │ │
│  │  │                        │                           │   │ │
│  │  │  CloudflareXxx  ◄──── Electron detects? ───►  ElectronXxx │
│  │  └────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    │ HTTP / WebSocket
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│           Cloudflare Workers (Hono framework)                   │
│                                                                 │
│  /api/auth/*   /api/books/*   /api/sync/*   /api/collab/*      │
│  /api/snapshots/*   /api/assets/*   /api/comments/*            │
│                                                                 │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐   │
│  │   D1    │  │ SESSION  │  │  RATE_KV    │  │  COLLAB_   │   │
│  │(SQLite) │  │   _KV    │  │             │  │  ROOM (DO) │   │
│  └─────────┘  └──────────┘  └─────────────┘  └────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Hono on Workers** | Ultra-fast edge routing, tiny bundle |
| **Drizzle ORM + D1** | Type-safe SQL without a full ORM overhead |
| **Y.js Durable Objects** | CRDTs for real-time collaboration without a dedicated server |
| **Repository pattern in Angular** | Swaps Electron ↔ Cloudflare implementations at DI level |
| **Zoneless Angular** | Better performance, explicit signal-based reactivity |
| **IndexedDB offline cache** | Workspace data survives network outages |

---

## 3. Project Structure

```
bookos/                          ← NX monorepo root
├── apps/
│   ├── web/                     ← Angular SPA
│   │   └── src/app/
│   │       ├── core/            ← Guards, interceptors, tokens, repositories
│   │       ├── features/        ← Feature modules (lazy-loaded)
│   │       │   ├── auth/        ← Login / register / reset password
│   │       │   ├── dashboard/   ← Book library grid
│   │       │   ├── editor/      ← Tiptap editor + drawers
│   │       │   ├── export/      ← PDF/EPUB/DOCX export
│   │       │   ├── assets/      ← Image & media manager
│   │       │   ├── import/      ← DOCX import
│   │       │   ├── settings/    ← Account settings
│   │       │   └── shared/      ← Public beta reader view
│   │       ├── store/           ← Auth & workspace NgRx-style signal stores
│   │       └── shared/          ← Shared UI, services, pipes
│   │
│   ├── worker/                  ← Cloudflare Worker (Hono API)
│   │   └── src/
│   │       ├── db/              ← Drizzle schema + D1 client
│   │       ├── middleware/      ← JWT auth middleware
│   │       ├── routes/          ← API route handlers
│   │       ├── services/        ← JWT, password, session, email, rate limiting
│   │       └── utils/           ← Helper functions
│   │
│   └── electron/                ← Electron desktop wrapper
│
├── packages/
│   └── core/                    ← Shared TypeScript types (BookProject, Chapter…)
│
├── libs/                        ← Shared Angular libraries
│
└── .github/workflows/
    └── deploy.yml               ← CI/CD pipeline
```

---

## 4. Local Development Setup

### Prerequisites

- **Node.js** 20+ (LTS)
- **npm** 10+
- **Cloudflare account** (free plan supported)
- **Wrangler CLI**: installed via `npm ci`

### 1. Clone & Install

```bash
git clone <repo-url> bookos
cd bookos
npm ci
```

### 2. Start the Worker API locally

```bash
# Apply migrations to local D1
npx nx run worker:db:migrate:local

# Start wrangler dev server (port 8787)
npx nx run worker:dev
```

### 3. Start the Angular SPA

```bash
# In a separate terminal
npx nx serve web
```

The app opens at **http://localhost:4200** and talks to the Worker at **http://localhost:8787**.

### 4. Start the Desktop (Electron) app

```bash
# Runs Angular + Electron in parallel
npx nx run web:serve-electron
```

### Local Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Author (self-register) | any valid email | `Test@1234!` |

> There are no pre-seeded user accounts. Register a new account through the `/auth/register` UI or via the API.

---

## 5. API Reference

**Base URL (production)**: `https://bookos-api.x7an-arefin.workers.dev`  
**Base URL (local)**: `http://localhost:8787`

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Authentication (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Create a new account |
| `POST` | `/api/auth/login` | ❌ | Log in, returns JWT pair |
| `POST` | `/api/auth/refresh` | ❌ | Rotate access + refresh tokens |
| `POST` | `/api/auth/logout` | ✅ | Revoke current session |
| `GET` | `/api/auth/me` | ✅ | Return current user profile |
| `PATCH` | `/api/auth/me` | ✅ | Change password |
| `GET` | `/api/auth/sessions` | ✅ | List active sessions |
| `DELETE` | `/api/auth/sessions/:jti` | ✅ | Revoke a specific session |
| `POST` | `/api/auth/forgot-password` | ❌ | Send password reset email |
| `POST` | `/api/auth/reset-password` | ❌ | Complete password reset |

**Register / Login request body:**
```json
{ "email": "author@example.com", "password": "MyP@ssw0rd!" }
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "uuid", "email": "author@example.com", "plan": "free" }
}
```

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

---

### Books (`/api/books`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/books` | List all books owned by current user |
| `POST` | `/api/books` | Create a new book |
| `GET` | `/api/books/:id` | Get a single book with metadata |
| `PATCH` | `/api/books/:id` | Update book title / metadata |
| `DELETE` | `/api/books/:id` | Soft-delete a book |

---

### Chapters (`/api/books/:bookId/chapters`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/books/:id/chapters` | List all chapters in order |
| `POST` | `/api/books/:id/chapters` | Add a new chapter |
| `PATCH` | `/api/books/:id/chapters/:chapterId` | Update chapter content / title |
| `DELETE` | `/api/books/:id/chapters/:chapterId` | Delete a chapter |

---

### Cloud Sync (`/api/sync`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync/push` | Push full BookProject to D1 (conflict detection) |
| `GET` | `/api/sync/pull/:bookId` | Pull full BookProject from D1 |
| `GET` | `/api/sync/diff/:bookId?since=<ms>` | Get only chapters modified after timestamp |
| `GET` | `/api/sync/status/:bookId` | Check if server is ahead of client |

**Push payload:**
```json
{
  "bookId": "uuid",
  "book": { "title": "My Novel", "author": "Jane Doe" },
  "chapters": [
    {
      "id": "uuid",
      "title": "Chapter 1",
      "sortOrder": 1,
      "contentMarkdown": "# Chapter 1\n\nOnce upon a time...",
      "frontMatterJson": null,
      "lastModified": 1782864000000
    }
  ]
}
```

**Push response:**
```json
{
  "success": true,
  "conflicts": [],
  "snapshotId": "uuid",
  "syncedAt": 1782864000000
}
```

If any chapter has a **server `last_modified` newer than the client's**, it is included in `conflicts` instead of being overwritten.

---

### Collaboration (`/api/books/:bookId/collab`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/collab` | Owner | List all collaborators |
| `POST` | `/collab/invite` | Owner | Invite a collaborator by email |
| `POST` | `/collab/accept` | ❌ | Accept an invitation token |
| `DELETE` | `/collab/:sessionId` | Owner | Revoke a collaborator |
| `GET` | `/collab/invite/:token` | ❌ | Preview invite details |
| `GET` | `/collab/ws` | ✅ | WebSocket upgrade for Y.js real-time |

**Invite body:**
```json
{ "email": "coauthor@example.com", "permission": "editor" }
```

**Permission levels:** `editor` · `reviewer` · `viewer`

---

### Snapshots (`/api/snapshots`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/snapshots/:bookId` | List all snapshots |
| `GET` | `/api/snapshots/:bookId/:snapshotId` | Get snapshot detail |
| `POST` | `/api/snapshots/:bookId` | Create manual snapshot |
| `POST` | `/api/snapshots/:bookId/:snapshotId/restore` | Restore snapshot |

Snapshots are also created **automatically** on every sync push.

---

### Comments (`/api/comments`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/comments/:bookId` | List all comments on a shared book |
| `POST` | `/api/comments/:bookId` | Post a comment (guest or registered) |

---

## 6. Authentication System

BookOS uses a **dual-token JWT system**:

| Token | TTL | Purpose |
|-------|-----|---------|
| **Access Token** | 24 hours | Authorize API calls |
| **Refresh Token** | 30 days | Silently obtain new access tokens |

Both tokens are stored in **KV** (`SESSION_KV`) for server-side revocation. This prevents tokens from being usable after logout even before they expire.

### Rate Limiting

Login attempts are rate-limited by IP using `RATE_KV`:
- **5 failed attempts** within 15 minutes → IP blocked for 15 minutes
- After cooldown, the counter resets automatically

---

## 7. Cloud Sync System

### How Sync Works

```
Client writes content
        │
        ▼
Local IndexedDB (offline cache)
        │
        │  on network available
        ▼
POST /api/sync/push ──► D1 Database
        │
        │  conflicts detected?
        ├── YES → SyncConflictError → Conflict Resolution Drawer
        └── NO  → Auto-snapshot created → syncedAt returned
```

### Conflict Resolution

A conflict occurs when the **server's `last_modified` timestamp for a chapter is newer than the client's**. This means another device or collaborator edited that chapter since the client last synced.

The UI shows:
- **Local content** (what you typed)
- **Server content** (what was on the server)
- Three resolution options: **Keep Local** · **Keep Server** · **Merge Manually**

### Offline Mode

If the network is unavailable, writes go to `SyncQueueService`. When connectivity is restored, queued operations are replayed in order.

---

## 8. Collaboration System

### Invitation Flow

```
Owner clicks "Invite" in Collaborators drawer
        │
        ▼
POST /api/books/:id/collab/invite
        │
        ▼
Resend sends invite email to collaborator
        │
Collaborator clicks link → /shared/:inviteToken
        │
        ▼
SharedBookViewComponent loads book content
        │
Collaborator can read + leave comments
```

### Real-Time Co-Editing

Authors with `editor` permission connect via WebSocket to the **Y.js Durable Object** (`BookCollabRoom`). This provides:
- **Conflict-free merged editing** via CRDTs
- **Live cursor positions** with author names
- **Offline-safe**: edits are queued if WebSocket drops

### Shared Beta Reader View

Any collaborator with a valid invite token can visit:
```
https://bookos-app.pages.dev/shared/<invite-token>
```

This public route provides:
- Full read-only book preview (all chapters)
- Highlighted text selection → inline comments
- Guest commenter name input
- Comments sidebar showing all feedback

---

## 9. Version History & Snapshots

### Auto-Snapshots

Every call to `POST /api/sync/push` automatically creates a timestamped snapshot of the entire book state before applying changes. This provides a continuous rollback history.

### Manual Snapshots

In the editor, click the **History** button → **Create Snapshot** → enter a label (e.g. "Draft 1 complete").

### Restoring a Snapshot

In the Version History drawer:
1. Browse the list of checkpoints on the left
2. Click any entry to preview chapters on the right
3. Click **Restore** — this pushes the snapshot content back as the current version

---

## 10. Export System

### Available Formats

| Format | Engine | Notes |
|--------|--------|-------|
| **PDF** | Puppeteer (Electron only) | Full-featured with theme CSS |
| **EPUB** | epub-js (Electron only) | Reflowable ebook format |
| **DOCX** | docx-templater | Available in both modes |

> **Note:** PDF and EPUB export are only available in **Electron (desktop) mode**. In browser mode, these buttons return `{ success: false, unavailable: true }` until cloud-based rendering is added.

### Export Process

1. Open a book → click **Export** in the sidebar
2. Choose format, cover, and chapter selection
3. Configure theme (Classic Serif, Modern Sans, or custom)
4. Click **Export** → file downloads to your device

---

## 11. Assets System

Images and media are managed per-book in the Assets module.

### Upload Flow

```
User selects file
      │
      ▼
GET /api/assets/:bookId/upload-url → pre-signed upload URL
      │
      ▼
PUT to pre-signed URL (direct upload to Cloudflare R2)
      │
      ▼
POST /api/assets/:bookId/confirm → registers asset in D1
```

### Supported Asset Types

- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- Maximum file size: 10MB per asset

---

## 12. Email System

Email is powered by the **Resend API** and requires `RESEND_API_KEY` to be set as a Wrangler secret.

| Email Type | Trigger |
|------------|---------|
| Password Reset | `POST /api/auth/forgot-password` |
| Collaboration Invite | `POST /api/books/:id/collab/invite` |

If `RESEND_API_KEY` is not configured, the Worker logs the link to the console (safe for local development).

---

## 13. Data Layer & Repository Pattern

The Angular app uses three DI tokens for data access:

| Token | Interface | Browser Implementation | Desktop Implementation |
|-------|-----------|----------------------|----------------------|
| `WORKSPACE_REPOSITORY` | `WorkspaceRepository` | `CloudflareWorkspaceRepository` | `ElectronWorkspaceRepository` |
| `BUILD_REPOSITORY` | `BuildRepository` | `CloudflareBuildRepository` | `ElectronBuildRepository` |
| `ASSET_REPOSITORY` | `AssetRepository` | `CloudflareAssetRepository` | `ElectronAssetRepository` |

The factory provider in `app.config.ts` detects Electron via `ElectronService.isElectron()` and injects the appropriate implementation. **All feature components depend only on the token** — never on a concrete class.

---

## 14. Electron Desktop Mode

The Electron wrapper (`apps/electron/`) wraps the Angular SPA with:

- **Local filesystem** access via `fs` module (Electron main process)
- **IPC bridge** to expose file read/write to the Angular renderer
- **Build pipeline**: `npx nx build electron`
- **Native PDF/EPUB export** using Puppeteer inside the main process

### Running in Desktop Mode

```bash
npx nx run web:serve-electron
```

This starts Angular on port 4200 and opens Electron pointing to it.

---

## 15. Database Schema

D1 (SQLite) tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts and plan info |
| `sessions` | JWT sessions (access + refresh JTIs) |
| `books` | Book metadata (title, author, word count, etc.) |
| `chapters` | Chapter content and sort order |
| `snapshots` | Version history checkpoints (full JSON blobs) |
| `collab_sessions` | Collaboration invitations and access |
| `comments` | Beta reader inline comments |
| `assets` | Asset metadata (R2 keys, sizes, mime types) |
| `themes` | Available export themes |

### Connection

```typescript
import { createDb } from '../db/client';
const db = createDb(c.env.DB); // c.env.DB is the D1 binding
```

The schema is defined in `apps/worker/src/db/schema.ts` using Drizzle ORM.

---

## 16. CI/CD Pipeline

On every **push to `main`**, GitHub Actions runs:

```
test-web      ← npx nx test web
test-worker   ← npx nx run worker:test
     │
     ▼ (only if both pass)
deploy-worker ← npx nx run worker:deploy
     │
     ▼
deploy-pages  ← npx nx build web --configuration=production
               wrangler pages deploy dist/apps/web/browser/
```

**Required GitHub Secrets:**

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers + Pages + D1 write access |
| `CLOUDFLARE_ACCOUNT_ID` | `461f1cb370a027a3cedc64070a28d43f` |

---

## 17. Environment Configuration

### Worker (`wrangler.toml`)

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1 Database | Main relational store |
| `SESSION_KV` | KV Namespace | JWT session store |
| `RATE_KV` | KV Namespace | Login rate limiting |
| `COLLAB_ROOM` | Durable Object | Y.js WebSocket rooms |
| `JWT_SECRET` | Secret | Token signing key (set via wrangler) |
| `RESEND_API_KEY` | Secret | Email delivery (set via wrangler) |
| `CORS_ORIGIN` | Var | Allowed SPA origin for CORS |
| `APP_ENV` | Var | `development` or `production` |

### Angular (`environment.ts` / `environment.prod.ts`)

| Property | Development | Production |
|----------|-------------|------------|
| `apiBaseUrl` | `http://localhost:8787` | `https://bookos-api.x7an-arefin.workers.dev` |
| `production` | `false` | `true` |

The swap happens automatically via Angular's `fileReplacements` in `project.json`.

---

## 18. Testing

### Worker Tests (Vitest)

```bash
npx nx run worker:test
```

Tests use `@cloudflare/vitest-pool-workers` to run in a real Worker environment with mocked KV/D1 bindings.

| File | Coverage |
|------|---------|
| `jwt.service.spec.ts` | Token signing, verification, expiry |
| `auth.middleware.spec.ts` | Route protection, session checking |

### Angular Tests (Jest)

```bash
npx nx test web
```

| File | Coverage |
|------|---------|
| `auth.store.spec.ts` | Login, logout, token refresh flow |
| `workspace.store.spec.ts` | Book load / create / delete |
| `cloudflare-workspace.repository.spec.ts` | HTTP mocking, offline fallback |
| `cloudflare-build.repository.spec.ts` | Build unavailable in browser |
| `cloudflare-asset.repository.spec.ts` | Upload and confirm flow |
| `export.store.spec.ts` | Export pipeline states |
| `ipc.service.spec.ts` | Electron IPC bridge |
| `drawer.service.spec.ts` | Overlay drawer lifecycle |
| `app-drawer-host.component.spec.ts` | Drawer host rendering |
| `book-card.component.spec.ts` | Dashboard card rendering |

**Current status:** 79/79 Angular · 9/9 Worker

---

## 19. Deployment Guide

### Worker Deployment

```bash
# Set secrets (one-time)
echo <64-char-hex> | npx wrangler secret put JWT_SECRET
echo <resend-key>  | npx wrangler secret put RESEND_API_KEY

# Apply migrations to production D1
npx wrangler d1 execute bookos-db --remote --file=migrations/0001_init.sql

# Deploy
npx nx run worker:deploy
```

### Angular SPA Deployment

```bash
# Production build (swaps environment.prod.ts)
npx nx build web --configuration=production

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist/apps/web/browser/ --project-name=bookos-app --branch=main
```

### Create KV Namespaces (first time only)

```bash
npx wrangler kv namespace create SESSION_KV --binding SESSION_KV --update-config
npx wrangler kv namespace create RATE_KV --binding RATE_KV --update-config
```

---

## 20. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `indexedDB is not defined` in Jest | JSDOM doesn't implement IndexedDB | Provide `IndexedDbService` mock in `TestBed` |
| `Authentication error [code: 10000]` from Wrangler | OAuth token scope issue for some D1 operations | Use `wrangler d1 execute --remote --file=...` instead of `migrations apply` |
| `new_classes` DO migration fails on free plan | Cloudflare free plan requires SQLite DO | Change to `new_sqlite_classes` in `wrangler.toml` |
| `Cannot find module '../../environments/environment'` | Relative path too shallow | Correct depth: `'../../../environments/environment'` (3 levels from `app/core/tokens/`) |
| Worker CORS rejection on Pages | `CORS_ORIGIN` points to localhost | Set `CORS_ORIGIN = "https://bookos-app.pages.dev"` in `wrangler.toml` and redeploy |
| Email not sending | `RESEND_API_KEY` not configured | Run `echo <key> \| npx wrangler secret put RESEND_API_KEY` |
| Sync push returning conflicts | Server chapter is newer than client | Open the Conflict Resolution drawer and choose Keep Local / Keep Server |
| WebSocket not connecting | Durable Object not deployed | Ensure `new_sqlite_classes = ["BookCollabRoom"]` is in `wrangler.toml` |
