export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string;
  category: AssetCategory;
  status: AssetStatus;
  location?: AssetLocation;
  specifications?: Record<string, unknown>;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo?: string;
}

export type AssetCategory =
  | 'Machinery'
  | 'Equipment'
  | 'Vehicle'
  | 'Tool'
  | 'Instrument'
  | 'Facility'
  | 'Other';

export type AssetStatus =
  | 'Active'
  | 'Inactive'
  | 'Maintenance'
  | 'Retired'
  | 'Lost'
  | 'Decommissioned';

export interface AssetLocation {
  site: string;
  building?: string;
  floor?: string;
  room?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface AssetHistoryEntry {
  id: string;
  assetId: string;
  action: AssetHistoryAction;
  performedBy: string;
  performedAt: string;
  details?: Record<string, unknown>;
  previousStatus?: AssetStatus;
  newStatus?: AssetStatus;
}

export type AssetHistoryAction =
  | 'Created'
  | 'Updated'
  | 'StatusChanged'
  | 'Assigned'
  | 'Unassigned'
  | 'MaintenanceStarted'
  | 'MaintenanceCompleted'
  | 'EvidenceCaptured'
  | 'Verified'
  | 'Transferred'
  | 'Retired';

export interface CreateAssetRequest {
  assetTag: string;
  name: string;
  description?: string;
  category: AssetCategory;
  location?: AssetLocation;
  specifications?: Record<string, unknown>;
  assignedTo?: string;
}

export interface UpdateAssetRequest {
  name?: string;
  description?: string;
  category?: AssetCategory;
  status?: AssetStatus;
  location?: AssetLocation;
  specifications?: Record<string, unknown>;
  assignedTo?: string;
}

export interface AssetSearchParams {
  query?: string;
  category?: AssetCategory;
  status?: AssetStatus;
  assignedTo?: string;
  site?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetListResponse {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}