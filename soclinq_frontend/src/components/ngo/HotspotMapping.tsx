import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  MapPin, 
  Layers, 
  Navigation, 
  Download,
  AlertTriangle,
  Clock,
  TrendingUp,
  Smartphone,
  Satellite,
  Shield
} from 'lucide-react';

const hotspotCategories = [
  { id: 'kidnapping', label: 'Kidnapping', color: '#ef4444', incidents: 45 },
  { id: 'burglary', label: 'Burglary', color: '#f59e0b', incidents: 128 },
  { id: 'violence', label: 'Violence', color: '#8b5cf6', incidents: 92 },
  { id: 'gbv', label: 'GBV', color: '#ec4899', incidents: 67 }
];

const intelligenceLayers = [
  {
    id: 'time-of-day',
    title: 'Time-of-day analysis',
    description: 'Night crime spikes',
    enabled: true,
    icon: Clock,
    badge: 'Layer'
  },
  {
    id: 'repeat-offense',
    title: 'Repeat-offense clusters',
    description: 'Historic patterns',
    enabled: false,
    icon: TrendingUp,
    badge: 'Layer'
  },
  {
    id: 'predictive-ai',
    title: 'Predictive AI hotspots',
    description: 'Next-week risk forecast',
    enabled: true,
    icon: AlertTriangle,
    badge: 'AI'
  }
];

const tracingTools = [
  {
    id: 'device-tracing',
    title: 'Subscriber device tracing',
    description: 'Link multiple reports to one device',
    badge: 'IMEI',
    icon: Smartphone
  },
  {
    id: 'sim-movement',
    title: 'SIM movement trail',
    description: 'Digital footprint analysis',
    badge: 'SIM',
    icon: Navigation
  },
  {
    id: 'task-force',
    title: 'Task force workspace',
    description: 'Shared dashboard for joint ops',
    badge: 'Multi‑agency',
    icon: Shield
  }
];

