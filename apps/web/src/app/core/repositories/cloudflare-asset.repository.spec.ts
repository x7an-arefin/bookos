import { TestBed } from '@angular/core/testing';
import { CloudflareAssetRepository } from './cloudflare-asset.repository';
import { IndexedDbService } from '../../shared/services/indexed-db.service';
import { AssetRecord } from './asset.repository';

describe('CloudflareAssetRepository', () => {
  let repository: CloudflareAssetRepository;
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CloudflareAssetRepository,
        { provide: IndexedDbService, useValue: dbMock },
      ],
    });

    repository = TestBed.inject(CloudflareAssetRepository);
  });

  describe('getLocalAssets', () => {
    it('reads assets list from IndexedDB cache', async () => {
      const mockAssets: AssetRecord[] = [
        {
          id: 'asset-1',
          originalName: 'test.jpg',
          relativePath: 'assets/test.jpg',
          fileSizeBytes: 100,
          mimeType: 'image/jpeg',
          variants: { print: 'test.jpg', web: 'test.jpg', thumb: 'test.jpg' },
        },
      ];
      dbMock.get.mockResolvedValue(mockAssets);

      const assets = await repository.getLocalAssets('book-1');
      expect(assets).toEqual(mockAssets);
      expect(dbMock.get).toHaveBeenCalledWith('workspace', 'book-1_assets');
    });

    it('returns empty array if no assets in cache', async () => {
      dbMock.get.mockResolvedValue(null);

      const assets = await repository.getLocalAssets('book-1');
      expect(assets).toEqual([]);
      expect(dbMock.get).toHaveBeenCalledWith('workspace', 'book-1_assets');
    });
  });

  describe('deleteAsset', () => {
    it('filters out target asset and updates IndexedDB cache', async () => {
      const mockAssets: AssetRecord[] = [
        {
          id: 'asset-1',
          originalName: 'test1.jpg',
          relativePath: 'assets/test1.jpg',
          fileSizeBytes: 100,
          mimeType: 'image/jpeg',
          variants: { print: 'test1.jpg', web: 'test1.jpg', thumb: 'test1.jpg' },
        },
        {
          id: 'asset-2',
          originalName: 'test2.jpg',
          relativePath: 'assets/test2.jpg',
          fileSizeBytes: 200,
          mimeType: 'image/jpeg',
          variants: { print: 'test2.jpg', web: 'test2.jpg', thumb: 'test2.jpg' },
        },
      ];
      dbMock.get.mockResolvedValue(mockAssets);

      await repository.deleteAsset('book-1', 'asset-1');

      expect(dbMock.set).toHaveBeenCalledWith('workspace', 'book-1_assets', [mockAssets[1]]);
    });
  });
});
