import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, 
  Waves, 
  Activity, 
  AlertTriangle,
  Send,
  Link2,
  Users,
  Navigation,
  CheckCircle,
  FileText,
  Radio
} from 'lucide-react';

const investigationTools = [
  {
    id: 'ambient',
    title: 'Ambient Sound Monitoring',
    description: 'Short-lived audio snapshots (on permission)',
    badge: 'Tool',
    icon: Waves,
    status: 'available'
  },
  {
    id: 'behavioral',
    title: 'Behavioural Analysis',
    description: 'Device motion & pattern checks',
    badge: 'AI',
    icon: Activity,
    status: 'available'
  },
  {
    id: 'verification',
    title: 'False Report Screening',
    description: 'Cross-ref + anomaly rules',
    badge: 'Verifier',
    icon: AlertTriangle,
    status: 'active'
  }
];

const linkedReports = [
  {
    id: 1,
    caseId: '#002451',
    title: 'Suspicious Activity - Wuse II',
    deviceHash: 'hash#A2F7B9C...',
    timestamp: '2025-10-01 14:22:35',
    similarity: 95
  },
  {
    id: 2,
    caseId: '#002389',
    title: 'Theft Report - Garki',
    deviceHash: 'hash#A2F7B9C...',
    timestamp: '2025-09-28 16:45:12',
    similarity: 92
  },
  {
    id: 3,
    caseId: '#002201',
    title: 'Disturbance - CBD',
    deviceHash: 'hash#A2F7B9C...',
    timestamp: '2025-09-25 11:30:20',
    similarity: 88
  }
];

const interAgencyRequests = [
  {
    id: 1,
    requestType: 'Data Request',
    targetAgency: 'Lagos State Police',
    status: 'pending',
    date: '2025-10-10'
  },
  {
    id: 2,
    requestType: 'Joint Investigation',
    targetAgency: 'NEMA',
    status: 'approved',
    date: '2025-10-09'
  },
  {
    id: 3,
    requestType: 'Follow-up Questions',
    targetAgency: 'Community Hub - Garki',
    status: 'completed',
    date: '2025-10-08'
  }
];

