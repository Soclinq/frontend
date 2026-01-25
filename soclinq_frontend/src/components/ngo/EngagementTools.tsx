import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Campaign } from '../../types/ngo';
import { 
  Megaphone, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Users, 
  Send,
  CheckCircle,
  Clock,
  Eye,
  Globe,
  MessageSquare,
  FileBarChart,
  BookOpen
} from 'lucide-react';

interface EngagementToolsProps {
  campaigns: Campaign[];
}

const CAMPAIGN_TYPES = {
  'trafficking': { label: 'Human Trafficking Awareness', color: 'bg-purple-100 text-purple-800', icon: '🚨' },
  'gbv-prevention': { label: 'GBV Prevention', color: 'bg-red-100 text-red-800', icon: '🛡️' },
  'disaster-preparedness': { label: 'Disaster Preparedness', color: 'bg-blue-100 text-blue-800', icon: '⚠️' },
  'child-safety': { label: 'Child Safety', color: 'bg-amber-100 text-amber-800', icon: '👶' }
};

const resourceLibrary = [
  { id: 1, title: 'GBV Response Guidelines', type: 'Guide', downloads: 1240, date: '2024-12-15' },
  { id: 2, title: 'Trafficking Prevention Infographic', type: 'Infographic', downloads: 856, date: '2024-11-20' },
  { id: 3, title: 'Disaster Preparedness Checklist', type: 'Guide', downloads: 2100, date: '2024-10-10' },
  { id: 4, title: 'Child Safety Policy Brief', type: 'Policy Brief', downloads: 645, date: '2024-09-05' }
];

const impactStories = [
  {
    id: 1,
    community: 'Garki Community',
    title: 'GBV Safe Space Impact',
    story: 'Since the establishment of the safe space, we have seen a 40% reduction in domestic violence incidents.',
    author: 'Community Leader - Mrs. Aisha Mohammed',
    date: '2025-01-05'
  },
  {
    id: 2,
    community: 'Wuse II Ward',
    title: 'Youth Employment Success',
    story: 'The employment program has engaged 150 at-risk youth, significantly reducing gang-related activities.',
    author: 'Youth Coordinator - Mr. John Okafor',
    date: '2025-01-03'
  }
];

