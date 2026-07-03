# BookOS — User & Admin Guide

> This guide explains how to use BookOS from both a regular **Author** perspective and
> an **Admin / Super-Author** perspective. Test credentials are provided for both scenarios.

---

## Table of Contents

1. [Accessing BookOS](#1-accessing-bookos)
2. [Test Accounts](#2-test-accounts)
3. [Author Guide — Getting Started](#3-author-guide--getting-started)
4. [Author Guide — Writing Your Book](#4-author-guide--writing-your-book)
5. [Author Guide — Syncing & Going Offline](#5-author-guide--syncing--going-offline)
6. [Author Guide — Version History](#6-author-guide--version-history)
7. [Author Guide — Inviting Beta Readers](#7-author-guide--inviting-beta-readers)
8. [Author Guide — Real-Time Collaboration](#8-author-guide--real-time-collaboration)
9. [Author Guide — Exporting Your Book](#9-author-guide--exporting-your-book)
10. [Author Guide — Managing Assets](#10-author-guide--managing-assets)
11. [Author Guide — Account Settings](#11-author-guide--account-settings)
12. [Beta Reader Guide](#12-beta-reader-guide)
13. [Admin / Super-Author Guide](#13-admin--super-author-guide)
14. [Password & Security Policy](#14-password--security-policy)
15. [Frequently Asked Questions](#15-frequently-asked-questions)

---

## 1. Accessing BookOS

| Environment | URL |
|-------------|-----|
| **Production (Web)** | https://bookos-app.pages.dev |
| **Local Development** | http://localhost:4200 |
| **API (Worker)** | https://bookos-api.x7an-arefin.workers.dev |

BookOS works entirely in your browser — no installation required in web mode.  
For the **desktop version** (PDF/EPUB export, full offline support), run the Electron app locally.

---

## 2. Test Accounts

> These are the accounts used during development and testing. Use them to explore all features
> without creating your own account first.

### Primary Test Author (Regular User)

| Field | Value |
|-------|-------|
| **Email** | `testauthor@bookos.dev` |
| **Password** | `TestAuthor@1234!` |
| **Role** | Author (free plan) |
| **Access** | Full book creation, editing, sync, collaboration invites |

> **To create this account**, register at https://bookos-app.pages.dev/auth/register  
> with the credentials above. The system will create the account on first use.

---

### Secondary Test Author (for Collaboration Testing)

| Field | Value |
|-------|-------|
| **Email** | `collaborator@bookos.dev` |
| **Password** | `Collab@5678!` |
| **Role** | Co-Author / Reviewer |
| **Access** | Accepts invitations, edits shared chapters, posts comments |

---

### Beta Reader (No Account Needed)

Beta readers access books via a **direct invite link** — no registration required.  
They can read chapters and post comments as a guest.

| Field | Value |
|-------|-------|
| **Access method** | Invitation link (e.g. `https://bookos-app.pages.dev/shared/<token>`) |
| **Name displayed** | Guest name entered at first visit |

---

## 3. Author Guide — Getting Started

### Step 1: Register / Log In

1. Go to https://bookos-app.pages.dev
2. Click **Get Started** or navigate to `/auth/register`
3. Enter your email and a strong password (see [Password Policy](#14-password--security-policy))
4. You are automatically logged in and taken to the **Dashboard**

### Step 2: Your Dashboard

The **Dashboard** is your book library. It shows:
- All books you own (displayed as cards with cover image, title, word count)
- A **New Book** button (top-right)
- Metadata: last edited date, chapter count, collaborator count

### Step 3: Create Your First Book

1. Click **New Book** on the dashboard
2. Enter a **title** and (optionally) an **author name**
3. Choose a starting **theme** (Classic Serif / Modern Sans)
4. Click **Create** — you are taken directly into the editor

---

## 4. Author Guide — Writing Your Book

### The Editor Layout

```
┌────────────────────────────────────────────────────────────┐
│  ☰  BookOS              [Sync Status]   [History] [Share]  │
├──────────────┬─────────────────────────────────────────────┤
│              │                                             │
│  Chapter     │         Tiptap Editor Canvas               │
│  List        │                                             │
│  (sidebar)   │   # Chapter Title                          │
│              │                                             │
│  + Add       │   Start writing here...                    │
│  Chapter     │                                             │
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### Chapter Management

| Action | How |
|--------|-----|
| Add a chapter | Click **+ Add Chapter** in the sidebar |
| Rename a chapter | Double-click the chapter title in the sidebar |
| Reorder chapters | Drag and drop chapters in the sidebar list |
| Delete a chapter | Right-click on chapter → **Delete** |

### Rich Text Formatting

The editor supports:

| Format | Keyboard Shortcut |
|--------|------------------|
| **Bold** | `Ctrl+B` / `Cmd+B` |
| *Italic* | `Ctrl+I` / `Cmd+I` |
| Heading 1 | Type `# ` at line start |
| Heading 2 | Type `## ` at line start |
| Heading 3 | Type `### ` at line start |
| Bullet list | Type `- ` at line start |
| Numbered list | Type `1. ` at line start |
| Quote | Type `> ` at line start |
| Code block | Type ` ``` ` at line start |
| Horizontal rule | Type `---` at line start |

### Word Count

Live word count is displayed at the bottom of the editor, updating as you type.

---

## 5. Author Guide — Syncing & Going Offline

### How Sync Works

BookOS automatically saves your work to the **cloud** every time you stop typing (30-second debounce). You can also trigger a manual sync:

1. Click the **cloud icon** (sync status indicator) in the top bar
2. Or use `Ctrl+S` / `Cmd+S`

### Sync Status Indicators

| Icon | Meaning |
|------|---------|
| 🟢 Green cloud | Synced — all changes saved to cloud |
| 🟡 Yellow spinning | Syncing in progress |
| 🔴 Red cloud | Sync failed (offline or conflict) |
| 📴 No icon | Offline mode — changes saved locally |

### Working Offline

- All changes are saved to **IndexedDB** (browser local storage) automatically
- When you go back online, BookOS will **automatically sync** your queued changes
- You will **never lose work** due to going offline

### Conflict Resolution

If you edited a chapter on two different devices while offline, you may see a **conflict dialog** when reconnecting:

1. A side-by-side view shows **Your version (left)** vs **Server version (right)**
2. Choose one of:
   - **Keep Mine** — your local version wins
   - **Keep Server** — the cloud version wins
   - **Merge Manually** — edit both versions together
3. Click **Resolve** — the conflict is cleared and a new snapshot is saved

---

## 6. Author Guide — Version History

BookOS automatically creates a **snapshot** every time you sync. You can also create named checkpoints manually.

### Viewing History

1. In the editor, click **History** in the top bar
2. The **Version History drawer** opens on the left
3. Browse checkpoints by date/label
4. Click any checkpoint to preview its chapter content on the right side

### Creating a Manual Snapshot

1. In the Version History drawer, click **+ Create Snapshot**
2. Enter a label (e.g. "Draft 2 — beta reader ready")
3. Click **Save Snapshot**

### Restoring a Snapshot

1. Open Version History
2. Find the snapshot you want
3. Click **Restore** next to it
4. Confirm the restore — your current draft is replaced with the snapshot
5. A new snapshot of the current state is created before restoring (safety net)

---

## 7. Author Guide — Inviting Beta Readers

### Invite a Collaborator

1. In the editor, click **Share** / the **People** icon in the top bar
2. The **Collaborators drawer** opens
3. Click **+ Invite**
4. Enter the collaborator's **email address**
5. Choose their **permission level**:
   - **Editor** — can read and write (real-time co-editing)
   - **Reviewer** — can read and leave comments
   - **Viewer** — read-only, no comments
6. Click **Send Invite**

The collaborator receives an **email** (if `RESEND_API_KEY` is configured) with a direct link.

### Share Link

You can also copy the **share link** directly:
1. In the Collaborators drawer, find the collaborator
2. Click **Copy Link** — share this URL however you like
3. The link looks like: `https://bookos-app.pages.dev/shared/<token>`

### Revoking Access

1. Open the Collaborators drawer
2. Find the collaborator
3. Click **Revoke** — they can no longer access the book

---

## 8. Author Guide — Real-Time Collaboration

When multiple **Editor-level** collaborators are viewing a book simultaneously:

- You see **colored cursors** for each collaborator (showing their name)
- Changes from collaborators appear **instantly** in the editor
- There is **no save button** — changes merge automatically via Y.js CRDTs
- If a collaborator goes offline, their changes are buffered and merged when they reconnect

> **Real-time collaboration requires** the Cloudflare Worker to be deployed with Durable Objects enabled.

---

## 9. Author Guide — Exporting Your Book

### Accessing Export

1. From the dashboard, click the **Export** button on a book card
2. Or inside the editor, click the **Export** icon in the sidebar

### Available Formats

| Format | Available In |
|--------|-------------|
| **DOCX** (Word Document) | Browser + Desktop |
| **PDF** | Desktop only |
| **EPUB** | Desktop only |

### Export Steps

1. Select the **format** you want
2. Choose which **chapters** to include (all selected by default)
3. Select a **theme**:
   - **Classic Serif** — Traditional Georgia font, 11pt, 1.6 line height
   - **Modern Sans** — Clean Inter font, 10.5pt, 1.5 line height
4. Optionally set a **cover image**
5. Click **Export** → file downloads automatically

> **Note on PDF/EPUB:** These are only available in the **Electron desktop app**. In the browser,
> you will see a message saying PDF/EPUB export requires the desktop app.

---

## 10. Author Guide — Managing Assets

The **Assets** section lets you manage images and media files for your book.

### Uploading an Asset

1. Click **Assets** in the sidebar (or navigate to `/assets/:bookId`)
2. Click **Upload** → select your file
3. Supported formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
4. Maximum size: **10MB per file**
5. The asset is uploaded to Cloudflare R2 and registered in the database

### Using Assets in the Editor

After uploading, click the **Image** button in the editor toolbar → select from your uploaded assets.

### Deleting an Asset

Click the **trash icon** on the asset card → confirm deletion.

---

## 11. Author Guide — Account Settings

Navigate to **Settings** in the sidebar or go to `/settings`.

### Change Password

1. Go to **Settings** → **Security**
2. Enter your new password (must meet [password requirements](#14-password--security-policy))
3. Click **Update Password**

### Manage Sessions

1. Go to **Settings** → **Sessions**
2. See a list of all active sessions (device, IP, last active)
3. Click **Revoke** on any session to log it out remotely
4. Useful if you think your account was accessed without permission

### Forgot Password

1. Go to https://bookos-app.pages.dev/auth/login
2. Click **Forgot Password?**
3. Enter your email → receive a reset link (valid for **1 hour**)
4. Click the link in the email → enter a new password

---

## 12. Beta Reader Guide

Beta readers access books through a **direct invite link** — no account required.

### Accessing a Shared Book

1. Click the invite link sent by the author  
   (looks like `https://bookos-app.pages.dev/shared/<token>`)
2. You may be asked to enter your **name** (for comment attribution)
3. The full book loads in a clean, distraction-free reading view

### Reading the Book

- Use the **chapter navigation** on the left to jump between chapters
- The view is read-only — you cannot edit the content

### Leaving Comments

1. **Select any text** in the book — a highlight bubble appears
2. Click the **Comment** button
3. Type your feedback → click **Submit**
4. Your comment appears in the **Comments sidebar** on the right

### Viewing Other Comments

- The **Comments sidebar** shows all feedback from all readers
- You can see who commented and when (by guest name or registered email)
- Only the **book owner** can see and manage all comments

---

## 13. Admin / Super-Author Guide

BookOS does not have a traditional admin panel. Administrative control is handled through:

### 1. Cloudflare Dashboard (Infrastructure Admin)

**URL:** https://dash.cloudflare.com  
**Account:** x7an.arefin@gmail.com

| Resource | Location in Dashboard |
|----------|----------------------|
| D1 Database | Workers & Pages → D1 → `bookos-db` |
| KV Namespaces | Workers & Pages → KV → `SESSION_KV` / `RATE_KV` |
| Worker | Workers & Pages → Workers → `bookos-api` |
| Pages | Workers & Pages → Pages → `bookos-app` |
| Durable Objects | Workers & Pages → Workers → `bookos-api` → Durable Objects |

### 2. Direct D1 Database Queries (Admin Operations)

Run SQL directly against the production D1 database:

```bash
# List all users
npx wrangler d1 execute bookos-db --remote --command="SELECT id, email, plan, created_at FROM users ORDER BY created_at DESC"

# View all books
npx wrangler d1 execute bookos-db --remote --command="SELECT id, title, owner_id, word_count FROM books WHERE deleted_at IS NULL"

# Delete a specific user (soft delete)
npx wrangler d1 execute bookos-db --remote --command="UPDATE users SET deleted_at = unixepoch()*1000 WHERE email = 'user@example.com'"

# View active sessions
npx wrangler d1 execute bookos-db --remote --command="SELECT * FROM sessions WHERE revoked_at IS NULL"

# Clear all sessions for a user (force logout all devices)
npx wrangler d1 execute bookos-db --remote --command="UPDATE sessions SET revoked_at = unixepoch()*1000 WHERE user_id = '<user-uuid>'"
```

### 3. Rotate JWT Secret

If you suspect the JWT secret has been compromised:

```bash
# Generate a new secret
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"

# Update the secret (this invalidates ALL existing sessions)
echo <new-secret> | npx wrangler secret put JWT_SECRET

# Redeploy the worker to pick up the new secret
npx nx run worker:deploy
```

> ⚠️ **Warning:** Rotating the JWT secret logs out **all users** immediately.

### 4. Upgrade a User to a Plan

Plans are stored directly in the `users` table:

```bash
# Upgrade user to 'pro' plan
npx wrangler d1 execute bookos-db --remote \
  --command="UPDATE users SET plan = 'pro' WHERE email = 'user@example.com'"
```

### 5. View Worker Logs

```bash
# Stream live logs from the production worker
npx wrangler tail bookos-api
```

### 6. Redeploy the Application

```bash
# Redeploy the API Worker
npx nx run worker:deploy

# Rebuild and redeploy the Angular SPA
npx nx build web --configuration=production
npx wrangler pages deploy dist/apps/web/browser/ --project-name=bookos-app --branch=main
```

### 7. Apply New Database Migrations

```bash
# After adding a new migration file to apps/worker/migrations/
npx wrangler d1 execute bookos-db --remote --file=migrations/<new-migration>.sql
```

---

## 14. Password & Security Policy

### Requirements

Passwords must meet **all** of the following:

| Rule | Example |
|------|---------|
| Minimum 8 characters | ✅ `MyPa$$w0rd` |
| At least one uppercase letter | ✅ `Test` |
| At least one number | ✅ `1234` |
| At least one special character | ✅ `@!#$%^&*` |

### Weak passwords rejected ❌

- `password` — no uppercase, no number, no special char
- `Test1234` — no special character
- `short` — too short

### Valid test passwords ✅

- `TestAuthor@1234!`
- `Collab@5678!`
- `SecureBook#99`

### Session Security

- Access tokens expire after **24 hours**
- Refresh tokens expire after **30 days**
- All sessions can be revoked instantly from the Sessions page
- Login is rate-limited: **5 failed attempts** per 15 minutes per IP address

---

## 15. Frequently Asked Questions

**Q: Can I use BookOS without a Cloudflare account?**  
A: Yes — run the Electron desktop app. It stores all data locally with no cloud dependency.

**Q: Is my writing backed up automatically?**  
A: Yes. Every cloud sync creates an automatic snapshot. You always have a rollback point.

**Q: What happens if I lose internet while writing?**  
A: BookOS saves to your browser's local storage (IndexedDB). When you reconnect, it automatically syncs all queued changes.

**Q: Can two people edit the same chapter at the same time?**  
A: Yes, if both have **Editor** permission and are both online. Changes merge automatically using Y.js CRDTs. You'll see the other person's cursor in real time.

**Q: How long does an invite link stay active?**  
A: Collaboration invite links expire after **7 days**. The book owner can revoke them at any time.

**Q: Can beta readers edit my book?**  
A: No. Beta readers with `reviewer` or `viewer` permission can only read and comment. Only `editor`-level collaborators can make changes.

**Q: Why can't I export to PDF in the browser?**  
A: PDF and EPUB generation requires Puppeteer, which runs in Node.js (not the browser). These are available in the Electron desktop app. Cloud-based PDF export is planned for a future phase.

**Q: How do I delete my account?**  
A: Currently, account deletion must be done by the admin via the D1 database (soft-delete). A self-service account deletion UI is planned for a future release.

**Q: What is the maximum book size?**  
A: There are no hard limits on word count. Very large books (1M+ words) may experience slightly slower sync times due to D1 query sizes.

**Q: Are my drafts private?**  
A: Yes. Only you (the book owner) and people you explicitly invite can access your books. All API endpoints enforce JWT authentication and ownership checks.

---

## Quick Reference Card

### URLs at a Glance

| Purpose | URL |
|---------|-----|
| Web App | https://bookos-app.pages.dev |
| Register | https://bookos-app.pages.dev/auth/register |
| Login | https://bookos-app.pages.dev/auth/login |
| Forgot Password | https://bookos-app.pages.dev/auth/forgot-password |
| Dashboard | https://bookos-app.pages.dev/dashboard |
| Settings | https://bookos-app.pages.dev/settings |
| Shared Book | https://bookos-app.pages.dev/shared/`<token>` |

### Test Credentials Quick Copy

```
Author Account:
  Email:    testauthor@bookos.dev
  Password: TestAuthor@1234!

Collaborator Account:
  Email:    collaborator@bookos.dev
  Password: Collab@5678!
```

### Common Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Trigger manual sync |
| `Ctrl+B` / `Cmd+B` | Bold |
| `Ctrl+I` / `Cmd+I` | Italic |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Tab` | Indent list item |
| `Shift+Tab` | Outdent list item |
