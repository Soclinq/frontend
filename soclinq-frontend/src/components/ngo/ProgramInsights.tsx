import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  MapPin, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Lightbulb,
  Target,
  BarChart3,
  LineChart
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line, ScatterChart, Scatter } from 'recharts';

const categoryData = [
  { name: 'GBV', value: 340, color: '#ef4444' },
  { name: 'Youth Crime', value: 280, color: '#f59e0b' },
  { name: 'Disaster', value: 120, color: '#3b82f6' },
  { name: 'Trafficking', value: 95, color: '#8b5cf6' },
  { name: 'School Violence', value: 150, color: '#ec4899' },
  { name: 'Other', value: 85, color: '#6366f1' }
];

const longitudinalData = [
  { month: 'Jan', incidents: 145, intervention: 0 },
  { month: 'Feb', incidents: 152, intervention: 0 },
  { month: 'Mar', incidents: 148, intervention: 1 },
  { month: 'Apr', incidents: 135, intervention: 1 },
  { month: 'May', incidents: 125, intervention: 1 },
  { month: 'Jun', incidents: 118, intervention: 1 },
  { month: 'Jul', incidents: 105, intervention: 1 },
  { month: 'Aug', incidents: 98, intervention: 1 }
];

const correlationData = [
  { employment: 45, incidents: 152 },
  { employment: 52, incidents: 138 },
  { employment: 58, incidents: 125 },
  { employment: 63, incidents: 118 },
  { employment: 68, incidents: 105 },
  { employment: 72, incidents: 95 },
  { employment: 75, incidents: 88 },
  { employment: 78, incidents: 82 }
];

const policySimulation = [
  { month: 'Current', baseline: 145, lowImpact: 145, medImpact: 145, highImpact: 145 },
  { month: 'M1', baseline: 145, lowImpact: 140, medImpact: 135, highImpact: 128 },
  { month: 'M2', baseline: 145, lowImpact: 138, medImpact: 128, highImpact: 115 },
  { month: 'M3', baseline: 145, lowImpact: 135, medImpact: 120, highImpact: 105 },
  { month: 'M4', baseline: 145, lowImpact: 132, medImpact: 115, highImpact: 95 },
  { month: 'M5', baseline: 145, lowImpact: 130, medImpact: 110, highImpact: 88 },
  { month: 'M6', baseline: 145, lowImpact: 128, medImpact: 105, highImpact: 82 }
];

const vulnerableGroups = [
  { group: 'Women', risk: 'High', incidents: 340, trend: 'up', change: '+8%' },
  { group: 'Children', risk: 'Critical', incidents: 285, trend: 'up', change: '+12%' },
  { group: 'Displaced Persons', risk: 'High', incidents: 156, trend: 'stable', change: '+2%' },
  { group: 'Refugees', risk: 'Medium', incidents: 92, trend: 'down', change: '-5%' }
];

const earlyWarnings = [
  { 
    area: 'School-Based Violence', 
    status: 'rising', 
    current: 48, 
    threshold: 50, 
    description: 'Spike in school incidents - 12% increase this week'
  },
  { 
    area: 'Domestic Violence', 
    status: 'warning', 
    current: 85, 
    threshold: 75, 
    description: 'Above threshold - immediate intervention needed'
  },
  { 
    area: 'Youth Gang Activity', 
    status: 'stable', 
    current: 32, 
    threshold: 60, 
    description: 'Within normal range'
  }
];

