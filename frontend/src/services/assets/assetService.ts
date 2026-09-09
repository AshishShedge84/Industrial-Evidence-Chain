import { apiClient, isMockMode } from '@services/api/apiClient';
import type { Asset, CreateAssetRequest, UpdateAssetRequest, AssetSearchParams, AssetListResponse, AssetHistoryEntry } from '@type-defs/asset';
import type { ApiResponse } from '@type-defs/api';

export interface AssetService {
  getAssets(params?: AssetSearchParams): Promise<ApiResponse<AssetListResponse>>;
  getAsset(id: string): Promise<ApiResponse<Asset>>;
  createAsset(data: CreateAssetRequest): Promise<ApiResponse<Asset>>;
  updateAsset(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>>;
  deleteAsset(id: string): Promise<ApiResponse<void>>;
  getAssetHistory(id: string): Promise<ApiResponse<AssetHistoryEntry[]>>;
}

class AssetServiceImpl implements AssetService {
  async getAssets(params?: AssetSearchParams): Promise<ApiResponse<AssetListResponse>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiClient.get<AssetListResponse>(`/assets?${searchParams.toString()}`);
  }

  async getAsset(id: string): Promise<ApiResponse<Asset>> {
    return apiClient.get<Asset>(`/assets/${id}`);
  }

  async createAsset(data: CreateAssetRequest): Promise<ApiResponse<Asset>> {
    return apiClient.post<Asset>('/assets', data);
  }

  async updateAsset(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>> {
    return apiClient.put<Asset>(`/assets/${id}`, data);
  }

  async deleteAsset(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/assets/${id}`);
  }

  async getAssetHistory(id: string): Promise<ApiResponse<AssetHistoryEntry[]>> {
    return apiClient.get<AssetHistoryEntry[]>(`/assets/${id}/history`);
  }
}

export const assetService = new AssetServiceImpl();