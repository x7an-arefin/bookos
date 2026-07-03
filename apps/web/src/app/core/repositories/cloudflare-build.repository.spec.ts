import { TestBed } from '@angular/core/testing';
import { CloudflareBuildRepository } from './cloudflare-build.repository';
import { BookProject } from '@press/core';

describe('CloudflareBuildRepository', () => {
  let repository: CloudflareBuildRepository;

  const mockBookProject: BookProject = {
    id: 'book-1',
    meta: { title: 'Test Book', author: 'Author' },
    config: {
      activeTheme: 'classic-serif',
    },
    chapters: [],
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CloudflareBuildRepository],
    });
    repository = TestBed.inject(CloudflareBuildRepository);
  });

  it('buildPdf returns a failed result stating desktop app is required', async () => {
    const result = await repository.buildPdf(mockBookProject, 'pdf', 'out');
    expect(result.success).toBe(false);
    expect(result.error).toContain('requires the BookOS desktop app');
  });

  it('buildEpub returns a failed result stating desktop app is required', async () => {
    const result = await repository.buildEpub(mockBookProject, 'epub', 'out');
    expect(result.success).toBe(false);
    expect(result.error).toContain('requires the BookOS desktop app');
  });

  it('buildProgress$ is EMPTY and emits no values', (done) => {
    repository.buildProgress$.subscribe({
      next: () => fail('Should not emit any values'),
      complete: () => {
        expect(true).toBe(true);
        done();
      },
    });
  });
});
