import { IpcChannels } from '../../shared/ipc-channels.js';
import { registerFileHandlers } from './file.handler.js';

const mockShowOpenDialog = jest.fn();
const mockShowSaveDialog = jest.fn();
jest.mock('electron', () => {
  return {
    dialog: {
      showOpenDialog: (...args: any[]) => mockShowOpenDialog(...args),
      showSaveDialog: (...args: any[]) => mockShowSaveDialog(...args),
    },
  };
});

const mockFsCopy = jest.fn();
jest.mock('fs-extra', () => {
  return {
    copy: (...args: any[]) => mockFsCopy(...args),
    ensureDir: jest.fn(),
  };
});

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => {
    return {
      extractAllTo: jest.fn(),
    };
  });
});

describe('File System IPC Handlers', () => {
  let mockIpcMain: any;
  let mockMainWindow: any;
  let mockDb: any;
  let mockWorkspace: any;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new Map();
    mockIpcMain = {
      handle: jest.fn().mockImplementation((channel, fn) => {
        handlers.set(channel, fn);
      }),
    };
    mockMainWindow = {};
    mockDb = {
      upsertProject: jest.fn(),
    };
    mockWorkspace = {
      readWorkspace: jest.fn().mockResolvedValue({ id: 'proj-1', meta: { title: 'Book' } }),
      writeWorkspace: jest.fn().mockResolvedValue(undefined),
    };

    registerFileHandlers(mockIpcMain, mockMainWindow, mockDb, mockWorkspace);
  });

  it('should register all 6 file handlers', () => {
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.FILE_OPEN_FOLDER, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.FILE_SAVE_DIALOG, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.FILE_READ_WORKSPACE, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.FILE_WRITE_WORKSPACE, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.FILE_IMPORT_ZIP, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IpcChannels.FILE_EXPORT_OUTPUT, expect.any(Function));
  });

  it('should open folder picker and return path', async () => {
    mockShowOpenDialog.mockResolvedValue({ filePaths: ['/user/selected/folder'] });
    const handler = handlers.get(IpcChannels.FILE_OPEN_FOLDER)!;
    const path = await handler();
    expect(path).toBe('/user/selected/folder');
  });

  it('should return null from folder picker when cancelled', async () => {
    mockShowOpenDialog.mockResolvedValue({ filePaths: [] });
    const handler = handlers.get(IpcChannels.FILE_OPEN_FOLDER)!;
    const path = await handler();
    expect(path).toBeNull();
  });

  it('should read workspace, call workspace service, and upsert in DB', async () => {
    const handler = handlers.get(IpcChannels.FILE_READ_WORKSPACE)!;
    const project = await handler(null, '/workspace');

    expect(mockWorkspace.readWorkspace).toHaveBeenCalledWith('/workspace');
    expect(mockDb.upsertProject).toHaveBeenCalledWith(project, '/workspace');
    expect(project.id).toBe('proj-1');
  });

  it('should copy file on FILE_EXPORT_OUTPUT if path chosen', async () => {
    mockShowSaveDialog.mockResolvedValue({ filePath: '/dest/book.pdf' });
    const handler = handlers.get(IpcChannels.FILE_EXPORT_OUTPUT)!;
    const result = await handler(null, '/src/temp.pdf', 'book.pdf');

    expect(mockFsCopy).toHaveBeenCalledWith('/src/temp.pdf', '/dest/book.pdf');
    expect(result).toBe('/dest/book.pdf');
  });
});
