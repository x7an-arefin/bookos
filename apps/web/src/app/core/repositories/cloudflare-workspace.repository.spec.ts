import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CloudflareWorkspaceRepository } from './cloudflare-workspace.repository';
import { ENVIRONMENT } from '../tokens/environment.token';
import { IndexedDbService } from '../../shared/services/indexed-db.service';
import { SyncQueueService } from '../../shared/services/sync-queue.service';
import { BookProject } from '@press/core';

describe('CloudflareWorkspaceRepository', () => {
  let repository: CloudflareWorkspaceRepository;
  let httpMock: HttpTestingController;
  let dbMock: any;
  let syncQueueMock: any;

  const environmentMock = {
    apiBaseUrl: 'https://api.example.com',
  };

  const mockBookProject: BookProject = {
    id: 'book-1',
    meta: {
      title: 'Test Book',
      author: 'Author Name',
    },
    config: {
      activeTheme: 'classic-serif',
    },
    chapters: [
      {
        id: 'chap-1',
        title: 'Chapter 1',
        sortOrder: 1,
        contentMarkdown: 'Hello World',
        frontMatter: {},
        updatedAt: '2026-07-01T00:00:00Z',
      },
    ],
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  };

  beforeEach(() => {
    dbMock = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    syncQueueMock = {
      enqueue: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CloudflareWorkspaceRepository,
        { provide: ENVIRONMENT, useValue: environmentMock },
        { provide: IndexedDbService, useValue: dbMock },
        { provide: SyncQueueService, useValue: syncQueueMock },
      ],
    });

    repository = TestBed.inject(CloudflareWorkspaceRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('readProject', () => {
    it('issues GET to pull URL and caches in IndexedDB', async () => {
      dbMock.set.mockResolvedValue(undefined);

      const promise = repository.readProject('book-1');

      const req = httpMock.expectOne('https://api.example.com/api/sync/pull/book-1');
      expect(req.request.method).toBe('GET');

      req.flush({
        book: {
          title: 'Test Book',
          author: 'Author Name',
          createdAt: 1782864000000,
          updatedAt: 1782864000000,
        },
        chapters: [
          {
            id: 'chap-1',
            title: 'Chapter 1',
            sortOrder: 1,
            contentMarkdown: 'Hello World',
            frontMatterJson: '{}',
            lastModified: 1782864000000,
          },
        ],
      });

      const project = await promise;
      expect(project.meta.title).toBe('Test Book');
      expect(dbMock.set).toHaveBeenCalledWith('workspace', 'book-1', expect.any(Object));
    });

    it('falls back to IndexedDB cache on network failure', async () => {
      dbMock.get.mockResolvedValue(mockBookProject);

      const promise = repository.readProject('book-1');

      const req = httpMock.expectOne('https://api.example.com/api/sync/pull/book-1');
      req.error(new ErrorEvent('Network error'));

      const project = await promise;
      expect(project).toEqual(mockBookProject);
      expect(dbMock.get).toHaveBeenCalledWith('workspace', 'book-1');
    });
  });

  describe('writeProject', () => {
    it('issues POST to push URL', async () => {
      dbMock.set.mockResolvedValue(undefined);

      const promise = repository.writeProject('book-1', mockBookProject);
      
      // Let the db.set promise resolve and progress to the HTTP call
      await Promise.resolve();
      await Promise.resolve();

      const req = httpMock.expectOne('https://api.example.com/api/sync/push');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.bookId).toBe('book-1');

      req.flush({ success: true, conflicts: [] });

      await promise;
      expect(dbMock.set).toHaveBeenCalledWith('workspace', 'book-1', mockBookProject);
    });

    it('queues for sync on network failure', async () => {
      dbMock.set.mockResolvedValue(undefined);

      const promise = repository.writeProject('book-1', mockBookProject);
      
      await Promise.resolve();
      await Promise.resolve();

      const req = httpMock.expectOne('https://api.example.com/api/sync/push');
      req.error(new ErrorEvent('Network error'));

      await promise;
      expect(syncQueueMock.enqueue).toHaveBeenCalledWith('book-1', mockBookProject);
    });
  });
});