export function HotspotMapping() {
  const [selectedCategory, setSelectedCategory] = useState('burglary');
  const [selectedScope, setSelectedScope] = useState('community');
  const [layersEnabled, setLayersEnabled] = useState<Record<string, boolean>>({
    'time-of-day': true,
    'repeat-offense': false,
    'predictive-ai': true
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Hotspot & Risk Zone Mapping</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Interactive heatmaps • Time-of-day analysis • Predictive AI • Street→Community→LGA→State→National • Drone/satellite overlay • Safe route planning
        </p>
      </div>

      <Tabs defaultValue="heatmap" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="heatmap" className="text-xs md:text-sm">
            <MapPin className="size-3 md:size-4 mr-1 md:mr-2" />
            Heatmap
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs md:text-sm">
            <Layers className="size-3 md:size-4 mr-1 md:mr-2" />
            Intelligence Layers
          </TabsTrigger>
          <TabsTrigger value="routing" className="text-xs md:text-sm">
            <Navigation className="size-3 md:size-4 mr-1 md:mr-2" />
            Route Planning
          </TabsTrigger>
          <TabsTrigger value="tracing" className="text-xs md:text-sm">
            <Smartphone className="size-3 md:size-4 mr-1 md:mr-2" />
            Tracing & Footprints
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Heatmap Configuration</CardTitle>
                <CardDescription>Select category and geographic scope</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hotspotCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Geographic Scope</label>
                  <Select value={selectedScope} onValueChange={setSelectedScope}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Street Level</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="lga">Local Government</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Stats */}
                <div className="space-y-2 pt-3 border-t">
                  <h4 className="text-sm text-[#0C3B5C] mb-3">Category Statistics</h4>
                  {hotspotCategories.map((cat) => (
                    <div 
                      key={cat.id}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        selectedCategory === cat.id ? 'bg-green-50 border border-green-200' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="size-3 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      <Badge variant="outline">{cat.incidents}</Badge>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3">
                  <Button variant="outline" size="sm">
                    <Download className="size-4 mr-2" />
                    Printable Map
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="size-4 mr-2" />
                    Export PNG
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Heatmap Visualization */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#0C3B5C] text-base md:text-lg">
                      {hotspotCategories.find(c => c.id === selectedCategory)?.label} Heatmap
                    </CardTitle>
                    <CardDescription>
                      {selectedScope.charAt(0).toUpperCase() + selectedScope.slice(1)} level analysis
                    </CardDescription>
                  </div>
                  <Badge className="bg-[#2B7A78] text-white">
                    <Satellite className="size-3 mr-1" />
                    Live Data
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Heatmap Placeholder */}
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 via-purple-100 to-red-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden">
                  {/* Simulated Heatmap Grid */}
                  <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 gap-1 p-2">
                    {Array.from({ length: 96 }).map((_, i) => {
                      const intensity = Math.floor(Math.random() * 100);
                      const selectedCat = hotspotCategories.find(c => c.id === selectedCategory);
                      return (
                        <div
                          key={i}
                          className="rounded"
                          style={{
                            backgroundColor: selectedCat?.color,
                            opacity: intensity / 200
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  <div className="relative z-10 text-center bg-white/90 p-4 rounded-lg">
                    <MapPin className="size-12 mx-auto mb-2 text-[#0C3B5C] opacity-50" />
                    <h4 className="text-[#0C3B5C] mb-1">Interactive Heatmap</h4>
                    <p className="text-sm text-muted-foreground">
                      Heatmap layer + predictive hotspots overlay
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Intensity</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Low</span>
                    <div className="flex h-4 w-32 rounded overflow-hidden">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const selectedCat = hotspotCategories.find(c => c.id === selectedCategory);
                        return (
                          <div
                            key={i}
                            className="flex-1"
                            style={{
                              backgroundColor: selectedCat?.color,
                              opacity: (i + 1) / 5
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs">High</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2 text-sm text-amber-900">
                    <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>AI Analysis:</strong> False-report checks and cross-reference validation enabled. 
                      Follow-up questions and inter-agency requests available.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="layers" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Intelligence Overlays</CardTitle>
              <CardDescription>Add time-of-day, patterns, and AI predictions to your map</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intelligenceLayers.map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <div key={layer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-muted rounded-lg">
                          <Icon className="size-5 text-[#0C3B5C]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm text-[#0C3B5C] mb-1">{layer.title}</h4>
                          <p className="text-xs text-muted-foreground">{layer.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={layer.badge === 'AI' ? 'default' : 'outline'}>
                          {layer.badge}
                        </Badge>
                        <Button
                          variant={layersEnabled[layer.id] ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLayersEnabled({ ...layersEnabled, [layer.id]: !layersEnabled[layer.id] })}
                        >
                          {layersEnabled[layer.id] ? 'Enabled' : 'Enable'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm text-[#0C3B5C] mb-3">Layer Insights</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Time-of-day analysis shows 65% spike in incidents between 8 PM - 2 AM</li>
                  <li>Repeat-offense clusters identify 3 high-risk zones requiring intervention</li>
                  <li>AI predicts 18% increase in burglary incidents next week in Wuse II area</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Dynamic Route Planning</CardTitle>
              <CardDescription>Suggest safe patrol routes avoiding risk zones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gradient-to-br from-green-100 to-blue-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <Navigation className="size-12 mx-auto mb-3 text-[#0C3B5C] opacity-50" />
                  <h4 className="text-[#0C3B5C] mb-2">Safe Patrol Routes</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI-optimized routes avoiding high-risk zones
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                      Route A: 12.5 km • Low Risk
                    </Badge>
                    <Badge variant="outline" className="border-amber-500 text-amber-800">
                      Route B: 9.8 km • Medium Risk
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline">
                  <Navigation className="size-4 mr-2" />
                  Generate Route
                </Button>
                <Button variant="outline">
                  <Download className="size-4 mr-2" />
                  Export Route
                </Button>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm text-[#0C3B5C] mb-3">Route Optimization Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Drone/satellite feed integration for tactical operations</li>
                  <li>Real-time traffic and incident updates</li>
                  <li>Cross-border overlays for regional cooperation</li>
                  <li>Mobile-optimized turn-by-turn navigation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracing" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Tracing & Digital Footprints</CardTitle>
              <CardDescription>Device tracking and multi-agency collaboration tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tracingTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div key={tool.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="size-5 text-[#0C3B5C]" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm text-[#0C3B5C] mb-1">{tool.title}</h4>
                            <p className="text-xs text-muted-foreground">{tool.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{tool.badge}</Badge>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Open Tool
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-purple-900">
                  <Shield className="size-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Multi-Agency Task Force:</strong> Shared dashboard enables joint investigations with 
                    secure data sharing, real-time collaboration, and synchronized operations across agencies.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
