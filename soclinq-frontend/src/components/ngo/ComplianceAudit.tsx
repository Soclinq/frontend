import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AuditLog } from '../../types/ngo';
import { 
  Shield, 
  Lock, 
  FileCheck, 
  Download as DownloadIcon, 
  Radio, 
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Database,
  Key
} from 'lucide-react';

interface ComplianceAuditProps {
  auditLogs: AuditLog[];
}

const ACTION_CONFIG = {
  'download': { label: 'Download', color: 'bg-blue-100 text-blue-800', icon: DownloadIcon },
  'campaign-publish': { label: 'Campaign Published', color: 'bg-green-100 text-green-800', icon: Radio },
  'data-access': { label: 'Data Access', color: 'bg-amber-100 text-amber-800', icon: Eye },
  'api-request': { label: 'API Request', color: 'bg-purple-100 text-purple-800', icon: Database }
};

const complianceFrameworks = [
  {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    status: 'compliant',
    lastAudit: '2025-01-01',
    coverage: 100
  },
  {
    name: 'NDPA',
    fullName: 'Nigeria Data Protection Act',
    status: 'compliant',
    lastAudit: '2024-12-15',
    coverage: 100
  },
  {
    name: 'UN Humanitarian Data Ethics',
    fullName: 'UN OCHA Data Responsibility Guidelines',
    status: 'compliant',
    lastAudit: '2024-12-20',
    coverage: 98
  },
  {
    name: 'UNHCR Standards',
    fullName: 'UNHCR Data Protection Policy',
    status: 'review',
    lastAudit: '2024-11-30',
    coverage: 95
  }
];

const donorTemplates = [
  { id: 1, organization: 'UNHCR', template: 'Refugee & IDP Report Template', lastUpdated: '2024-12-01' },
  { id: 2, organization: 'UNICEF', template: 'Child Protection Indicators', lastUpdated: '2024-11-15' },
  { id: 3, organization: 'World Bank', template: 'Development Impact Report', lastUpdated: '2024-10-20' },
  { id: 4, organization: 'EU Humanitarian Aid', template: 'Crisis Response Metrics', lastUpdated: '2024-12-10' },
  { id: 5, organization: 'USAID', template: 'Democracy & Governance Report', lastUpdated: '2024-11-25' }
];

const accessTiers = [
  {
    tier: 'Public Summary',
    mandate: 'General public access',
    description: 'High-level aggregated statistics without sensitive details',
    restrictions: 'No PII, geo-masked data',
    users: 45
  },
  {
    tier: 'Partner Deep-Dive',
    mandate: 'Registered NGO partners',
    description: 'Detailed anonymized datasets for program design',
    restrictions: 'Strict access logging, time-limited access',
    users: 12
  },
  {
    tier: 'Donor Extended Dataset',
    mandate: 'Verified donor organizations',
    description: 'Comprehensive data for funding proposals and impact assessment',
    restrictions: 'Multi-factor authentication, IP whitelisting',
    users: 8
  }
];