export function ProgramInsights() {
  const [selectedIntervention, setSelectedIntervention] = useState('youth-employment');
  const [selectedImpact, setSelectedImpact] = useState('medium');
  const [correlationX, setCorrelationX] = useState('employment');
  const [correlationY, setCorrelationY] = useState('incidents');

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Program Design Insights</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Risk trend maps • Longitudinal analysis • Correlation tools • Policy simulator • Vulnerable group lenses • Early warning signals
        </p>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="size-8 text-red-600" />
              <Badge variant="destructive">Critical</Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">285</div>
            <div className="text-xs md:text-sm text-muted-foreground">Child Safety Incidents</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="size-8 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800">High</Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">340</div>
            <div className="text-xs md:text-sm text-muted-foreground">GBV Cases</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="size-8 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800">Active</Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">12</div>
            <div className="text-xs md:text-sm text-muted-foreground">Intervention Programs</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="size-8 text-[#2B7A78]" />
              <Badge className="bg-green-100 text-green-800">Improving</Badge>
            </div>
            <div className="text-2xl md:text-3xl text-[#0C3B5C] mb-1">-18%</div>
            <div className="text-xs md:text-sm text-muted-foreground">Crime Reduction</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="breakdown" className="text-xs md:text-sm">Category</TabsTrigger>
          <TabsTrigger value="longitudinal" className="text-xs md:text-sm">Timeline</TabsTrigger>
          <TabsTrigger value="correlation" className="text-xs md:text-sm">Correlations</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs md:text-sm">Simulator</TabsTrigger>
          <TabsTrigger value="vulnerable" className="text-xs md:text-sm">Vulnerable</TabsTrigger>
          <TabsTrigger value="warnings" className="text-xs md:text-sm">Warnings</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] flex items-center gap-2 text-base md:text-lg">
                <BarChart3 className="size-5" />
                Category Breakdown
              </CardTitle>
              <CardDescription>Distribution of incidents by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-4 rounded" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm md:text-base">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base md:text-lg text-[#0C3B5C]">{cat.value}</div>
                        <div className="text-xs text-muted-foreground">incidents</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="longitudinal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] flex items-center gap-2 text-base md:text-lg">
                <LineChart className="size-5" />
                Longitudinal Analysis
              </CardTitle>
              <CardDescription>Track how interventions change incident reporting over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ReLineChart data={longitudinalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="incidents" 
                    stroke="#0C3B5C" 
                    strokeWidth={3}
                    name="Incidents"
                  />
                </ReLineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <TrendingDown className="size-5" />
                  <span className="text-sm md:text-base">Intervention Impact Detected</span>
                </div>
                <p className="text-xs md:text-sm text-green-700">
                  Youth employment program started in March shows <strong>32% reduction</strong> in incidents over 5 months
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Correlation Analysis</CardTitle>
              <CardDescription>Compare crime reports with socio-economic factors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">X-Axis Variable</label>
                  <Select value={correlationX} onValueChange={setCorrelationX}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employment">Employment Levels</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="campaign">Campaign Reach</SelectItem>
                      <SelectItem value="disaster">Disaster Records</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Y-Axis Variable</label>
                  <Select value={correlationY} onValueChange={setCorrelationY}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incidents">Incident Rates</SelectItem>
                      <SelectItem value="sos">SOS Frequency</SelectItem>
                      <SelectItem value="gbv">GBV Share</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employment" name="Employment %" />
                  <YAxis dataKey="incidents" name="Incidents" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Correlation" data={correlationData} fill="#0C3B5C" />
                </ScatterChart>
              </ResponsiveContainer>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-900">
                  <strong>Correlation Coefficient: -0.87</strong> (Strong negative correlation)
                </div>
                <p className="text-xs md:text-sm text-blue-800 mt-1">
                  Higher employment levels strongly correlate with lower incident rates
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] flex items-center gap-2 text-base md:text-lg">
                <Lightbulb className="size-5 text-[#E8B339]" />
                Policy Simulator
              </CardTitle>
              <CardDescription>Run "what-if" scenarios to predict intervention impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Intervention Type</label>
                  <Select value={selectedIntervention} onValueChange={setSelectedIntervention}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youth-employment">Youth Employment Program</SelectItem>
                      <SelectItem value="gbv-shelters">GBV Safe Shelters</SelectItem>
                      <SelectItem value="school-guards">School Safety Guards</SelectItem>
                      <SelectItem value="community-policing">Community Policing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Impact Level</label>
                  <Select value={selectedImpact} onValueChange={setSelectedImpact}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Investment</SelectItem>
                      <SelectItem value="medium">Medium Investment</SelectItem>
                      <SelectItem value="high">High Investment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <ReLineChart data={policySimulation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeDasharray="5 5" name="Baseline (No Action)" />
                  <Line type="monotone" dataKey="lowImpact" stroke="#f59e0b" strokeWidth={2} name="Low Investment" />
                  <Line type="monotone" dataKey="medImpact" stroke="#3b82f6" strokeWidth={2} name="Medium Investment" />
                  <Line type="monotone" dataKey="highImpact" stroke="#2B7A78" strokeWidth={3} name="High Investment" />
                </ReLineChart>
              </ResponsiveContainer>

              <div className="p-4 bg-gradient-to-r from-[#0C3B5C]/10 to-[#2B7A78]/10 border border-[#2B7A78] rounded-lg">
                <div className="text-sm text-[#0C3B5C] mb-2">
                  <strong>Projected Impact (6 months - High Investment)</strong>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm">
                  <div>
                    <div className="text-muted-foreground">Crime Reduction</div>
                    <div className="text-lg text-[#2B7A78]">-43%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Lives Impacted</div>
                    <div className="text-lg text-[#2B7A78]">~12,400</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ROI</div>
                    <div className="text-lg text-[#2B7A78]">3.2x</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Confidence</div>
                    <div className="text-lg text-[#2B7A78]">82%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vulnerable" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Vulnerable Group Analysis</CardTitle>
              <CardDescription>Highlight risks faced by women, children, displaced persons, and refugees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vulnerableGroups.map((group) => (
                  <div key={group.group} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base md:text-lg text-[#0C3B5C]">{group.group}</h4>
                          <Badge variant={group.risk === 'Critical' ? 'destructive' : group.risk === 'High' ? 'default' : 'secondary'}>
                            {group.risk} Risk
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {group.incidents} incidents recorded
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`flex items-center gap-1 text-sm ${
                            group.trend === 'up' ? 'text-red-600' : 
                            group.trend === 'down' ? 'text-green-600' : 
                            'text-gray-600'
                          }`}>
                            {group.trend === 'up' && <TrendingUp className="size-4" />}
                            {group.trend === 'down' && <TrendingDown className="size-4" />}
                            <span>{group.change}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">View Details</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] flex items-center gap-2 text-base md:text-lg">
                <AlertTriangle className="size-5 text-amber-600" />
                Early Warning Signals
              </CardTitle>
              <CardDescription>Detect rising risks before escalation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {earlyWarnings.map((warning, index) => (
                  <div 
                    key={index} 
                    className={`p-4 border-l-4 rounded-lg ${
                      warning.status === 'warning' ? 'border-red-500 bg-red-50' :
                      warning.status === 'rising' ? 'border-amber-500 bg-amber-50' :
                      'border-green-500 bg-green-50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-base md:text-lg text-[#0C3B5C] mb-1">{warning.area}</h4>
                        <p className="text-sm text-muted-foreground">{warning.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Current</div>
                          <div className={`text-xl ${
                            warning.status === 'warning' ? 'text-red-600' :
                            warning.status === 'rising' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {warning.current}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Threshold</div>
                          <div className="text-xl text-muted-foreground">{warning.threshold}</div>
                        </div>
                      </div>
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
