import { logger } from '../utils/Logger';

export class AssetLoader {
  private _loadedAssets: Map<string, unknown>;
  private _progress: number;

  constructor() {
    this._loadedAssets = new Map();
    this._progress = 0;
  }

  public get progress(): number {
    return this._progress;
  }

  public async loadAll(
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    logger.info('AssetLoader: starting asset load');
    this._progress = 0;
    onProgress?.(this._progress);

    // Wait for fonts to be ready
    await document.fonts.ready;
    this._progress = 0.5;
    onProgress?.(this._progress);

    logger.debug('AssetLoader: fonts ready');

    this._progress = 1;
    onProgress?.(this._progress);
    logger.info('AssetLoader: all assets loaded');
  }

  public getAsset(key: string): unknown | undefined {
    return this._loadedAssets.get(key);
  }

  public dispose(): void {
    this._loadedAssets.clear();
    this._progress = 0;
    logger.info('AssetLoader disposed');
  }
}
