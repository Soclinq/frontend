"use client";

import { useState } from 'react';
import { HomeView } from '@/components/ngo/HomeView';
import { SettingsView } from '@/components/ngo/SettingsView';
import { TrendDataViewer } from '@/components/ngo/TrendDataViewer';
import { ReportDownloads } from '@/components/ngo/ReportDownloads';
import { ProgramInsights } from '@/components/ngo/ProgramInsights';
import { EngagementTools } from '@/components/ngo/EngagementTools';
import { AnalysisRequest } from '@/components/ngo/AnalysisRequest';
import { ComplianceAudit } from '@/components/ngo/ComplianceAudit';
import { ReportQueueNGO } from '@/components/ngo/ReportQueueNGO';
import { EvidenceAccess } from '@/components/ngo/EvidenceAccess';
import { HotspotMapping } from '@/components/ngo/HotspotMapping';
import { InvestigatorToolkit } from '@/components/ngo/InvestigatorToolkit';
import { 
  mockTrendData, 
  mockReportDownloads, 
  mockCampaigns,
  mockAnalysisRequests,
  mockAuditLogs
} from '../../lib/ngoMockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    MdHome,
    MdTrendingUp,
    MdDownload,
    MdLightbulb,
    MdCampaign,
    MdBarChart,
    MdShield,
    MdMenu,
    MdClose,
    MdPublic,
    MdPeople,
    MdWarning,
    MdLock,
    MdLocationOn,
    MdSearch,
    MdSettings,
    MdNotifications,
    MdFilterList,
    MdCalendarToday,
    MdPerson,
    MdCheckCircle,
    MdOutlinePublic,
  } from "react-icons/md";
  

  import "./page.css"
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(3);

  const navItems = [
    { id: 'home', label: 'Home', icon: MdHome },
    { id: 'trends', label: 'Anonymized Trends', icon: MdTrendingUp, badge: 'Live' },
    { id: 'downloads', label: 'Report Downloads', icon: MdDownload },
    { id: 'insights', label: 'Program Insights', icon: MdLightbulb },
    { id: 'engage', label: 'Engagement Tools', icon: MdCampaign },
    { id: 'analysis', label: 'Analysis', icon: MdBarChart },
    { id: 'queue', label: 'Report Queue', icon: MdWarning },
    { id: 'evidence', label: 'Evidence Access', icon: MdLock },
    { id: 'hotspots', label: 'Hotspot & Risk Zones', icon: MdLocationOn },
    { id: 'toolkit', label: 'Investigator Toolkit', icon: MdSearch },
    { id: 'compliance', label: 'Compliance', icon: MdShield },
    { id: 'settings', label: 'Settings', icon: MdSettings },
  ];
  

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView onNavigate={setActiveTab} />;
      case 'settings':
        return <SettingsView />;
      case 'trends':
        return <TrendDataViewer data={mockTrendData} />;
      case 'downloads':
        return <ReportDownloads reports={mockReportDownloads} />;
      case 'insights':
        return <ProgramInsights />;
      case 'engage':
        return <EngagementTools campaigns={mockCampaigns} />;
      case 'analysis':
        return <AnalysisRequest requests={mockAnalysisRequests} />;
      case 'queue':
        return <ReportQueueNGO />;
      case 'evidence':
        return <EvidenceAccess />;
      case 'hotspots':
        return <HotspotMapping />;
      case 'toolkit':
        return <InvestigatorToolkit />;
      case 'compliance':
        return <ComplianceAudit auditLogs={mockAuditLogs} />;
      default:
        return <HomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-gray-900 via-[#0C3B5C] to-gray-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:block w-64 bg-gradient-to-b from-[#0C3B5C] via-[#0d2f47] to-[#0C3B5C] border-r border-white/10 sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d084] via-[#2B7A78] to-[#E8B339] flex items-center justify-center text-white font-black text-lg shadow-lg">
              LM
            </div>
            <div>
              <h1 className="text-white text-sm leading-tight">Linqmi — NGO Console</h1>
              <p className="text-[#E8B339] text-xs">Anonymized insights • Zero PII</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 sidebar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-[#2B7A78] to-[#1a5855] text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="size-4 flex-shrink-0" />
                <span className="text-sm flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <Badge className="bg-[#E8B339] text-[#0C3B5C] text-xs px-2 py-0">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      
      <div className="md:hidden bg-gradient-to-r from-[#0C3B5C] to-[#2B7A78] text-white sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d084] via-[#2B7A78] to-[#E8B339] flex items-center justify-center text-white font-black text-sm">
              LM
            </div>
            <div>
              <h1 className="text-white text-sm leading-tight">Linqmi NGO</h1>
              <p className="text-[#E8B339] text-xs">Zero PII</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <MdClose className="size-5" /> : <MdMenu className="size-5" />}
          </Button>
        </div>


      </div>

      {isMobileMenuOpen && (
          <div className="bg-[#0C3B5C] border-t border-white/10 max-h-[70vh] overflow-y-auto">

            <div className='p-2 sidebar'>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-lg transition-all ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-[#2B7A78] to-[#1a5855] text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="size-4 flex-shrink-0" />
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge className="bg-[#E8B339] text-[#0C3B5C] text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}


              {/* Mobile Menu */}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-[#0C3B5C]/95 via-[#2B7A78]/95 to-[#0C3B5C]/95 backdrop-blur-lg border-b border-white/10 sticky top-0 md:top-0 z-40">
          <div className="px-4 md:px-6 py-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-gradient-to-r from-[#2B7A78] to-[#1a5855] text-white border-0">
                  Access: Partner Deep‑Dive
                </Badge>
                <Badge className="bg-white/10 text-white border-white/20">
                  Region: FCT
                </Badge>
                <Badge className="bg-white/10 text-white border-white/20 hidden sm:inline-flex">
                  Category: All
                </Badge>
                <Badge className="bg-white/10 text-white border-white/20 hidden lg:inline-flex">
                  Period: Last 30 days
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* Quick Access Icons */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 relative hidden md:inline-flex"
                  title="Filters"
                >
                  <MdFilterList size={16} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 relative hidden md:inline-flex"
                  title="Calendar"
                >
                  <MdCalendarToday size={16} />
                </Button>

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10 relative"
                    onClick={() => setShowNotifications(!showNotifications)}
                    title="Alerts & Notifications"
                  >
                    <MdNotifications size={16} />
                    {unreadAlerts > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full size-5 flex items-center justify-center">
                        {unreadAlerts}
                      </span>
                    )}
                  </Button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                      <div className="bg-gradient-to-r from-[#0C3B5C] to-[#2B7A78] p-3 text-white">
                        <h4 className="text-sm">Notifications</h4>
                        <p className="text-xs text-white/80">{unreadAlerts} unread alerts</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <MdWarning className="size-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="text-sm text-[#0C3B5C]">Critical Alert: Active Shooter</h5>
                              <p className="text-xs text-muted-foreground">CBD area - Immediate action required</p>
                              <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <MdCheckCircle className="size-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="text-sm text-[#0C3B5C]">Analysis Complete</h5>
                              <p className="text-xs text-muted-foreground">GBV report ready for review</p>
                              <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <MdDownload className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="text-sm text-[#0C3B5C]">Report Downloaded</h5>
                              <p className="text-xs text-muted-foreground">Monthly summary exported</p>
                              <p className="text-xs text-muted-foreground mt-1">3 hours ago</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 bg-muted border-t">
                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowNotifications(false)}>
                          View All Notifications
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                  <MdLock className="size-3 text-[#E8B339]" />
                  <span className="text-white text-xs">Strict anonymization</span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-full"
                  onClick={() => setActiveTab('settings')}
                  title="User Profile"
                >
                  <MdPerson size={16} />
                </Button>

                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-[#E8B339] to-[#d4a033] text-[#0C3B5C] hover:from-[#d4a033] hover:to-[#E8B339] border-0"
                >
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Strip - Always Visible */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-b">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 p-4 md:p-6">
            <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MdOutlinePublic size={12} className="size-5 md:size-6 text-[#0C3B5C]" />
              </div>
              <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">
                {mockTrendData.reduce((sum, d) => sum + d.incidents, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Incidents (aggregated)</div>
              <div className="text-xs text-[#2B7A78] mt-1">+8% this period</div>
            </div>

            <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MdWarning size={12} className="size-5 md:size-6 text-amber-600" />
              </div>
              <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">410</div>
              <div className="text-xs text-muted-foreground">SOS Triggers</div>
              <div className="text-xs text-[#2B7A78] mt-1">+12% this period</div>
            </div>

            <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MdPeople size={12} className="size-5 md:size-6 text-purple-600" />
              </div>
              <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">27%</div>
              <div className="text-xs text-muted-foreground">GBV Share</div>
              <div className="text-xs text-green-600 mt-1">-2% this period</div>
            </div>

            <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MdCampaign size={12} className="size-5 md:size-6 text-[#2B7A78]" />
              </div>
              <div className="text-xl md:text-2xl text-[#0C3B5C] mb-1">15</div>
              <div className="text-xs text-muted-foreground">Active Campaigns</div>
              <div className="text-xs text-muted-foreground mt-1">Public + Partner</div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="bg-white border-t px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <MdShield className="size-3 text-[#2B7A78]" />
                Donor templates: UNHCR • UNICEF • World Bank • EU
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#2B7A78] text-[#2B7A78]">
                <MdLock className="size-3 mr-1" />
                100% Anonymized
              </Badge>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