export function InvestigatorToolkit() {
  const [selectedTool, setSelectedTool] = useState(investigationTools[0]);
  const [followUpMessage, setFollowUpMessage] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'available':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Investigator Toolkit — Advanced</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Post-report investigation flows • Ambient sound monitoring • Behavioural analysis • False/malicious verification • 
          Inter-agency requests • Linked reports • Live road map direction
        </p>
      </div>

      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="tools" className="text-xs md:text-sm">
            <Search className="size-3 md:size-4 mr-1 md:mr-2" />
            Investigation Tools
          </TabsTrigger>
          <TabsTrigger value="linked" className="text-xs md:text-sm">
            <Link2 className="size-3 md:size-4 mr-1 md:mr-2" />
            Linked Reports
          </TabsTrigger>
          <TabsTrigger value="inter-agency" className="text-xs md:text-sm">
            <Users className="size-3 md:size-4 mr-1 md:mr-2" />
            Inter-Agency
          </TabsTrigger>
          <TabsTrigger value="workspace" className="text-xs md:text-sm">
            <Radio className="size-3 md:size-4 mr-1 md:mr-2" />
            Joint Workspace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tools List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Available Investigation Tools</CardTitle>
                <CardDescription>AI-powered analysis and verification systems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {investigationTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool)}
                      className={`w-full p-3 md:p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                        selectedTool.id === tool.id
                          ? 'border-[#2B7A78] bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                          <Icon className="size-5 text-[#0C3B5C]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm text-[#0C3B5C]">{tool.title}</h4>
                            <Badge className={getStatusColor(tool.status)}>
                              {tool.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Tool Details */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-[#0C3B5C] text-base md:text-lg">
                        {selectedTool.title}
                      </CardTitle>
                      <CardDescription>{selectedTool.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(selectedTool.status)}>
                      {selectedTool.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tool Interface */}
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <selectedTool.icon className="size-12 mx-auto mb-3 text-[#0C3B5C] opacity-50" />
                      <h4 className="text-[#0C3B5C] mb-2">{selectedTool.title}</h4>
                      <p className="text-sm text-muted-foreground px-6">
                        {selectedTool.id === 'ambient' && 'Real-time audio monitoring with permission-based access'}
                        {selectedTool.id === 'behavioral' && 'AI analysis of device motion patterns and behavioral anomalies'}
                        {selectedTool.id === 'verification' && 'Cross-reference validation and anomaly detection engine'}
                      </p>
                    </div>
                  </div>

                  <Button className="w-full bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                    <Search className="size-4 mr-2" />
                    Activate Tool
                  </Button>

                  {selectedTool.id === 'verification' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm text-[#0C3B5C] mb-2">Verification Results</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Report Authenticity</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="size-3 mr-1" />
                            98% Confidence
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Cross-reference Check</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="size-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Anomaly Detection</span>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="size-3 mr-1" />
                            Clean
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Live Road Map Direction */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0C3B5C] text-base md:text-lg">
                    <Navigation className="size-5 inline mr-2" />
                    Live Road Map Direction
                  </CardTitle>
                  <CardDescription>Real-time navigation to incident location</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-green-100 to-blue-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <Navigation className="size-12 mx-auto mb-3 text-[#0C3B5C] opacity-50" />
                      <p className="text-sm text-muted-foreground mb-3">
                        GPS-enabled turn-by-turn navigation
                      </p>
                      <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                        ETA: 12 minutes
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      <Navigation className="size-4 mr-2" />
                      Start Navigation
                    </Button>
                    <Button variant="outline" size="sm">
                      <Send className="size-4 mr-2" />
                      Share Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="linked" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Linked Reports to Same Device</CardTitle>
              <CardDescription>Multiple reports traced to identical device signature</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {linkedReports.map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{report.caseId}</Badge>
                          <h4 className="text-sm text-[#0C3B5C]">{report.title}</h4>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>Device: {report.deviceHash}</div>
                          <div>Timestamp: {report.timestamp}</div>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                        {report.similarity}% Match
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <FileText className="size-4 mr-2" />
                      View Full Report
                    </Button>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4 bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                <Link2 className="size-4 mr-2" />
                Link New Report to Device
              </Button>

              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-sm text-purple-900">
                  <strong>Device Signature Analysis:</strong> 3 reports linked to device hash#A2F7B9C 
                  over 15-day period. Pattern suggests potential repeat offender or coordinated activity.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inter-agency" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Create Request */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Create Inter-Agency Request</CardTitle>
                <CardDescription>Send follow-up questions or data requests to partner agencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Request Type</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option>Follow-up Questions</option>
                    <option>Data Request</option>
                    <option>Joint Investigation</option>
                    <option>Technical Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Target Agency</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option>Lagos State Police</option>
                    <option>NEMA</option>
                    <option>Fire Service</option>
                    <option>Community Hub - Garki</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Request Details</label>
                  <Textarea
                    placeholder="Describe your request and required information..."
                    rows={4}
                    value={followUpMessage}
                    onChange={(e) => setFollowUpMessage(e.target.value)}
                  />
                </div>

                <Button className="w-full bg-[#2B7A78] hover:bg-[#2B7A78]/90">
                  <Send className="size-4 mr-2" />
                  Send Follow-up Questions
                </Button>
              </CardContent>
            </Card>

            {/* Request History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Request History</CardTitle>
                <CardDescription>Track inter-agency collaboration requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {interAgencyRequests.map((request) => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm text-[#0C3B5C] mb-1">{request.requestType}</h4>
                          <p className="text-xs text-muted-foreground">{request.targetAgency}</p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Date: {request.date}
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-4">
                  View All Requests
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Multi-Agency Task Force Workspace</CardTitle>
              <CardDescription>Shared dashboard for joint investigations and operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-8 border-2 border-dashed rounded-lg text-center">
                <Users className="size-16 mx-auto mb-4 text-[#0C3B5C] opacity-50" />
                <h4 className="text-[#0C3B5C] mb-2">Collaborative Investigation Space</h4>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Secure workspace for real-time collaboration with partner agencies. 
                  Share evidence, coordinate operations, and maintain unified case management.
                </p>
                <Button className="bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                  <Users className="size-4 mr-2" />
                  Open Joint Workspace
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-2xl text-[#0C3B5C] mb-1">5</div>
                  <div className="text-xs text-muted-foreground">Active Task Forces</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-2xl text-[#0C3B5C] mb-1">12</div>
                  <div className="text-xs text-muted-foreground">Partner Agencies</div>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <div className="text-2xl text-[#0C3B5C] mb-1">28</div>
                  <div className="text-xs text-muted-foreground">Joint Investigations</div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm text-[#0C3B5C] mb-3">Workspace Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Real-time case updates and synchronized operations</li>
                  <li>Secure evidence sharing with access controls</li>
                  <li>Joint task assignment and progress tracking</li>
                  <li>Integrated communication and video conferencing</li>
                  <li>Cross-agency resource allocation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
