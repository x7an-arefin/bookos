import { IpcChannels } from '../../shared/ipc-channels.js';
import { registerAssetHandlers } from './asset.handler.js';

const mockPathExists = jest.fn();
const mockEnsureDir = jest.fn();
const mockStat = jest.fn();
jest.mock('fs-extra', () => {
  return {
    pathExists: (...args: any[]) => mockPathExists(...args),
    ensureDir: (...args: any[]) => mockEnsureDir(...args),
    stat: (...args: any[]) => mockStat(...args),
  };
});

const mockOptimizeImage = jest.fn();
jest.mock('@press/core', () => {
  return {
    optimizeImage: (...args: any[]) => mockOptimizeImage(...args),
  };
});

describe('Asset IPC Handlers', () => {
  let mockIpcMain: any;
  let mockDb: any;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new Map();
    mockIpcMain = {
      handle: jest.fn().mockImplementation((channel, fn) => {
        handlers.set(channel, fn);
      }),
    };
    mockDb = {
      upsertAsset: jest.fn(),
      getAssetsByBookId: jest.fn().mockReturnValue([{ id: 'asset-1' }]),
    };

    registerAssetHandlers(mockIpcMain, null, mockDb);
  });

  it('should register both asset handlers', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.ASSET_OPTIMIZE, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.ASSET_GET_LOCAL, expect.any(Function));
  });

  it('should call optimizeImage and save record in Database', async () => {
    mockPathExists.mockResolvedValue(true);
    mockStat.mockResolvedValue({ size: 2048 });
    mockOptimizeImage.mockResolvedValue({ thumbnail: '/path/thumb.webp', mobile: '/path/mobile.jpg', print: '/path/print.tif' });

    const optimizeHandler = handlers.get(IpcChannels.ASSET_OPTIMIZE)!;
    const variants = await optimizeHandler(null, '/project/assets/photo.png', 'book-123');

    expect(mockEnsureDir).toHaveBeenCalled();
    expect(mockOptimizeImage).toHaveBeenCalledWith('/project/assets/photo.png', expect.any(String));
    expect(mockDb.upsertAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'asset-photo-png',
        bookId: 'book-123',
        filename: 'photo.png',
        localPath: '/project/assets/photo.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        variants: { thumbnail: '/path/thumb.webp', mobile: '/path/mobile.jpg', print: '/path/print.tif' },
      })
    );
    expect(variants.thumbnail).toBe('/path/thumb.webp');
  });

  it('should throw an error if the asset file does not exist', async () => {
    mockPathExists.mockResolvedValue(false);
    const optimizeHandler = handlers.get(IpcChannels.ASSET_OPTIMIZE)!;
    await expect(optimizeHandler(null, '/project/assets/missing.png', 'book-123')).rejects.toThrow('Asset file not found');
  });

  it('should retrieve book assets from Database for ASSET_GET_LOCAL', async () => {
    const getLocalHandler = handlers.get(IpcChannels.ASSET_GET_LOCAL)!;
    const assets = await getLocalHandler(null, 'book-123');
    expect(mockDb.getAssetsByBookId).toHaveBeenCalledWith('book-123');
    expect(assets).toEqual([{ id: 'asset-1' }]);
  });
});
