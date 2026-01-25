export interface TrendData {
  id: string;
  category: 'gender-based-violence' | 'youth-crime' | 'disaster-alerts' | 'trafficking' | 'child-abuse' | 'armed-robbery';
  region: string;
  state: string;
  localGovernment: string;
  community: string;
  incidents: number;
  period: string;
  demographics: {
    gender?: 'male' | 'female' | 'other';
    ageGroup?: '0-17' | '18-24' | '25-34' | '35-49' | '50+';
    socioEconomicIndex?: 'low' | 'medium' | 'high';
  };
}

export interface ReportDownload {
  id: string;
  name: string;
  type: 'csv' | 'excel' | 'pdf';
  category: string;
  dateRange: string;
  size: string;
  generatedDate: string;
  accessLevel: 'public-summary' | 'partner-deep-dive' | 'donor-extended';
}

export interface Campaign {
  id: string;
  title: string;
  type: 'trafficking' | 'gbv-prevention' | 'disaster-preparedness' | 'child-safety';
  status: 'draft' | 'published' | 'archived';
  reach: number;
  targetRegions: string[];
  publishedDate?: string;
}

export interface AnalysisRequest {
  id: string;
  type: 'general-crime' | 'gender-violence' | 'youth-crime' | 'disaster';
  scope: 'national' | 'state' | 'local-government' | 'community';
  region: string;
  status: 'pending' | 'processing' | 'completed';
  requestedDate: string;
  completedDate?: string;
}

export interface AuditLog {
  id: string;
  action: 'download' | 'campaign-publish' | 'data-access' | 'api-request';
  user: string;
  organization: string;
  timestamp: string;
  details: string;
}
