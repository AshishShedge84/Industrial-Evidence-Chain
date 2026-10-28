import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SEEDED_ASSETS } from '@/data/authoritativeSeed';
import type { 
  Asset, 
  CreateAssetRequest, 
  UpdateAssetRequest, 
  AssetSearchParams, 
  AssetListResponse, 
  AssetHistoryEntry,
  AssetCategory,
  AssetStatus
} from '@type-defs/asset';
import type { ApiResponse } from '@type-defs/api';

export interface AssetService {
  getAssets(params?: AssetSearchParams): Promise<ApiResponse<AssetListResponse>>;
  getAsset(id: string): Promise<ApiResponse<Asset>>;
  createAsset(data: CreateAssetRequest): Promise<ApiResponse<Asset>>;
  updateAsset(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>>;
  deleteAsset(id: string): Promise<ApiResponse<void>>;
  getAssetHistory(id: string): Promise<ApiResponse<AssetHistoryEntry[]>>;
}

function normalizeAsset(docId: string, data: any): Asset {
  let location = data.location;
  if (typeof location === 'string') {
    try {
      location = JSON.parse(location);
    } catch {
      location = { site: location };
    }
  }

  let specifications = data.specifications;
  if (typeof specifications === 'string') {
    try {
      specifications = JSON.parse(specifications);
    } catch {
      specifications = {};
    }
  }

  const assetTag = data.assetTag || data.asset_code || data.assetCode || docId;

  return {
    id: docId,
    assetTag,
    name: data.name || 'Unnamed Asset',
    description: data.description || '',
    category: (data.category as AssetCategory) || 'Machinery',
    status: (data.status as AssetStatus) || 'Active',
    location: location || { site: 'Facility' },
    specifications: specifications || {},
    qrCode: data.qrCode || assetTag,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt)) : new Date().toISOString(),
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt)) : new Date().toISOString(),
    createdBy: data.createdBy || data.created_by_user_id || 'System',
    assignedTo: data.assignedTo || data.assigned_to_user_id || undefined,
  };
}

class FirebaseAssetServiceImpl implements AssetService {
  async getAssets(params?: AssetSearchParams): Promise<ApiResponse<AssetListResponse>> {
    try {
      let allAssets: Asset[] = [];
      try {
        const assetsRef = collection(db, 'assets');
        const snapshot = await getDocs(assetsRef);
        snapshot.forEach((d) => {
          allAssets.push(normalizeAsset(d.id, d.data()));
        });
      } catch {
        // Fallback to seeded authoritative assets
      }

      if (allAssets.length === 0) {
        allAssets = [...SEEDED_ASSETS];
      }

      // Filter in-memory for flexible multi-field search and robust sorting
      if (params) {
        const searchQuery = params.query || (params as any).search;
        if (searchQuery) {
          const s = searchQuery.toLowerCase();
          allAssets = allAssets.filter(
            (a) =>
              a.name.toLowerCase().includes(s) ||
              a.assetTag.toLowerCase().includes(s) ||
              a.category.toLowerCase().includes(s) ||
              (a.description && a.description.toLowerCase().includes(s))
          );
        }
        if (params.category) {
          allAssets = allAssets.filter((a) => a.category === params.category);
        }
        if (params.status) {
          allAssets = allAssets.filter((a) => a.status === params.status);
        }
        if (params.assignedTo) {
          allAssets = allAssets.filter((a) => a.assignedTo === params.assignedTo);
        }
      }

      // Sort by updatedAt or createdAt desc
      allAssets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 50;
      const total = allAssets.length;
      const totalPages = Math.ceil(total / pageSize) || 1;
      const startIdx = (page - 1) * pageSize;
      const pagedAssets = allAssets.slice(startIdx, startIdx + pageSize);

      return {
        success: true,
        data: {
          items: pagedAssets,
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch assets',
          statusCode: 500,
        },
      };
    }
  }

  async getAsset(id: string): Promise<ApiResponse<Asset>> {
    try {
      try {
        const assetDocRef = doc(db, 'assets', id);
        const snapshot = await getDoc(assetDocRef);

        if (snapshot.exists()) {
          return {
            success: true,
            data: normalizeAsset(snapshot.id, snapshot.data()),
          };
        }

        const assetsRef = collection(db, 'assets');
        const q = query(assetsRef, where('assetTag', '==', id));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const found = qSnap.docs[0];
          return {
            success: true,
            data: normalizeAsset(found.id, found.data()),
          };
        }
      } catch {
        // Fallback to seeded authoritative assets
      }

      const seeded = SEEDED_ASSETS.find((a) => a.id === id || a.assetTag === id);
      if (seeded) {
        return { success: true, data: seeded };
      }

      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Asset with identifier '${id}' not found`,
          statusCode: 404,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch asset',
          statusCode: 500,
        },
      };
    }
  }

  async createAsset(data: CreateAssetRequest): Promise<ApiResponse<Asset>> {
    try {
      const assetId = crypto.randomUUID();
      const now = new Date().toISOString();
      const assetTag = data.assetTag || `AST-${Date.now().toString().slice(-4)}`;

      const newAsset: Asset = {
        id: assetId,
        assetTag,
        name: data.name,
        description: data.description,
        category: data.category,
        status: (data as any).status || 'Active',
        location: data.location || { site: 'Main Site' },
        specifications: data.specifications || {},
        qrCode: assetTag,
        createdAt: now,
        updatedAt: now,
        createdBy: 'User',
        assignedTo: data.assignedTo,
      };

      await setDoc(doc(db, 'assets', assetId), newAsset);

      return {
        success: true,
        data: newAsset,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: error.message || 'Failed to create asset',
          statusCode: 400,
        },
      };
    }
  }

  async updateAsset(id: string, data: UpdateAssetRequest): Promise<ApiResponse<Asset>> {
    try {
      const assetRef = doc(db, 'assets', id);
      const now = new Date().toISOString();

      await updateDoc(assetRef, {
        ...data,
        updatedAt: now,
      });

      const updatedSnap = await getDoc(assetRef);
      return {
        success: true,
        data: normalizeAsset(updatedSnap.id, updatedSnap.data()),
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error.message || 'Failed to update asset',
          statusCode: 400,
        },
      };
    }
  }

  async deleteAsset(id: string): Promise<ApiResponse<void>> {
    try {
      await deleteDoc(doc(db, 'assets', id));
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: error.message || 'Failed to delete asset',
          statusCode: 400,
        },
      };
    }
  }

  async getAssetHistory(id: string): Promise<ApiResponse<AssetHistoryEntry[]>> {
    try {
      const history: AssetHistoryEntry[] = [];

      // Query evidence for this asset
      const evRef = collection(db, 'evidence');
      const q = query(evRef, where('assetId', '==', id));
      const evSnap = await getDocs(q);

      evSnap.forEach((d) => {
        const ev = d.data();
        history.push({
          id: d.id,
          assetId: id,
          action: 'EvidenceCaptured',
          performedBy: ev.userName || ev.userId || 'Technician',
          performedAt: ev.timestamp || ev.createdAt || new Date().toISOString(),
          details: {
            activityType: ev.activityType,
            description: ev.description,
            status: ev.status,
            evidenceHash: ev.evidenceHash,
          },
        });
      });

      history.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

      return {
        success: true,
        data: history,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message || 'Failed to fetch asset history',
          statusCode: 500,
        },
      };
    }
  }
}

export const assetService = new FirebaseAssetServiceImpl();
