import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { WorkspaceRepository } from './workspace.repository';
import type { BookProject, Chapter } from '@press/core';
import { ENVIRONMENT } from '../tokens/environment.token';
import { IndexedDbService } from '../../shared/services/indexed-db.service';
import { SyncQueueService } from '../../shared/services/sync-queue.service';

export class SyncConflictError extends Error {
  constructor(public conflicts: any[]) {
    super('Sync conflict detected');
    this.name = 'SyncConflictError';
  }
}

@Injectable()
export class CloudflareWorkspaceRepository implements WorkspaceRepository {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);
  private readonly db = inject(IndexedDbService);
  private readonly syncQueue = inject(SyncQueueService);

  openFolder(): Promise<string | null> {
    return Promise.resolve(null);
  }

  async readProject(bookId: string): Promise<BookProject> {
    const url = `${this.env.apiBaseUrl}/api/sync/pull/${bookId}`;
    try {
      const response = await this.http.get<{ book: any; chapters: any[] }>(url).toPromise();
      if (!response) {
        throw new Error('No response from sync pull');
      }
      
      const project = this.mapSyncPayloadToProject(response.book, response.chapters);
      
      // Save to IndexedDB cache
      await this.db.set('workspace', bookId, project);
      return project;
    } catch (error) {
      console.warn('Network failure on readProject, falling back to IndexedDB cache:', error);
      const cached = await this.db.get<BookProject>('workspace', bookId);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  async writeProject(bookId: string, project: BookProject): Promise<void> {
    // Write to IndexedDB local cache first
    await this.db.set('workspace', bookId, project);

    const url = `${this.env.apiBaseUrl}/api/sync/push`;
    const payload = this.mapProjectToSyncPayload(project);

    try {
      const response = await this.http.post<{ success: boolean; conflicts: any[] }>(url, payload).toPromise();
      if (response && response.conflicts && response.conflicts.length > 0) {
        throw new SyncConflictError(response.conflicts);
      }
    } catch (error) {
      if (error instanceof SyncConflictError) {
        throw error;
      }
      console.warn('Network failure on writeProject, queuing for offline sync:', error);
      await this.syncQueue.enqueue(bookId, project);
    }
  }

  async deleteProject(bookId: string): Promise<void> {
    const url = `${this.env.apiBaseUrl}/api/books/${bookId}`;
    try {
      await this.http.delete(url).toPromise();
    } catch (error) {
      console.error('Failed to delete book on server:', error);
    }
    await this.db.delete('workspace', bookId);
  }

  async renameProject(bookId: string, newTitle: string): Promise<void> {
    const url = `${this.env.apiBaseUrl}/api/books/${bookId}`;
    try {
      await this.http.patch(url, { title: newTitle }).toPromise();
    } catch (error) {
      console.error('Failed to rename book on server:', error);
    }
    
    // Also update cache
    const cached = await this.db.get<BookProject>('workspace', bookId);
    if (cached) {
      cached.meta.title = newTitle;
      cached.updatedAt = new Date().toISOString();
      await this.db.set('workspace', bookId, cached);
    }
  }

  async getRecentProjects(): Promise<string[]> {
    if (navigator.onLine) {
      try {
        const url = `${this.env.apiBaseUrl}/api/books`;
        const list = await this.http.get<any[]>(url).toPromise();
        return (list || []).map((b) => b.id);
      } catch (error) {
        console.warn('Failed to fetch books list, reading from IndexedDB:', error);
      }
    }
    return this.db.getAllKeys('workspace');
  }

  private mapSyncPayloadToProject(book: any, chaptersList: any[]): BookProject {
    const mapChapter = (ch: any): Chapter => ({
      id: ch.id,
      title: ch.title,
      sortOrder: ch.sortOrder,
      contentMarkdown: ch.contentMarkdown,
      frontMatter: ch.frontMatterJson ? JSON.parse(ch.frontMatterJson) : undefined,
      lastModified: new Date(ch.lastModified).toISOString(),
      wordCount: ch.wordCount,
    });

    const parsedConfig = typeof book.configJson === 'string' ? JSON.parse(book.configJson) : book.configJson || {};

    const frontMatterSections: Chapter[] = [];
    const chapters: Chapter[] = [];
    const backMatterSections: Chapter[] = [];

    for (const ch of chaptersList) {
      const mapped = mapChapter(ch);
      const type = mapped.frontMatter?.type || 'normal';
      if (type === 'frontmatter') {
        frontMatterSections.push(mapped);
      } else if (type === 'backmatter') {
        backMatterSections.push(mapped);
      } else {
        chapters.push(mapped);
      }
    }

    return {
      id: book.id,
      meta: {
        title: book.title,
        author: book.author,
        subtitle: book.subtitle || undefined,
        isbn: book.isbn || undefined,
        language: book.language,
        publisher: book.publisher || undefined,
      },
      config: parsedConfig,
      frontMatterSections: frontMatterSections.sort((a, b) => a.sortOrder - b.sortOrder),
      chapters: chapters.sort((a, b) => a.sortOrder - b.sortOrder),
      backMatterSections: backMatterSections.sort((a, b) => a.sortOrder - b.sortOrder),
      assets: [],
      exportHistory: [],
      createdAt: new Date(book.createdAt).toISOString(),
      updatedAt: new Date(book.updatedAt).toISOString(),
    };
  }

  private mapProjectToSyncPayload(project: BookProject) {
    const mapChapter = (ch: any) => ({
      id: ch.id,
      title: ch.title,
      sortOrder: ch.sortOrder,
      contentMarkdown: ch.contentMarkdown || '',
      frontMatterJson: ch.frontMatter ? JSON.stringify(ch.frontMatter) : undefined,
      lastModified: ch.lastModified ? new Date(ch.lastModified).getTime() : Date.now(),
    });

    const allChapters = [
      ...(project.frontMatterSections || []),
      ...(project.chapters || []),
      ...(project.backMatterSections || []),
    ];

    return {
      bookId: project.id,
      clientTimestamp: Date.now(),
      book: {
        title: project.meta.title,
        author: project.meta.author,
        subtitle: project.meta.subtitle,
        isbn: project.meta.isbn,
        language: project.meta.language || 'en',
        publisher: project.meta.publisher,
        configJson: JSON.stringify(project.config),
        themeSlug: project.config.activeTheme || 'classic-serif',
      },
      chapters: allChapters.map(mapChapter),
    };
  }
}