export function EngagementTools({ campaigns }: EngagementToolsProps) {
  const [distributeToHubs, setDistributeToHubs] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('nigeria');
  const [selectedState, setSelectedState] = useState('fct');

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Engagement Tools</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Publish campaigns • Community distribution • Feedback channels • Multi-agency collaboration • Resource library
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Megaphone className="size-6 md:size-8 text-blue-600" />
            </div>
            <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">
              {campaigns.filter(c => c.status === 'published').length}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Active Campaigns</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="size-6 md:size-8 text-[#2B7A78]" />
            </div>
            <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">
              {campaigns.filter(c => c.status === 'published').reduce((sum, c) => sum + c.reach, 0).toLocaleString()}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">Total Reach</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="size-6 md:size-8 text-purple-600" />
            </div>
            <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">{resourceLibrary.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Resources Shared</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="size-6 md:size-8 text-[#E8B339]" />
            </div>
            <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">{impactStories.length}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Impact Stories</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="campaigns" className="text-xs md:text-sm">
            <Megaphone className="size-3 md:size-4 mr-1 md:mr-2" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="request" className="text-xs md:text-sm">
            <FileBarChart className="size-3 md:size-4 mr-1 md:mr-2" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs md:text-sm">
            <MessageSquare className="size-3 md:size-4 mr-1 md:mr-2" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="resources" className="text-xs md:text-sm">
            <BookOpen className="size-3 md:size-4 mr-1 md:mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Create New Campaign */}
            <Card className="border-[#0C3B5C]/20">
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] flex items-center gap-2 text-base md:text-lg">
                  <Megaphone className="size-5" />
                  Publish Safety Campaign
                </CardTitle>
                <CardDescription>Create and distribute educational content to communities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Campaign Title</label>
                  <Input placeholder="e.g., Stop Gender-Based Violence" />
                </div>

                <div>
                  <label className="block text-sm mb-2">Campaign Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trafficking">Human Trafficking Awareness</SelectItem>
                      <SelectItem value="gbv-prevention">GBV Prevention</SelectItem>
                      <SelectItem value="disaster-preparedness">Disaster Preparedness</SelectItem>
                      <SelectItem value="child-safety">Child Safety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Message / Description</label>
                  <Textarea 
                    placeholder="Short description and key message for the campaign..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="size-4" />
                    Guide
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ImageIcon className="size-4" />
                    Image
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="size-4" />
                    Brief
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-[#2B7A78]" />
                    <span className="text-sm">Distribute to Community Hubs</span>
                  </div>
                  <Switch checked={distributeToHubs} onCheckedChange={setDistributeToHubs} />
                </div>

                <Button className="w-full bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                  <Send className="size-4 mr-2" />
                  Publish Campaign
                </Button>
              </CardContent>
            </Card>

            {/* Active Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Active Campaigns</CardTitle>
                <CardDescription>Published campaigns and their reach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-3 md:p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm md:text-base text-[#0C3B5C] mb-1">{campaign.title}</h4>
                          <Badge className={CAMPAIGN_TYPES[campaign.type].color}>
                            {CAMPAIGN_TYPES[campaign.type].icon} {CAMPAIGN_TYPES[campaign.type].label}
                          </Badge>
                        </div>
                        <Badge variant={campaign.status === 'published' ? 'default' : 'secondary'}>
                          {campaign.status === 'published' ? <CheckCircle className="size-3 mr-1" /> : <Clock className="size-3 mr-1" />}
                          {campaign.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs md:text-sm">
                        <div>
                          <div className="text-muted-foreground">Reach</div>
                          <div className="text-[#2B7A78]">{campaign.reach.toLocaleString()} people</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Regions</div>
                          <div className="text-[#0C3B5C]">{campaign.targetRegions.length} states</div>
                        </div>
                      </div>

                      {campaign.publishedDate && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Published: {new Date(campaign.publishedDate).toLocaleDateString()}
                        </div>
                      )}

                      <Button variant="outline" size="sm" className="w-full mt-3">
                        <Eye className="size-3 mr-2" />
                        View Analytics
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="request" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Request Community-Level Report</CardTitle>
              <CardDescription>Request reports from community hubs for monitoring & evaluation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      <SelectItem value="fct">FCT</SelectItem>
                      <SelectItem value="lagos">Lagos</SelectItem>
                      <SelectItem value="benue">Benue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Local Government</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select LGA" />
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ward" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ward-a">Ward A</SelectItem>
                      <SelectItem value="ward-b">Ward B</SelectItem>
                      <SelectItem value="ward-c">Ward C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Purpose of Request / M&E Notes</label>
                <Textarea 
                  placeholder="Describe the purpose of this data request and how it will be used for monitoring and evaluation..."
                  rows={4}
                />
              </div>

              <Button className="w-full bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                <Send className="size-4 mr-2" />
                Send Request
              </Button>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <CheckCircle className="size-4" />
                  <span>Communities can reply with impact stories and needs assessments</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Community Feedback & Impact Stories</CardTitle>
              <CardDescription>Responses and success stories from communities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {impactStories.map((story) => (
                  <div key={story.id} className="p-4 border-l-4 border-[#2B7A78] bg-gradient-to-r from-green-50 to-white rounded-r-lg">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="text-base md:text-lg text-[#0C3B5C]">{story.title}</h4>
                        <div className="text-sm text-muted-foreground">{story.community}</div>
                      </div>
                      <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                        Impact Story
                      </Badge>
                    </div>
                    
                    <p className="text-sm md:text-base text-muted-foreground mb-3 italic">
                      "{story.story}"
                    </p>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div>— {story.author}</div>
                      <div>{new Date(story.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4">
                View All Feedback ({impactStories.length + 12} more)
              </Button>
            </CardContent>
          </Card>

          {/* Collaboration Board */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Cross-Agency Collaboration Board</CardTitle>
              <CardDescription>Co-design joint interventions with NGOs and ministries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border-2 border-dashed rounded-lg text-center">
                <Users className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h4 className="text-[#0C3B5C] mb-2">Collaboration Workspace</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect with partner organizations to plan joint interventions
                </p>
                <Button className="bg-[#2B7A78] hover:bg-[#2B7A78]/90">
                  Open Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C] text-base md:text-lg">Resource Library</CardTitle>
              <CardDescription>Upload and share guides, infographics, and policy briefs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border-2 border-dashed rounded-lg">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <Upload className="size-8 text-muted-foreground" />
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-sm md:text-base text-[#0C3B5C] mb-1">Upload New Resource</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Share educational materials with community hubs
                    </p>
                  </div>
                  <Button className="bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                    <Upload className="size-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {resourceLibrary.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileText className="size-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm md:text-base text-[#0C3B5C] truncate">{resource.title}</h4>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline">{resource.type}</Badge>
                          <span>{resource.downloads} downloads</span>
                          <span>•</span>
                          <span>{new Date(resource.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
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
