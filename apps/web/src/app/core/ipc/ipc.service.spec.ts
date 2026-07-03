import { TestBed } from '@angular/core/testing';
import { IpcService } from './ipc.service';

function makeApi(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    openFolderDialog: jest.fn().mockResolvedValue(null),
    readWorkspace:    jest.fn().mockResolvedValue({}),
    writeWorkspace:   jest.fn().mockResolvedValue(undefined),
    deleteWorkspace:  jest.fn().mockResolvedValue(undefined),
    getRecentProjects: jest.fn().mockResolvedValue([]),
    buildPdf:         jest.fn().mockResolvedValue({ success: true }),
    buildEpub:        jest.fn().mockResolvedValue({ success: true }),
    revealOutput:     jest.fn().mockResolvedValue(undefined),
    onBuildProgress:  jest.fn().mockReturnValue(() => {}),
    optimizeAsset:    jest.fn().mockResolvedValue({}),
    getLocalAssets:   jest.fn().mockResolvedValue([]),
    deleteAsset:      jest.fn().mockResolvedValue(undefined),
    pickImageFile:    jest.fn().mockResolvedValue(null),
    getAppVersion:    jest.fn().mockResolvedValue('1.0.0'),
    ...overrides,
  };
}

describe('IpcService', () => {
  let service: IpcService;

  const setup = (api?: object) => {
    (window as any)['electronAPI'] = api;
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpcService);
  };

  afterEach(() => {
    delete (window as any)['electronAPI'];
    TestBed.resetTestingModule();
  });

  describe('isElectron signal', () => {
    it('is true when electronAPI is present', () => {
      setup(makeApi());
      expect(service.isElectron()).toBe(true);
    });

    it('is false when electronAPI is absent', () => {
      setup(undefined);
      expect(service.isElectron()).toBe(false);
    });
  });

  describe('assertElectron guard', () => {
    it('throws when calling openFolderDialog outside Electron', () => {
      setup(undefined);
      expect(() => service.openFolderDialog()).toThrow(/electronAPI is not available/);
    });

    it('throws when calling buildPdf outside Electron', () => {
      setup(undefined);
      expect(() => service.buildPdf({} as any, 'print-standard', '/tmp')).toThrow(/electronAPI is not available/);
    });
  });

  describe('workspace methods', () => {
    it('delegates openFolderDialog to the api', async () => {
      const api = makeApi({ openFolderDialog: jest.fn().mockResolvedValue('/my/book') });
      setup(api);
      const result = await service.openFolderDialog();
      expect(result).toBe('/my/book');
      expect(api.openFolderDialog).toHaveBeenCalledTimes(1);
    });

    it('delegates readWorkspace to the api with the correct path', async () => {
      const project = { id: 'abc', meta: { title: 'Test Book' } };
      const api = makeApi({ readWorkspace: jest.fn().mockResolvedValue(project) });
      setup(api);
      const result = await service.readWorkspace('/path/to/book');
      expect(result).toEqual(project);
      expect(api.readWorkspace).toHaveBeenCalledWith('/path/to/book');
    });

    it('delegates writeWorkspace to the api', async () => {
      const api = makeApi();
      setup(api);
      await service.writeWorkspace('/path/to/book', { id: '1' } as any);
      expect(api.writeWorkspace).toHaveBeenCalledWith('/path/to/book', { id: '1' });
    });

    it('delegates getRecentProjects to the api', async () => {
      const paths = ['/book/a', '/book/b'];
      const api = makeApi({ getRecentProjects: jest.fn().mockResolvedValue(paths) });
      setup(api);
      const result = await service.getRecentProjects();
      expect(result).toEqual(paths);
    });
  });

  describe('build methods', () => {
    it('delegates buildPdf with correct arguments', async () => {
      const api = makeApi({ buildPdf: jest.fn().mockResolvedValue({ success: true, outputPath: '/out.pdf' }) });
      setup(api);
      const result = await service.buildPdf({ id: '1' } as any, 'print-standard', '/output');
      expect(result).toEqual({ success: true, outputPath: '/out.pdf' });
      expect(api.buildPdf).toHaveBeenCalledWith({ id: '1' }, 'print-standard', '/output');
    });

    it('onBuildProgress emits events and cleans up on unsubscribe', () => {
      const cleanup = jest.fn();
      const onBuildProgress = jest.fn((cb: Function) => {
        cb(50, 'Compiling', 'compiling');
        return cleanup;
      });
      setup(makeApi({ onBuildProgress }));

      const emissions: any[] = [];
      const sub = service.onBuildProgress().subscribe((e) => emissions.push(e));
      sub.unsubscribe();

      expect(emissions).toHaveLength(1);
      expect(emissions[0]).toEqual({ percent: 50, message: 'Compiling', stage: 'compiling' });
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('onBuildProgress completes immediately when no electronAPI', () => {
      setup(undefined);
      const complete = jest.fn();
      service.onBuildProgress().subscribe({ complete });
      expect(complete).toHaveBeenCalledTimes(1);
    });
  });
});
