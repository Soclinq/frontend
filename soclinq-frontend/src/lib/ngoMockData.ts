import { TrendData, ReportDownload, Campaign, AnalysisRequest, AuditLog } from '../types/ngo';

export const mockTrendData: TrendData[] = [
  {
    id: '1',
    category: 'gender-based-violence',
    region: 'Lagos',
    state: 'Lagos',
    localGovernment: 'Ikeja',
    community: 'Allen Avenue',
    incidents: 45,
    period: '2024-Q4',
    demographics: { gender: 'female', ageGroup: '25-34', socioEconomicIndex: 'medium' }
  },
  {
    id: '2',
    category: 'youth-crime',
    region: 'Lagos',
    state: 'Lagos',
    localGovernment: 'Surulere',
    community: 'Shitta',
    incidents: 32,
    period: '2024-Q4',
    demographics: { gender: 'male', ageGroup: '18-24', socioEconomicIndex: 'low' }
  },
  {
    id: '3',
    category: 'trafficking',
    region: 'Lagos',
    state: 'Lagos',
    localGovernment: 'Apapa',
    community: 'Ajegunle',
    incidents: 12,
    period: '2024-Q4',
    demographics: { gender: 'female', ageGroup: '18-24', socioEconomicIndex: 'low' }
  },
  {
    id: '4',
    category: 'disaster-alerts',
    region: 'Lagos',
    state: 'Lagos',
    localGovernment: 'Eti-Osa',
    community: 'Lekki',
    incidents: 8,
    period: '2024-Q4',
    demographics: { socioEconomicIndex: 'high' }
  },
  {
    id: '5',
    category: 'child-abuse',
    region: 'Lagos',
    state: 'Lagos',
    localGovernment: 'Alimosho',
    community: 'Egbeda',
    incidents: 28,
    period: '2024-Q4',
    demographics: { gender: 'female', ageGroup: '0-17', socioEconomicIndex: 'low' }
  },
  {
    id: '6',
    category: 'armed-robbery',
    region: 'Lagos',
    state: 'Lagos',
    localGovernment: 'Lagos Island',
    community: 'Marina',
    incidents: 15,
    period: '2024-Q4',
    demographics: { gender: 'male', ageGroup: '25-34', socioEconomicIndex: 'medium' }
  }
];

export const mockReportDownloads: ReportDownload[] = [
  {
    id: 'rd1',
    name: 'Q4 2024 Gender-Based Violence Report',
    type: 'excel',
    category: 'Gender-Based Violence',
    dateRange: 'Oct - Dec 2024',
    size: '2.4 MB',
    generatedDate: '2025-01-05',
    accessLevel: 'partner-deep-dive'
  },
  {
    id: 'rd2',
    name: 'Annual Crime Statistics Summary',
    type: 'pdf',
    category: 'General Crime',
    dateRange: 'Jan - Dec 2024',
    size: '5.1 MB',
    generatedDate: '2025-01-02',
    accessLevel: 'public-summary'
  },
  {
    id: 'rd3',
    name: 'Youth Crime Trends Analysis',
    type: 'csv',
    category: 'Youth Crime',
    dateRange: 'Jan - Dec 2024',
    size: '890 KB',
    generatedDate: '2024-12-28',
    accessLevel: 'donor-extended'
  },
  {
    id: 'rd4',
    name: 'Trafficking Hotspots Dataset',
    type: 'excel',
    category: 'Human Trafficking',
    dateRange: 'Jul - Dec 2024',
    size: '1.8 MB',
    generatedDate: '2024-12-20',
    accessLevel: 'partner-deep-dive'
  }
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'c1',
    title: 'Stop Gender-Based Violence Campaign',
    type: 'gbv-prevention',
    status: 'published',
    reach: 45000,
    targetRegions: ['Lagos', 'Ogun', 'Oyo'],
    publishedDate: '2024-12-15'
  },
  {
    id: 'c2',
    title: 'Human Trafficking Awareness Initiative',
    type: 'trafficking',
    status: 'published',
    reach: 32000,
    targetRegions: ['Lagos', 'Delta', 'Edo'],
    publishedDate: '2024-11-20'
  },
  {
    id: 'c3',
    title: 'Flood Preparedness Guide',
    type: 'disaster-preparedness',
    status: 'draft',
    reach: 0,
    targetRegions: ['Lagos', 'Rivers', 'Bayelsa']
  },
  {
    id: 'c4',
    title: 'Child Safety in Schools',
    type: 'child-safety',
    status: 'published',
    reach: 28000,
    targetRegions: ['Lagos', 'Abuja'],
    publishedDate: '2024-10-10'
  }
];

export const mockAnalysisRequests: AnalysisRequest[] = [
  {
    id: 'ar1',
    type: 'general-crime',
    scope: 'state',
    region: 'Lagos State',
    status: 'completed',
    requestedDate: '2025-01-01',
    completedDate: '2025-01-03'
  },
  {
    id: 'ar2',
    type: 'gender-violence',
    scope: 'local-government',
    region: 'Ikeja LG',
    status: 'processing',
    requestedDate: '2025-01-04'
  },
  {
    id: 'ar3',
    type: 'youth-crime',
    scope: 'national',
    region: 'Nigeria',
    status: 'pending',
    requestedDate: '2025-01-05'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'al1',
    action: 'download',
    user: 'Sarah Johnson',
    organization: 'UNICEF Nigeria',
    timestamp: '2025-01-05 14:23:00',
    details: 'Downloaded Q4 2024 Gender-Based Violence Report'
  },
  {
    id: 'al2',
    action: 'campaign-publish',
    user: 'Michael Chen',
    organization: 'Save the Children',
    timestamp: '2025-01-05 10:15:00',
    details: 'Published "Child Safety in Schools" campaign'
  },
  {
    id: 'al3',
    action: 'api-request',
    user: 'API User - WHO Africa',
    organization: 'World Health Organization',
    timestamp: '2025-01-05 09:45:00',
    details: 'API data request for health-related incidents'
  },
  {
    id: 'al4',
    action: 'data-access',
    user: 'David Okafor',
    organization: 'African Development Bank',
    timestamp: '2025-01-04 16:30:00',
    details: 'Accessed donor-extended dataset for development programs'
  }
];
