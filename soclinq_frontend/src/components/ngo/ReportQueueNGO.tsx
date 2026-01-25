import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle, 
  Phone, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle,
  ArrowUp,
  Navigation,
  Smartphone
} from 'lucide-react';

const mockReports = [
  {
    id: 1,
    title: 'Active Shooter (priority)',
    location: 'CBD',
    severity: 'critical',
    reporter: 'anonymous',
    time: 'Now',
    description: 'Armed individual reported in central business district',
    lat: 9.0579,
    lng: 7.4951
  },
  {
    id: 2,
    title: 'Flooding',
    location: 'Wuse II',
    severity: 'high',
    reporter: 'verified',
    time: '10m ago',
    description: 'Severe flooding blocking major roads',
    lat: 9.0643,
    lng: 7.4820
  },
  {
    id: 3,
    title: 'GBV distress',
    location: 'Garki',
    severity: 'high',
    reporter: 'anonymous',
    time: '28m ago',
    description: 'Domestic violence situation requiring immediate intervention',
    lat: 9.0283,
    lng: 7.4889
  },
  {
    id: 4,
    title: 'Burglary pattern',
    location: 'Nyanya',
    severity: 'medium',
    reporter: 'verified',
    time: '1h ago',
    description: 'Multiple break-ins reported in residential area',
    lat: 8.9892,
    lng: 7.5783
  }
];

export function ReportQueueNGO() {
  const [selectedReport, setSelectedReport] = useState(mockReports[0]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Report Queue & Response</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Validated reports from admin • Case details • Assignment • Escalation • Live map overlays • Real‑time roadmap direction
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Reports List */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Active Reports</CardTitle>
              <CardDescription>Priority flagged and validated incidents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full p-3 md:p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                    selectedReport.id === report.id
                      ? 'border-[#2B7A78] bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base text-[#0C3B5C] mb-1">
                        {report.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {report.time}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {report.location}
                        </span>
                        <span>•</span>
                        <span>reporter: {report.reporter}</span>
                      </div>
                    </div>
                    <Badge className={getSeverityColor(report.severity)}>
                      {report.severity === 'critical' && <ArrowUp className="size-3 mr-1" />}
                      {report.severity.toUpperCase()}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Selected Report Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[#0C3B5C] text-base md:text-lg mb-2">
                    {selectedReport.title}
                  </CardTitle>
                  <CardDescription>{selectedReport.description}</CardDescription>
                </div>
                <Badge className={getSeverityColor(selectedReport.severity)}>
                  {selectedReport.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Live Map Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="size-12 mx-auto mb-2 text-[#0C3B5C] opacity-50" />
                  <p className="text-sm text-muted-foreground mb-1">Live Interactive Map</p>
                  <p className="text-xs text-muted-foreground">
                    Lat: {selectedReport.lat}, Lng: {selectedReport.lng}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                      <Navigation className="size-3 mr-1" />
                      Real-time route active
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-[#2B7A78] hover:bg-[#2B7A78]/90">
                  <CheckCircle className="size-4 mr-2" />
                  Accept
                </Button>
                <Button variant="outline">
                  <Users className="size-4 mr-2" />
                  Assign
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
                  <ArrowUp className="size-4 mr-2" />
                  Escalate (Regional/National/Military)
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Users className="size-4 mr-2" />
                  Contact Community Leader
                </Button>
                <Button variant="outline" size="sm">
                  <Smartphone className="size-4 mr-2" />
                  Contact Nearby Devices
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="size-4 mr-2" />
                  Verify by Phone
                </Button>
                <Button variant="outline" size="sm">
                  <Navigation className="size-4 mr-2" />
                  Get Directions
                </Button>
              </div>

              {/* Case Information */}
              <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Case ID</span>
                  <span className="text-[#0C3B5C]">#{selectedReport.id.toString().padStart(6, '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-[#0C3B5C]">{selectedReport.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reporter Status</span>
                  <Badge variant={selectedReport.reporter === 'verified' ? 'default' : 'secondary'}>
                    {selectedReport.reporter}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Reported</span>
                  <span className="text-[#0C3B5C]">{selectedReport.time}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-blue-900">
                  <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Priority Alert:</strong> Critical reports auto-move to top of queue. 
                    Real-time road map direction available with options to contact nearby devices and community leaders.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
