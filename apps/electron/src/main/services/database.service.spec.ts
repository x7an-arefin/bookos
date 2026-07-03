import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { DatabaseService } from './database.service.js';

describe('DatabaseService (JSON File Store)', () => {
  let dbPath: string;
  let db: DatabaseService;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `bookos-test-${Date.now()}-${Math.random()}.json`);
    db = new DatabaseService(dbPath);
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) {
      fs.removeSync(dbPath);
    }
  });

  it('should initialize database file with default schemas', () => {
    expect(fs.existsSync(dbPath)).toBe(true);
    const parsed = fs.readJsonSync(dbPath);
    expect(parsed.projects).toEqual([]);
    expect(parsed.assets).toEqual([]);
    expect(parsed.snapshots).toEqual([]);
  });

  it('should upsert and retrieve a project', () => {
    const projectMock: any = {
      id: 'proj-1',
      meta: { title: 'Test Book', author: 'Author Name' },
      frontMatterSections: [],
      chapters: [
        { id: 'ch1', contentMarkdown: 'This is a test of the book content.' },
      ],
      backMatterSections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.upsertProject(projectMock, '/path/to/folder');

    const projects = db.getAllProjects();
    expect(projects.length).toBe(1);
    expect(projects[0]!.id).toBe('proj-1');
    expect(projects[0]!.title).toBe('Test Book');
    expect(projects[0]!.author).toBe('Author Name');
    expect(projects[0]!.wordCount).toBe(8); // 8 words

    const single = db.getProjectById('proj-1');
    expect(single).toBeDefined();
    expect(single!.id).toBe('proj-1');
  });

  it('should update an existing project on subsequent upsert', () => {
    const projectMock: any = {
      id: 'proj-1',
      meta: { title: 'First Title' },
      chapters: [],
    };
    db.upsertProject(projectMock, '/folder');

    projectMock.meta.title = 'Updated Title';
    db.upsertProject(projectMock, '/folder');

    const single = db.getProjectById('proj-1');
    expect(single!.title).toBe('Updated Title');
  });

  it('should cascade delete assets and snapshots on project deletion', () => {
    const projectMock: any = { id: 'proj-1', meta: {}, chapters: [] };
    db.upsertProject(projectMock, '/folder');

    const assetMock: any = { id: 'asset-1', bookId: 'proj-1', filename: 'img.png', localPath: '/path', mimeType: 'image/png', sizeBytes: 100, variants: {} };
    db.upsertAsset(assetMock);

    const snapshotMock: any = { id: 'snap-1', bookId: 'proj-1', wordCount: 100, isManual: true, createdAt: new Date().toISOString(), projectJson: '{}' };
    db.insertSnapshot(snapshotMock);

    expect(db.getAssetById('asset-1')).toBeDefined();
    expect(db.getSnapshotsByBookId('proj-1').length).toBe(1);

    db.deleteProject('proj-1');

    expect(db.getProjectById('proj-1')).toBeUndefined();
    expect(db.getAssetById('asset-1')).toBeUndefined();
    expect(db.getSnapshotsByBookId('proj-1').length).toBe(0);
  });

  it('should enforce snapshots limit by deleting oldest first', () => {
    const bookId = 'proj-1';
    for (let i = 1; i <= 25; i++) {
      const snap: any = {
        id: `snap-${i}`,
        bookId,
        wordCount: i * 10,
        isManual: false,
        createdAt: new Date(Date.now() + i * 1000).toISOString(),
        projectJson: '{}',
      };
      db.insertSnapshot(snap);
    }

    expect(db.getSnapshotsByBookId(bookId).length).toBe(25);

    db.deleteOldestSnapshotsIfOverLimit(bookId, 20);

    const snapshots = db.getSnapshotsByBookId(bookId);
    expect(snapshots.length).toBe(20);

    expect(db.getSnapshotById('snap-1')).toBeUndefined();
    expect(db.getSnapshotById('snap-5')).toBeUndefined();
    expect(db.getSnapshotById('snap-6')).toBeDefined();
  });
});
