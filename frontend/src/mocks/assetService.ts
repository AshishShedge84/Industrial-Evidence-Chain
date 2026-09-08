import type { Asset, CreateAssetRequest, UpdateAssetRequest, AssetSearchParams, AssetListResponse, AssetHistoryEntry } from '@type-defs/asset';
import type { ApiResponse } from '@type-defs/api';
import { db } from './db';
import { notificationService } from '@services/notification/notificationService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function filterAssets(assets: Asset[], params?: AssetSearchParams): Asset[] {
  if (!params) return assets;

  return assets.filter((asset) => {
    if (params.query) {
      const query = params.query.toLowerCase();
      if (
        !asset.assetTag.toLowerCase().includes(query) &&
        !asset.name.toLowerCase().includes(query) &&
        !(asset.description?.toLowerCase().includes(query) ?? false)
      ) {
        return false;
      }
    }
    if (params.category && asset.category !== params.category) return false;
    if (params.status && asset.status !== params.status) return false;
    if (params.assignedTo && asset.assignedTo !== params.assignedTo) return false;
    if (params.site && asset.location?.site !== params.site) return false;
    return true;
  });
}

export const mockAssetService = {
  async getAssets(params?: AssetSearchParams): Promise<ApiResponse<AssetListResponse>> {
    await delay(300);

    const userAssets = db.getAssets(); // Let admin see all, or we could filter
    const filtered = filterAssets(userAssets, params);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return {
      success: true,
      data: {
        items: paginated,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async getAsset(id: string): Promise<ApiResponse<Asset>> {
    await delay(200);

    const asset = db.getAssets().find((a) => a.id === id);
    if (!asset) {
      return {
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
          statusCode: 404,
        },
      };
    }

    return {
      success: true,
      data: asset,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async createAsset(data: CreateAssetRequest): Promise<ApiResponse<Asset>> {
    await delay(500);

    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      ...data,
      status: 'Active',
      qrCode: `QR-${data.assetTag}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '1',
    };

    db.saveAsset(newAsset);
    
    db.saveAuditLog({
      id: `audit-${Date.now()}`,
      evidenceId: 'N/A', // Asset creation might not tie directly to evidence initially
      action: 'AssetRegistered' as any,
      performedBy: '1',
      performedAt: new Date().toISOString(),
      details: { assetId: newAsset.id }
    });

    notificationService.broadcastToHierarchy({
      type: 'info',
      title: 'New Asset Registered',
      message: `Asset ${newAsset.assetTag} (${newAsset.name}) has been registered.`,
      relatedEntityId: newAsset.id,
      relatedEntity: 'asset',
      actionUrl: `/assets/${newAsset.id}`,
    }, 'Manager');

    return {
      success: true,
      data: newAsset,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async updateAsset(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>> {
    await delay(300);

    const assets = db.getAssets();
    const index = assets.findIndex((a) => a.id === id);
    if (index === -1) {
      return {
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
          statusCode: 404,
        },
      };
    }

    const updatedAsset = {
      ...assets[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    db.saveAsset(updatedAsset);
    
    db.saveAuditLog({
      id: `audit-${Date.now()}`,
      evidenceId: 'N/A',
      action: 'AssetUpdated' as any,
      performedBy: '1',
      performedAt: new Date().toISOString(),
      details: { assetId: id }
    });

    notificationService.broadcastToHierarchy({
      type: 'info',
      title: 'Asset Updated',
      message: `Asset ${updatedAsset.assetTag} has been updated.`,
      relatedEntityId: updatedAsset.id,
      relatedEntity: 'asset',
      actionUrl: `/assets/${updatedAsset.id}`,
    }, 'Manager');

    return {
      success: true,
      data: updatedAsset,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async deleteAsset(id: string): Promise<ApiResponse<void>> {
    await delay(300);

    const assets = db.getAssets();
    const index = assets.findIndex((a) => a.id === id);
    if (index === -1) {
      return {
        success: false,
        error: {
          code: 'ASSET_NOT_FOUND',
          message: 'Asset not found',
          statusCode: 404,
        },
      };
    }

    db.deleteAsset(id);
    
    db.saveAuditLog({
      id: `audit-${Date.now()}`,
      evidenceId: 'N/A',
      action: 'AssetDeleted' as any,
      performedBy: '1',
      performedAt: new Date().toISOString(),
      details: { assetId: id }
    });

    return {
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },

  async getAssetHistory(id: string): Promise<ApiResponse<AssetHistoryEntry[]>> {
    await delay(200);

    const history = (db as any).getDb().assetHistory.filter((h: any) => h.assetId === id);

    return {
      success: true,
      data: history,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req-${Date.now()}`,
        version: '1.0.0',
      },
    };
  },
};