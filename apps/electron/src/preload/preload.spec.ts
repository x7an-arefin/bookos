import { IpcChannels } from '../shared/ipc-channels.js';

let exposedKey: string | null = null;
let exposedApi: any = null;

jest.mock('electron', () => {
  return {
    contextBridge: {
      exposeInMainWorld: jest.fn().mockImplementation((key, value) => {
        exposedKey = key;
        exposedApi = value;
      }),
    },
    ipcRenderer: {
      invoke: jest.fn().mockResolvedValue({ success: true }),
      on: jest.fn(),
      removeListener: jest.fn(),
    },
  };
});

describe('Preload Script Security & Interface', () => {
  beforeAll(async () => {
    await import('./preload.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose API to main world with "electronAPI" key', () => {
    expect(exposedKey).toBe('electronAPI');
    expect(exposedApi).toBeDefined();
  });

  it('should expose all required API surface methods', () => {
    expect(typeof exposedApi.buildPdf).toBe('function');
    expect(typeof exposedApi.buildEpub).toBe('function');
    expect(typeof exposedApi.onBuildProgress).toBe('function');
    expect(typeof exposedApi.openFolderDialog).toBe('function');
    expect(typeof exposedApi.saveFolderDialog).toBe('function');
    expect(typeof exposedApi.readWorkspace).toBe('function');
    expect(typeof exposedApi.writeWorkspace).toBe('function');
    expect(typeof exposedApi.importZip).toBe('function');
    expect(typeof exposedApi.exportOutput).toBe('function');
    expect(typeof exposedApi.optimizeAsset).toBe('function');
    expect(typeof exposedApi.getLocalAssets).toBe('function');
    expect(typeof exposedApi.getAppVersion).toBe('function');
    expect(typeof exposedApi.checkForUpdate).toBe('function');
  });

  it('should delegate invoke calls to correct channels', async () => {
    const { ipcRenderer } = require('electron');
    await exposedApi.buildPdf({ id: '1' } as any, 'pdf-trade', '/out');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith(IpcChannels.BUILD_PDF, { id: '1' }, 'pdf-trade', '/out');
  });

  it('should register and clean up listeners in onBuildProgress', () => {
    const { ipcRenderer } = require('electron');
    const callback = jest.fn();
    const cleanup = exposedApi.onBuildProgress(callback);

    expect(ipcRenderer.on).toHaveBeenCalledWith(IpcChannels.BUILD_PROGRESS, expect.any(Function));

    cleanup();
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith(IpcChannels.BUILD_PROGRESS, expect.any(Function));
  });
});
