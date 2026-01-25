import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  Download, 
  Lightbulb, 
  Megaphone, 
  FileBarChart, 
  Shield,
  AlertTriangle,
  Lock,
  MapPin,
  Search,
  ArrowRight,
  Globe,
  Users,
  Clock,
  CheckCircle,
  BarChart3,
  Activity
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

const recentActivities = [
  { id: 1, type: 'analysis', title: 'GBV Analysis Completed', time: '5 minutes ago', status: 'completed' },
  { id: 2, type: 'campaign', title: 'New Campaign Published', time: '1 hour ago', status: 'active' },
  { id: 3, type: 'report', title: 'Monthly Report Downloaded', time: '2 hours ago', status: 'completed' },
  { id: 4, type: 'alert', title: 'High Priority Alert', time: '3 hours ago', status: 'critical' }
];

const quickStats = [
  { label: 'Active Reports', value: '24', trend: '+12%', icon: FileBarChart, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { label: 'Pending Analysis', value: '8', trend: '-5%', icon: BarChart3, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { label: 'Active Campaigns', value: '15', trend: '+8%', icon: Megaphone, color: 'text-green-600', bgColor: 'bg-green-50' },
  { label: 'Critical Alerts', value: '3', trend: '+2', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' }
];

const quickAccessCards = [
  {
    id: 'trends',
    title: 'Anonymized Trends',
    description: 'View real-time data insights',
    icon: TrendingUp,
    badge: 'Live',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'analysis',
    title: 'Request Analysis',
    description: 'Generate custom reports',
    icon: FileBarChart,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'engage',
    title: 'Campaigns',
    description: 'Manage community engagement',
    icon: Megaphone,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'queue',
    title: 'Report Queue',
    description: 'Review pending cases',
    icon: AlertTriangle,
    badge: '3 New',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'insights',
    title: 'Program Insights',
    description: 'Policy design tools',
    icon: Lightbulb,
    color: 'from-yellow-500 to-amber-500'
  },
  {
    id: 'hotspots',
    title: 'Hotspot Mapping',
    description: 'Risk zone analysis',
    icon: MapPin,
    color: 'from-indigo-500 to-blue-500'
  }
];

export function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#0C3B5C] via-[#2B7A78] to-[#0C3B5C] rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Welcome back to Linqmi NGO</h1>
            <p className="text-sm md:text-base text-white/80">
              Your humanitarian intelligence dashboard • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Activity className="size-12 md:size-16 opacity-50 hidden md:block" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="size-4 md:size-5" />
                  <span className="text-xs md:text-sm">{stat.label}</span>
                </div>
                <div className="text-xl md:text-2xl mb-1">{stat.value}</div>
                <div className="text-xs text-white/70">{stat.trend} today</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access Cards */}
      <div>
        <h2 className="text-[#0C3B5C] mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className="group relative bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#2B7A78] text-left overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                      <Icon className="size-6 text-white" />
                    </div>
                    {card.badge && (
                      <Badge className="bg-[#E8B339] text-[#0C3B5C]">
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-[#0C3B5C] mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{card.description}</p>
                  
                  <div className="flex items-center gap-2 text-[#2B7A78] text-sm group-hover:gap-3 transition-all">
                    <span>Open</span>
                    <ArrowRight className="size-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#0C3B5C] flex items-center gap-2">
              <Clock className="size-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates from your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'completed' ? 'bg-green-100' :
                    activity.status === 'active' ? 'bg-blue-100' :
                    'bg-red-100'
                  }`}>
                    {activity.status === 'completed' && <CheckCircle className="size-4 text-green-600" />}
                    {activity.status === 'active' && <Activity className="size-4 text-blue-600" />}
                    {activity.status === 'critical' && <AlertTriangle className="size-4 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm text-[#0C3B5C]">{activity.title}</h4>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant="outline">View</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#0C3B5C] flex items-center gap-2">
              <Shield className="size-5" />
              System Status
            </CardTitle>
            <CardDescription>Security & compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-green-600" />
                <span className="text-sm">Data Encryption</span>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-green-600" />
                <span className="text-sm">Anonymization</span>
              </div>
              <Badge className="bg-green-100 text-green-800">100%</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-blue-600" />
                <span className="text-sm">API Status</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Online</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-purple-600" />
                <span className="text-sm">Active Users</span>
              </div>
              <Badge className="bg-purple-100 text-purple-800">47</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
