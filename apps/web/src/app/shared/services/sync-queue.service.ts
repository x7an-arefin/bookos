import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IndexedDbService } from './indexed-db.service';
import { ENVIRONMENT } from '../../core/tokens/environment.token';
import { fromEvent } from 'rxjs';
import type { BookProject } from '@press/core';

@Injectable({
  providedIn: 'root',
})
export class SyncQueueService {
  private readonly http = inject(HttpClient);
  private readonly db = inject(IndexedDbService);
  private readonly env = inject(ENVIRONMENT);

  constructor() {
    fromEvent(window, 'online').subscribe(() => {
      this.drain();
    });
  }

  async enqueue(bookId: string, project: BookProject): Promise<void> {
    const timestamp = Date.now();
    const key = `${bookId}_${timestamp}`;
    await this.db.set('sync_queue', key, { bookId, project, timestamp });
  }

  async drain(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    const allQueueItems = await this.db.getAll<{ bookId: string; project: BookProject; timestamp: number }>('sync_queue');
    if (allQueueItems.length === 0) {
      return;
    }

    // Sort by timestamp asc
    allQueueItems.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of allQueueItems) {
      const key = `${item.bookId}_${item.timestamp}`;
      try {
        const payload = this.mapProjectToSyncPayload(item.project);
        const url = `${this.env.apiBaseUrl}/api/sync/push`;
        
        await this.http.post(url, payload).toPromise();
        // Delete from queue on success
        await this.db.delete('sync_queue', key);
      } catch (error) {
        // Stop draining on first failure
        console.error('Failed to drain sync queue item:', error);
        break;
      }
    }
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
