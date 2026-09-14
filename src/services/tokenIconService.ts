import { Asset } from '../domain/types';
import { AssetRepository } from '../database/repositories/assetRepository';
import { extractBaseSymbol } from './symbolMapper';

/**
 * 远程代币图标自动获取与缓存管理服务
 */
export class TokenIconService {
  private static instance: TokenIconService;
  private memoryCache: Map<string, string | null> = new Map();
  private pendingRequests: Map<string, Promise<string | null>> = new Map();

  private constructor() {}

  public static getInstance(): TokenIconService {
    if (!TokenIconService.instance) {
      TokenIconService.instance = new TokenIconService();
    }
    return TokenIconService.instance;
  }

  /**
   * 解析代币 Logo URL
   * 
   * 1. 优先探测 CoinCap 官方高清 CDN (https://assets.coincap.io/assets/icons/{symbol}@2x.png)
   * 2. 探测失败则回退至 CoinGecko 开放 Search API
   */
  public async resolveIconUrl(symbol: string): Promise<string | null> {
    const baseSymbol = extractBaseSymbol(symbol).trim().toLowerCase();
    if (!baseSymbol) return null;

    if (this.memoryCache.has(baseSymbol)) {
      return this.memoryCache.get(baseSymbol) || null;
    }

    if (this.pendingRequests.has(baseSymbol)) {
      return this.pendingRequests.get(baseSymbol)!;
    }

    const task = this.fetchIconUrl(baseSymbol);
    this.pendingRequests.set(baseSymbol, task);

    try {
      const result = await task;
      this.memoryCache.set(baseSymbol, result);
      return result;
    } finally {
      this.pendingRequests.delete(baseSymbol);
    }
  }

  private async fetchIconUrl(cleanSymbol: string): Promise<string | null> {
    // 1. 优先尝试 CoinCap CDN (极高命中率，免 API Key，实测 ACT/TRUMP/SUSHI 均收录)
    const coincapUrl = `https://assets.coincap.io/assets/icons/${cleanSymbol}@2x.png`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      try {
        const resp = await fetch(coincapUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });

        if (resp.ok && resp.status === 200) {
          return coincapUrl;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // 网络超时或失败，尝试降级至 CoinGecko
    }

    // 2. 降级尝试 CoinGecko Search API 获取代币官方图片
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(cleanSymbol)}`;
        const resp = await fetch(searchUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data && Array.isArray(data.coins) && data.coins.length > 0) {
            const upper = cleanSymbol.toUpperCase();
            const match =
              data.coins.find((c: any) => c.symbol?.toUpperCase() === upper) ||
              data.coins[0];
            if (match && (match.large || match.thumb)) {
              return match.large || match.thumb;
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // 容错降级
    }

    return null;
  }

  /**
   * 异步静默扫描并补全未设置 iconUrl 的资产，保存至 SQLite 本地数据库
   */
  public async syncMissingAssetIcons(
    assets: Asset[],
    assetRepo: AssetRepository,
    onUpdated?: (updated: Asset) => void
  ): Promise<void> {
    const missing = assets.filter((a) => !a.iconUrl);
    if (missing.length === 0) return;

    for (const asset of missing) {
      try {
        const iconUrl = await this.resolveIconUrl(asset.symbol);
        if (iconUrl) {
          const updated: Asset = {
            ...asset,
            iconUrl,
          };
          await assetRepo.update(updated);
          if (onUpdated) {
            onUpdated(updated);
          }
        }
      } catch (err) {
        console.warn(`[TokenIconService] Failed to sync icon for ${asset.symbol}:`, err);
      }
    }
  }
}

export const defaultTokenIconService = TokenIconService.getInstance();