export function ComplianceAudit({ auditLogs }: ComplianceAuditProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const filteredLogs = auditLogs.filter(log => {
    if (searchQuery && !log.details.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.user.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.organization.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedAction !== 'all' && log.action !== selectedAction) return false;
    return true;
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Compliance & Governance</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Audit trails • Data anonymization & encryption • GDPR, NDPA, UN compliance • Donor report templates • Access tiering
        </p>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="size-8 text-[#2B7A78]" />
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="size-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">100%</div>
            <div className="text-xs md:text-sm text-muted-foreground">Data Anonymization</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Lock className="size-8 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800">
                <CheckCircle className="size-3 mr-1" />
                Encrypted
              </Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">256-bit</div>
            <div className="text-xs md:text-sm text-muted-foreground">AES Encryption</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <FileCheck className="size-8 text-purple-600" />
              <Badge className="bg-purple-100 text-purple-800">
                <CheckCircle className="size-3 mr-1" />
                Compliant
              </Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">4/4</div>
            <div className="text-xs md:text-sm text-muted-foreground">Frameworks</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="size-8 text-[#E8B339]" />
              <Badge className="bg-amber-100 text-amber-800">
                <Clock className="size-3 mr-1" />
                Logged
              </Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">{auditLogs.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Audit Entries</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit-trail" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="audit-trail" className="text-xs md:text-sm">
            <Eye className="size-3 md:size-4 mr-1 md:mr-2" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs md:text-sm">
            <FileCheck className="size-3 md:size-4 mr-1 md:mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="donors" className="text-xs md:text-sm">
            <DownloadIcon className="size-3 md:size-4 mr-1 md:mr-2" />
            Donors
          </TabsTrigger>
          <TabsTrigger value="access-tiers" className="text-xs md:text-sm">
            <Key className="size-3 md:size-4 mr-1 md:mr-2" />
            Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit-trail" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Complete Audit Trail</CardTitle>
              <CardDescription>Full log of all system actions and data access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user, organization, or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant={selectedAction === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAction('all')}
                  >
                    All
                  </Button>
                  <Button 
                    variant={selectedAction === 'download' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAction('download')}
                  >
                    Downloads
                  </Button>
                  <Button 
                    variant={selectedAction === 'data-access' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAction('data-access')}
                  >
                    Data Access
                  </Button>
                  <Button 
                    variant={selectedAction === 'api-request' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAction('api-request')}
                  >
                    API
                  </Button>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const ActionIcon = ACTION_CONFIG[log.action].icon;
                  
                  return (
                    <div key={log.id} className="p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                            <ActionIcon className="size-5 text-[#0C3B5C]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Badge className={ACTION_CONFIG[log.action].color}>
                                {ACTION_CONFIG[log.action].label}
                              </Badge>
                              <span className="text-sm text-[#0C3B5C]">{log.user}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{log.organization}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{log.details}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                          <Clock className="size-3 inline mr-1" />
                          {log.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="outline" className="w-full">
                Load More Entries
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Compliance Frameworks</CardTitle>
              <CardDescription>Alignment with international data protection and humanitarian standards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceFrameworks.map((framework) => (
                  <div key={framework.name} className="p-4 border rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base text-[#0C3B5C]">{framework.name}</h4>
                          <Badge variant={framework.status === 'compliant' ? 'default' : 'secondary'}>
                            {framework.status === 'compliant' ? (
                              <><CheckCircle className="size-3 mr-1" /> Compliant</>
                            ) : (
                              <><AlertTriangle className="size-3 mr-1" /> In Review</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{framework.fullName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Last Audit</div>
                        <div className="text-sm">{new Date(framework.lastAudit).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Coverage Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className="text-[#2B7A78]">{framework.coverage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#2B7A78] to-[#E8B339]"
                          style={{ width: `${framework.coverage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="size-6 text-[#2B7A78] flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-sm text-[#0C3B5C] mb-2">Data Protection Measures</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>End-to-end encryption before NGO/Government access</li>
                      <li>Automatic PII scrubbing and anonymization</li>
                      <li>Geo-masking for sensitive locations</li>
                      <li>Time-bound access with automatic expiration</li>
                      <li>Multi-factor authentication for all users</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Donor Report Templates</CardTitle>
              <CardDescription>Pre-aligned templates for international funding frameworks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {donorTemplates.map((template) => (
                  <div key={template.id} className="p-3 md:p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileCheck className="size-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm md:text-base text-[#0C3B5C] mb-1">{template.template}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{template.organization}</Badge>
                            <span>•</span>
                            <span>Updated: {new Date(template.lastUpdated).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="size-3 mr-2" />
                          Preview
                        </Button>
                        <Button size="sm" className="bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                          <DownloadIcon className="size-3 mr-2" />
                          Use
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm text-[#0C3B5C] mb-2">Automated Reporting Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Auto-fill data fields from your analysis results</li>
                  <li>Scheduled report generation and email delivery</li>
                  <li>Built-in charts and visualizations</li>
                  <li>Multi-format export (PDF, Excel, Word)</li>
                  <li>Compliance-checked output</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-tiers" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Access Tier Management</CardTitle>
              <CardDescription>Role-based access control by organizational mandate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessTiers.map((tier) => (
                  <div key={tier.tier} className="p-4 border-2 rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base text-[#0C3B5C]">{tier.tier}</h4>
                          <Badge variant="outline">
                            <Users className="size-3 mr-1" />
                            {tier.users} users
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{tier.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary">{tier.mandate}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Restrictions</div>
                      <div className="text-sm">{tier.restrictions}</div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="size-3 mr-2" />
                        View Users
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Key className="size-3 mr-2" />
                        Manage Access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
