export const IpcChannels = {
  // Build channels
  BUILD_PDF: 'build:pdf',
  BUILD_EPUB: 'build:epub',
  BUILD_PROGRESS: 'build:progress',

  // File system channels
  FILE_OPEN_FOLDER: 'file:open-folder',
  FILE_SAVE_DIALOG: 'file:save-dialog',
  FILE_READ_WORKSPACE: 'file:read-workspace',
  FILE_WRITE_WORKSPACE: 'file:write-workspace',
  FILE_IMPORT_ZIP: 'file:import-zip',
  FILE_EXPORT_OUTPUT: 'file:export-output',

  // Asset channels
  ASSET_OPTIMIZE: 'asset:optimize',
  ASSET_GET_LOCAL: 'asset:get-local',

  // Sync channels
  SYNC_PUSH: 'sync:push',
  SYNC_PULL: 'sync:pull',
  SYNC_STATUS: 'sync:status',

  // App channels
  APP_VERSION: 'app:version',
  APP_CHECK_UPDATE: 'app:check-update',
} as const;

export type IpcChannelKey = keyof typeof IpcChannels;
export type IpcChannelValue = (typeof IpcChannels)[IpcChannelKey];
