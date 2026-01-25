import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ReportDownload } from '../../types/ngo';
import { Download, FileText, FileSpreadsheet, Search, Calendar, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ReportDownloadsProps {
  reports: ReportDownload[];
}

const ACCESS_LEVEL_CONFIG = {
  'public-summary': {
    label: 'Public Summary',
    color: 'bg-blue-100 text-blue-800',
    icon: '🌍'
  },
  'partner-deep-dive': {
    label: 'Partner Deep-Dive',
    color: 'bg-green-100 text-green-800',
    icon: '🤝'
  },
  'donor-extended': {
    label: 'Donor Extended',
    color: 'bg-amber-100 text-amber-800',
    icon: '💎'
  }
};

export function ReportDownloads({ reports }: ReportDownloadsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredReports = reports.filter(report => {
    if (searchQuery && !report.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedAccessLevel !== 'all' && report.accessLevel !== selectedAccessLevel) return false;
    if (selectedType !== 'all' && report.type !== selectedType) return false;
    return true;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv':
        return <FileText className="size-5 text-green-600" />;
      case 'excel':
        return <FileSpreadsheet className="size-5 text-green-700" />;
      case 'pdf':
        return <FileText className="size-5 text-red-600" />;
      default:
        return <FileText className="size-5" />;
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Report Downloads</h2>
        <p className="text-muted-foreground">
          Export anonymized datasets for research, monitoring, and donor reporting
        </p>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Available Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Access Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Access Levels</SelectItem>
                    <SelectItem value="public-summary">Public Summary</SelectItem>
                    <SelectItem value="partner-deep-dive">Partner Deep-Dive</SelectItem>
                    <SelectItem value="donor-extended">Donor Extended</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All File Types</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <div className="grid grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-muted rounded-lg">
                        {getFileIcon(report.type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-[#0C3B5C] mb-1">{report.name}</CardTitle>
                        <CardDescription>{report.category}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>{report.dateRange}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Size: {report.size}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge className={ACCESS_LEVEL_CONFIG[report.accessLevel].color}>
                      {ACCESS_LEVEL_CONFIG[report.accessLevel].icon} {ACCESS_LEVEL_CONFIG[report.accessLevel].label}
                    </Badge>
                    <Button size="sm" className="gap-2">
                      <Download className="size-4" />
                      Download
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Generated: {new Date(report.generatedDate).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C]">Automated Report Delivery</CardTitle>
              <CardDescription>
                Set up scheduled reports to be delivered to your email automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="mb-1">Monthly Crime Statistics</div>
                    <div className="text-sm text-muted-foreground">Every 1st of the month • CSV Format</div>
                  </div>
                  <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="mb-1">Quarterly GBV Analysis</div>
                    <div className="text-sm text-muted-foreground">Every quarter end • Excel Format</div>
                  </div>
                  <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">Active</Badge>
                </div>
              </div>

              <Button className="w-full mt-4 bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                Configure New Schedule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] flex items-center gap-2">
                <Shield className="size-5" />
                API Key Management
              </CardTitle>
              <CardDescription>
                Secure API access for integration with external dashboards and systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="mb-2">Your API Key</div>
                <div className="font-mono text-sm bg-background p-3 rounded border">
                  ngo_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Keep this key secure. Do not share it publicly.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">API Endpoints</div>
                <div className="space-y-1 text-sm">
                  <div className="p-3 bg-muted rounded font-mono">
                    GET /api/v1/trends
                  </div>
                  <div className="p-3 bg-muted rounded font-mono">
                    GET /api/v1/reports/download
                  </div>
                  <div className="p-3 bg-muted rounded font-mono">
                    POST /api/v1/analysis/request
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                View API Documentation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
