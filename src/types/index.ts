export interface EcomailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  html?: string;
  plaintext?: string;
  sent_at?: string;
  created_at: string;
  type?: string;
  status: string;
  recipients_count?: number;
  tags?: string[];
  segment?: string;
}

export interface EcomailApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
}

export interface SyncState {
  lastSyncDate: string;
  lastCampaignId: string | null;
  syncedCampaignIds: string[];
  totalSyncedCount: number;
}

export interface CampaignMetadata {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  sentAt?: string;
  type?: string;
  recipientsCount?: number;
  tags?: string[];
  segment?: string;
}

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };