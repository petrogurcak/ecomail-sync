export interface EcomailCampaign {
  id: string;
  title: string;    // Ecomail používá 'title' místo 'name'
  subject: string;
  preheader?: string;
  html?: string;
  plaintext?: string;
  sent_at?: string;
  changed_at?: string;
  from_name?: string;
  from_email?: string;
  status: number;   // Ecomail používá číselný status
  recipients?: number;  // Ecomail používá 'recipients' místo 'recipients_count'
  ga?: string;
  template_id?: number;
  archive_url?: string;
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
  fromName?: string;
  fromEmail?: string;
  ga?: string;
}

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };