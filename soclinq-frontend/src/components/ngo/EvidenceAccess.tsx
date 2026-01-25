import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Lock, 
  Video, 
  FileAudio, 
  Image as ImageIcon, 
  Download, 
  Eye,
  ZoomIn,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Shield,
  Clock
} from 'lucide-react';

const mockEvidence = [
  {
    id: 1,
    type: 'video',
    filename: 'Video_2025-10-01_142233.mp4',
    gps: '9.06, 7.49',
    timestamp: '14:22:33',
    deviceHash: 'hash#A2F7B9C...',
    size: '24.5 MB',
    duration: '00:02:15',
    status: 'encrypted',
    integrity: 'verified'
  },
  {
    id: 2,
    type: 'audio',
    filename: 'Audio_SOS_1092.aac',
    gps: '9.08, 7.52',
    timestamp: '15:10:45',
    deviceHash: 'hash#D3E8F1A...',
    size: '1.2 MB',
    duration: '00:00:43',
    status: 'verified',
    integrity: 'verified',
    description: 'Ambient capture'
  },
  {
    id: 3,
    type: 'image',
    filename: 'Photo_99123.jpg',
    gps: '9.05, 7.48',
    timestamp: '16:35:12',
    deviceHash: 'hash#B9C2D5E...',
    size: '3.8 MB',
    status: 'locked',
    integrity: 'verified',
    description: 'EXIF scrubbed • Timestamp locked'
  },
  {
    id: 4,
    type: 'video',
    filename: 'Video_Emergency_5521.mp4',
    gps: '9.07, 7.51',
    timestamp: '17:20:30',
    deviceHash: 'hash#F5G8H2K...',
    size: '18.3 MB',
    duration: '00:01:45',
    status: 'encrypted',
    integrity: 'pending'
  }
];

const chainOfCustody = [
  { stage: 'Submission', timestamp: '2025-10-01 14:22:35', user: 'Reporter Device #A2F7B9C', action: 'Evidence submitted via secure channel' },
  { stage: 'Validation', timestamp: '2025-10-01 14:23:10', user: 'Auto-Validator System', action: 'Integrity check passed • Encryption applied' },
  { stage: 'Admin Review', timestamp: '2025-10-01 14:25:40', user: 'Admin Officer #12458', action: 'Case validated and routed to NGO dashboard' },
  { stage: 'NGO Access', timestamp: '2025-10-01 14:30:15', user: 'UNICEF Nigeria - Sarah Johnson', action: 'Evidence accessed for analysis' }
];

