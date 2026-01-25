import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AnalysisRequest as AnalysisRequestType } from '../../types/ngo';
import { 
  FileBarChart, 
  Clock, 
  CheckCircle, 
  Loader, 
  Download,
  TrendingUp,
  AlertTriangle,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AnalysisRequestProps {
  requests: AnalysisRequestType[];
}

const STATUS_CONFIG = {
  'pending': { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  'processing': { label: 'Processing', color: 'bg-blue-100 text-blue-800', icon: Loader },
  'completed': { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

const analysisMatrix = {
  totalIncidents: 1840,
  incidentRateIndex: 1.18,
  sosResponseMedian: '7m 42s',
  interventionCoverage: '64%',
  confidenceScore: 0.82,
  categoryBreakdown: [
    { category: 'GBV', incidents: 340, percentage: 18.5 },
    { category: 'Youth Crime', incidents: 280, percentage: 15.2 },
    { category: 'Disaster', incidents: 120, percentage: 6.5 },
    { category: 'Trafficking', incidents: 95, percentage: 5.2 },
    { category: 'Armed Robbery', incidents: 185, percentage: 10.1 },
    { category: 'Other', incidents: 820, percentage: 44.6 }
  ],
  trendData: [
    { month: 'Jul', incidents: 165 },
    { month: 'Aug', incidents: 172 },
    { month: 'Sep', incidents: 158 },
    { month: 'Oct', incidents: 145 },
    { month: 'Nov', incidents: 152 },
    { month: 'Dec', incidents: 148 }
  ],
  severityDistribution: [
    { severity: 'Critical', value: 15 },
    { severity: 'High', value: 28 },
    { severity: 'Medium', value: 35 },
    { severity: 'Low', value: 22 }
  ],
  radarMetrics: [
    { metric: 'Response Time', value: 85 },
    { metric: 'Coverage', value: 64 },
    { metric: 'Resolution Rate', value: 72 },
    { metric: 'Community Trust', value: 78 },
    { metric: 'Prevention Impact', value: 68 },
    { metric: 'Resource Efficiency', value: 75 }
  ]
};

export function AnalysisRequest({ requests }: AnalysisRequestProps) {
  const [selectedCountry, setSelectedCountry] = useState('nigeria');
  const [selectedState, setSelectedState] = useState('fct');
  const [selectedLGA, setSelectedLGA] = useState('abuja-municipal');
  const [selectedWard, setSelectedWard] = useState('ward-a');
  const [analysisType, setAnalysisType] = useState('general-crime');
  const [timePeriod, setTimePeriod] = useState('last-30-days');
  const [showResults, setShowResults] = useState(false);

  const handleGenerateAnalysis = () => {
    setShowResults(true);
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Analysis & Report Generation</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Request comprehensive crime analysis with full toolset and report matrix • Country → State → LGA → Community
        </p>
      </div>

      <Tabs defaultValue="new-request" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="new-request" className="text-xs md:text-sm">
            <FileBarChart className="size-3 md:size-4 mr-2" />
            New Analysis
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs md:text-sm">
            <Clock className="size-3 md:size-4 mr-2" />
            Request History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-request" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Configure Analysis Parameters</CardTitle>
              <CardDescription>Select geographic scope and analysis type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Geographic Scope */}
              <div>
                <h4 className="text-sm mb-3 text-[#0C3B5C]">Geographic Scope</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Country</label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nigeria">Nigeria</SelectItem>
                        <SelectItem value="ghana">Ghana</SelectItem>
                        <SelectItem value="kenya">Kenya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">State / Region</label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fct">FCT (Federal Capital Territory)</SelectItem>
                        <SelectItem value="lagos">Lagos State</SelectItem>
                        <SelectItem value="benue">Benue State</SelectItem>
                        <SelectItem value="national">National Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Local Government Area</label>
                    <Select value={selectedLGA} onValueChange={setSelectedLGA}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abuja-municipal">Abuja Municipal</SelectItem>
                        <SelectItem value="gwagwalada">Gwagwalada</SelectItem>
                        <SelectItem value="bwari">Bwari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Ward / Community</label>
                    <Select value={selectedWard} onValueChange={setSelectedWard}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ward-a">Ward A</SelectItem>
                        <SelectItem value="ward-b">Ward B</SelectItem>
                        <SelectItem value="ward-c">Ward C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Analysis Configuration */}
              <div>
                <h4 className="text-sm mb-3 text-[#0C3B5C]">Analysis Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Report Type</label>
                    <Select value={analysisType} onValueChange={setAnalysisType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general-crime">General Crime Report</SelectItem>
                        <SelectItem value="gbv-lens">GBV Lens</SelectItem>
                        <SelectItem value="youth-crime">Youth Crime Lens</SelectItem>
                        <SelectItem value="disaster">Disaster Alerts Lens</SelectItem>
                        <SelectItem value="trafficking">Trafficking Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Time Period</label>
                    <Select value={timePeriod} onValueChange={setTimePeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-7-days">Last 7 days</SelectItem>
                        <SelectItem value="last-30-days">Last 30 days</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="ytd">Year to Date</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full bg-[#0C3B5C] hover:bg-[#0C3B5C]/90"
                onClick={handleGenerateAnalysis}
              >
                <FileBarChart className="size-4 mr-2" />
                Generate Analysis
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {showResults && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Incident Rate Index</div>
                    <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">{analysisMatrix.incidentRateIndex}</div>
                    <div className="text-xs text-muted-foreground">By category & severity</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">SOS Response (median)</div>
                    <div className="text-xl md:text-2xl text-[#2B7A78] mb-1">{analysisMatrix.sosResponseMedian}</div>
                    <div className="text-xs text-muted-foreground">Callouts & outcomes</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Intervention Coverage</div>
                    <div className="text-xl md:text-2xl text-[#E8B339] mb-1">{analysisMatrix.interventionCoverage}</div>
                    <div className="text-xs text-muted-foreground">NGO reach vs need</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Confidence Score</div>
                    <div className="text-xl md:text-2xl text-purple-600 mb-1">{analysisMatrix.confidenceScore}</div>
                    <div className="text-xs text-muted-foreground">Reporting density</div>
                  </CardContent>
                </Card>
              </div>

              {/* Full Report Matrix */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Full Report Matrix</CardTitle>
                      <CardDescription>Comprehensive analysis for FCT - Abuja Municipal - Ward A</CardDescription>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Download className="size-4" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Category Breakdown Chart */}
                  <div>
                    <h4 className="text-sm mb-3 text-[#0C3B5C]">Incident Category Breakdown</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analysisMatrix.categoryBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="incidents" fill="#0C3B5C" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Trend Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm mb-3 text-[#0C3B5C]">6-Month Trend</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analysisMatrix.trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="incidents" stroke="#2B7A78" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h4 className="text-sm mb-3 text-[#0C3B5C]">Severity Distribution</h4>
                      <div className="space-y-2">
                        {analysisMatrix.severityDistribution.map((item) => (
                          <div key={item.severity} className="flex items-center gap-3">
                            <div className="w-24 text-sm">{item.severity}</div>
                            <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                              <div 
                                className={`h-full flex items-center justify-end px-3 text-white text-sm ${
                                  item.severity === 'Critical' ? 'bg-red-600' :
                                  item.severity === 'High' ? 'bg-orange-500' :
                                  item.severity === 'Medium' ? 'bg-amber-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${item.value}%` }}
                              >
                                {item.value}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Performance Radar */}
                  <div>
                    <h4 className="text-sm mb-3 text-[#0C3B5C]">System Performance Metrics</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={analysisMatrix.radarMetrics}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar name="Performance" dataKey="value" stroke="#0C3B5C" fill="#0C3B5C" fillOpacity={0.5} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="size-5 text-blue-600" />
                        <h4 className="text-sm text-[#0C3B5C]">Key Findings</h4>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>GBV incidents represent 18.5% of total cases</li>
                        <li>Youth crime decreased by 12% this quarter</li>
                        <li>Response time improved by 15% month-over-month</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-5 text-amber-600" />
                        <h4 className="text-sm text-[#0C3B5C]">Recommendations</h4>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Increase intervention coverage in low-income areas</li>
                        <li>Deploy additional resources to high-risk zones</li>
                        <li>Strengthen community engagement programs</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Analysis Request History</CardTitle>
              <CardDescription>Track and download previous analysis reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((request) => {
                  const StatusIcon = STATUS_CONFIG[request.status].icon;
                  
                  return (
                    <div key={request.id} className="p-3 md:p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm md:text-base text-[#0C3B5C]">
                              {request.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
                            </h4>
                            <Badge className={STATUS_CONFIG[request.status].color}>
                              <StatusIcon className="size-3 mr-1" />
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              <span>{request.region}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="size-3" />
                              <span>{request.scope}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              <span>{new Date(request.requestedDate).toLocaleDateString()}</span>
                            </div>
                            {request.completedDate && (
                              <div className="text-green-600">
                                Completed: {new Date(request.completedDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {request.status === 'completed' && (
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="size-3" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
