import { IpcChannels } from '../../shared/ipc-channels.js';
import { registerBuildHandlers } from './build.handler.js';

const mockBuildBook = jest.fn();
jest.mock('@press/core', () => {
  return {
    buildBook: (opts: any) => mockBuildBook(opts),
  };
});

describe('Build IPC Handlers', () => {
  let mockIpcMain: any;
  let mockMainWindow: any;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new Map();
    mockIpcMain = {
      handle: jest.fn().mockImplementation((channel, fn) => {
        handlers.set(channel, fn);
      }),
    };
    mockMainWindow = {
      isDestroyed: jest.fn().mockReturnValue(false),
      webContents: {
        send: jest.fn(),
      },
    };

    registerBuildHandlers(mockIpcMain, mockMainWindow);
  });

  it('should register BUILD_PDF and BUILD_EPUB handlers', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.BUILD_PDF, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.BUILD_EPUB, expect.any(Function));
  });

  it('should prevent concurrent builds for the same book ID', async () => {
    let resolveFirstBuild: any;
    const firstBuildPromise = new Promise((resolve) => {
      resolveFirstBuild = resolve;
    });

    mockBuildBook.mockImplementation(() => firstBuildPromise);

    const pdfHandler = handlers.get(IpcChannels.BUILD_PDF)!;
    const projectMock = { id: 'book-123' } as any;

    const build1 = pdfHandler(null, projectMock, 'pdf-trade', '/out');
    const build2 = pdfHandler(null, projectMock, 'pdf-trade', '/out');

    const result2 = await build2;
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('already in progress');

    resolveFirstBuild({ success: true });
    const result1 = await build1;
    expect(result1.success).toBe(true);
  });

  it('should emit progress events to webContents during compilation', async () => {
    mockBuildBook.mockImplementation((opts: any) => {
      opts.onProgress(45, 'Rendering chapters...');
      return { success: true };
    });

    const pdfHandler = handlers.get(IpcChannels.BUILD_PDF)!;
    const projectMock = { id: 'book-123' } as any;

    await pdfHandler(null, projectMock, 'pdf-trade', '/out');

    expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(IpcChannels.BUILD_PROGRESS, 45, 'Rendering chapters...');
  });

  it('should catch builder crashes and return success: false with error details', async () => {
    mockBuildBook.mockRejectedValue(new Error('Headless Puppeteer crashed'));

    const pdfHandler = handlers.get(IpcChannels.BUILD_PDF)!;
    const projectMock = { id: 'book-123' } as any;

    const result = await pdfHandler(null, projectMock, 'pdf-trade', '/out');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Headless Puppeteer crashed');
  });
});