export function EvidenceAccess() {
  const [selectedEvidence, setSelectedEvidence] = useState(mockEvidence[0]);
  const [showForensics, setShowForensics] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="size-5 text-purple-600" />;
      case 'audio':
        return <FileAudio className="size-5 text-blue-600" />;
      case 'image':
        return <ImageIcon className="size-5 text-green-600" />;
      default:
        return <FileCheck className="size-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'encrypted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'locked':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Access to Submitted Evidence</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Raw time‑bound encrypted media • Metadata tracking • Chain‑of‑custody • Forensics • Secure requests • Restricted export
        </p>
      </div>

      <Tabs defaultValue="evidence" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="evidence" className="text-xs md:text-sm">
            <Lock className="size-3 md:size-4 mr-1 md:mr-2" />
            Evidence Files
          </TabsTrigger>
          <TabsTrigger value="forensics" className="text-xs md:text-sm">
            <ZoomIn className="size-3 md:size-4 mr-1 md:mr-2" />
            Forensics
          </TabsTrigger>
          <TabsTrigger value="custody" className="text-xs md:text-sm">
            <Shield className="size-3 md:size-4 mr-1 md:mr-2" />
            Chain of Custody
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evidence" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Evidence List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Evidence Repository</CardTitle>
                <CardDescription>Encrypted media files with metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockEvidence.map((evidence) => (
                  <button
                    key={evidence.id}
                    onClick={() => setSelectedEvidence(evidence)}
                    className={`w-full p-3 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                      selectedEvidence.id === evidence.id
                        ? 'border-[#2B7A78] bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                        {getTypeIcon(evidence.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm text-[#0C3B5C] mb-1 truncate">
                          {evidence.filename}
                        </h4>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>GPS: {evidence.gps} • {evidence.timestamp}</div>
                          <div>Device: {evidence.deviceHash}</div>
                          {evidence.description && <div>{evidence.description}</div>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(evidence.status)}>
                            {evidence.status}
                          </Badge>
                          {evidence.integrity === 'verified' && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle className="size-3 mr-1" />
                              Integrity OK
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                <div className="pt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="size-4 mr-2" />
                    Request Missing Media
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileCheck className="size-4 mr-2" />
                    Bulk Actions
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selected Evidence Details */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-[#0C3B5C] text-base md:text-lg">
                        {selectedEvidence.filename}
                      </CardTitle>
                      <CardDescription>
                        {selectedEvidence.type.charAt(0).toUpperCase() + selectedEvidence.type.slice(1)} File
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(selectedEvidence.status)}>
                      {selectedEvidence.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      {getTypeIcon(selectedEvidence.type)}
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedEvidence.type === 'video' ? 'Video Preview' : 
                         selectedEvidence.type === 'audio' ? 'Audio Waveform' : 
                         'Image Preview'}
                      </p>
                      {selectedEvidence.duration && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Duration: {selectedEvidence.duration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GPS Coordinates</span>
                      <span className="text-[#0C3B5C]">{selectedEvidence.gps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="text-[#0C3B5C]">{selectedEvidence.timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Device Hash</span>
                      <span className="text-[#0C3B5C] font-mono text-xs">{selectedEvidence.deviceHash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size</span>
                      <span className="text-[#0C3B5C]">{selectedEvidence.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Integrity Hash</span>
                      <Badge variant={selectedEvidence.integrity === 'verified' ? 'default' : 'secondary'}>
                        {selectedEvidence.integrity}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => setShowForensics(true)}
                      className="bg-[#0C3B5C] hover:bg-[#0C3B5C]/90"
                    >
                      <ZoomIn className="size-4 mr-2" />
                      Open Forensics Viewer
                    </Button>
                    <Button variant="outline">
                      <Eye className="size-4 mr-2" />
                      Full Screen
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Lock className="size-4 mr-2" />
                      Log Access
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="size-4 mr-2" />
                      Request Export
                    </Button>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2 text-sm text-amber-900">
                      <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Restricted Export:</strong> Only authorized investigators can export media with logged approval.
                        All downloads are tracked in the audit trail.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="forensics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Forensic Analysis Tools</CardTitle>
              <CardDescription>Frame-by-frame analysis • Zoom • Authenticity verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <ZoomIn className="size-12 mx-auto mb-3 text-[#0C3B5C] opacity-50" />
                  <h4 className="text-[#0C3B5C] mb-2">Forensics Viewer</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Frame-by-frame playback • Zoom up to 800% • Authenticity checks
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                      <CheckCircle className="size-3 mr-1" />
                      EXIF Verified
                    </Badge>
                    <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                      <CheckCircle className="size-3 mr-1" />
                      No Manipulation
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" size="sm">Frame Back</Button>
                <Button variant="outline" size="sm">Frame Forward</Button>
                <Button variant="outline" size="sm">Zoom In</Button>
                <Button variant="outline" size="sm">Zoom Out</Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm text-[#0C3B5C] mb-3">Authenticity Checks</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Metadata Integrity</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="size-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Timestamp Consistency</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="size-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Device Signature</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="size-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Manipulation Detection</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="size-3 mr-1" />
                      Clean
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custody" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Chain of Custody Log</CardTitle>
              <CardDescription>Complete audit trail: submission → validation → access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chainOfCustody.map((entry, index) => (
                  <div key={index} className="relative pl-8 pb-4 border-l-2 border-[#2B7A78] last:border-l-0">
                    <div className="absolute -left-2 top-0 size-4 rounded-full bg-[#2B7A78] border-2 border-white" />
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm text-[#0C3B5C]">{entry.stage}</h4>
                        <p className="text-xs text-muted-foreground">{entry.user}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {entry.timestamp}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.action}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-green-900">
                  <Shield className="size-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Custody Protection:</strong> Every access, download, and modification is logged with timestamp, 
                    user identity, and IP address. Evidence integrity is verified at each stage.
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
