import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  User, 
  Bell, 
  Lock, 
  Globe, 
  Palette,
  Shield,
  Key,
  Download,
  Mail,
  Clock,
  CheckCircle,
  Settings as SettingsIcon
} from 'lucide-react';

export function SettingsView() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div>
        <h2 className="text-[#0C3B5C] mb-2">Settings & Preferences</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your account, notifications, and system preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="profile" className="text-xs md:text-sm">
            <User className="size-3 md:size-4 mr-1 md:mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">
            <Bell className="size-3 md:size-4 mr-1 md:mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs md:text-sm">
            <Lock className="size-3 md:size-4 mr-1 md:mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs md:text-sm">
            <SettingsIcon className="size-3 md:size-4 mr-1 md:mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs md:text-sm">
            <Key className="size-3 md:size-4 mr-1 md:mr-2" />
            API Access
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C]">Profile Information</CardTitle>
              <CardDescription>Update your account details and organization info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" defaultValue="Sarah Johnson" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="sarah@unicef.org" defaultValue="sarah.johnson@unicef.org" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Input id="organization" placeholder="UNICEF Nigeria" defaultValue="UNICEF Nigeria" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select defaultValue="analyst">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst">Data Analyst</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="manager">Program Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-level">Access Level</Label>
                <Select defaultValue="partner">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public Summary</SelectItem>
                    <SelectItem value="partner">Partner Deep-Dive</SelectItem>
                    <SelectItem value="donor">Donor Extended Dataset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C]">Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-[#0C3B5C]" />
                    <Label htmlFor="email-notif">Email Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Receive email updates for important events</p>
                </div>
                <Switch id="email-notif" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-[#0C3B5C]" />
                    <Label htmlFor="push-notif">Push Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Get real-time alerts in your browser</p>
                </div>
                <Switch id="push-notif" checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Download className="size-4 text-[#0C3B5C]" />
                    <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Automated weekly summary emails</p>
                </div>
                <Switch id="weekly-reports" checked={weeklyReports} onCheckedChange={setWeeklyReports} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-red-600" />
                    <Label htmlFor="critical-alerts">Critical Alerts</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Immediate notifications for critical incidents</p>
                </div>
                <Switch id="critical-alerts" checked={criticalAlerts} onCheckedChange={setCriticalAlerts} />
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm text-[#0C3B5C] mb-3">Alert Frequency</h4>
                <Select defaultValue="immediate">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C]">Security Settings</CardTitle>
              <CardDescription>Manage your account security and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>

              <Button className="bg-[#0C3B5C] hover:bg-[#0C3B5C]/90">
                Update Password
              </Button>

              <div className="pt-6 border-t space-y-4">
                <h4 className="text-sm text-[#0C3B5C]">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="size-5 text-green-600" />
                    <div>
                      <p className="text-sm text-[#0C3B5C]">2FA Enabled</p>
                      <p className="text-xs text-muted-foreground">Extra security for your account</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <h4 className="text-sm text-[#0C3B5C]">Active Sessions</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-[#0C3B5C]">Current Session</p>
                      <p className="text-xs text-muted-foreground">Chrome on Windows • Nigeria</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C]">System Preferences</CardTitle>
              <CardDescription>Customize your dashboard experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="wat">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wat">WAT (West Africa Time)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">EST</SelectItem>
                    <SelectItem value="gmt">GMT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select defaultValue="mdy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Palette className="size-4 text-[#0C3B5C]" />
                    <Label>Dark Mode</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Enable dark theme</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-[#0C3B5C]" />
                    <Label>Compact View</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Show more data on screen</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0C3B5C]">API Access</CardTitle>
              <CardDescription>Manage API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-blue-900">
                  <Shield className="size-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Secure API Access:</strong> Use these keys to integrate Linqmi data with your 
                    external dashboards, government systems, or donor platforms.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm text-[#0C3B5C] mb-1">Production API Key</h4>
                    <p className="text-xs text-muted-foreground font-mono">api_linqmi_prod_xxxxxxxxxxxxx</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Copy</Button>
                    <Button variant="outline" size="sm">Rotate</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-sm text-[#0C3B5C] mb-1">Test API Key</h4>
                    <p className="text-xs text-muted-foreground font-mono">api_linqmi_test_xxxxxxxxxxxxx</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Copy</Button>
                    <Button variant="outline" size="sm">Rotate</Button>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-[#2B7A78] hover:bg-[#2B7A78]/90">
                <Key className="size-4 mr-2" />
                Generate New API Key
              </Button>

              <div className="pt-4 border-t">
                <h4 className="text-sm text-[#0C3B5C] mb-3">API Documentation</h4>
                <Button variant="outline" className="w-full">
                  View API Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
