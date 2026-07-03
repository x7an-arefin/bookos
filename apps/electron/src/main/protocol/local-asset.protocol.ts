import { protocol } from 'electron';
import { DatabaseService } from '../services/database.service.js';

export function registerLocalAssetProtocol(db: DatabaseService): void {
  protocol.registerFileProtocol('local', (request, callback) => {
    // URL format: local://<assetId> or local://<assetId>/something
    try {
      const url = new URL(request.url);
      const assetId = url.hostname; // in local://assetId, hostname is the assetId
      const asset = db.getAssetById(assetId);
      if (!asset || !asset.localPath) {
        callback({ error: -6 }); // NET_ERROR: FILE_NOT_FOUND
        return;
      }
      callback({ path: asset.localPath });
    } catch (err) {
      callback({ error: -2 }); // NET_ERROR: FAILED
    }
  });
}
