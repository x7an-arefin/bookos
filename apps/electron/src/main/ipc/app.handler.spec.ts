import { IpcChannels } from '../../shared/ipc-channels.js';
import { registerAppHandlers } from './app.handler.js';

jest.mock('electron', () => {
  return {
    app: {
      getVersion: () => '1.2.3',
      isPackaged: false,
    },
  };
});

describe('App IPC Handlers', () => {
  let mockIpcMain: any;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new Map();
    mockIpcMain = {
      handle: jest.fn().mockImplementation((channel, fn) => {
        handlers.set(channel, fn);
      }),
    };

    registerAppHandlers(mockIpcMain, null);
  });

  it('should register APP_VERSION and APP_CHECK_UPDATE handlers', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.APP_VERSION, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.APP_CHECK_UPDATE, expect.any(Function));
  });

  it('should return version string on APP_VERSION', async () => {
    const handler = handlers.get(IpcChannels.APP_VERSION)!;
    const version = await handler();
    expect(version).toBe('1.2.3');
  });

  it('should return available: false and version details in dev mode', async () => {
    const handler = handlers.get(IpcChannels.APP_CHECK_UPDATE)!;
    const result = await handler();
    expect(result).toEqual({ available: false, version: '1.2.3' });
  });
});
