import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendData } from '../../types/ngo';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Filter, TrendingUp, Users, MapPin } from 'lucide-react';

interface TrendDataViewerProps {
  data: TrendData[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'gender-based-violence': '#ef4444',
  'youth-crime': '#f59e0b',
  'disaster-alerts': '#3b82f6',
  'trafficking': '#8b5cf6',
  'child-abuse': '#ec4899',
  'armed-robbery': '#6366f1'
};

const CATEGORY_LABELS: Record<string, string> = {
  'gender-based-violence': 'Gender-Based Violence',
  'youth-crime': 'Youth Crime',
  'disaster-alerts': 'Disaster Alerts',
  'trafficking': 'Human Trafficking',
  'child-abuse': 'Child Abuse',
  'armed-robbery': 'Armed Robbery'
};

export function TrendDataViewer({ data }: TrendDataViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');

  const filteredData = data.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedRegion !== 'all' && item.state !== selectedRegion) return false;
    if (selectedGender !== 'all' && item.demographics.gender !== selectedGender) return false;
    if (selectedAgeGroup !== 'all' && item.demographics.ageGroup !== selectedAgeGroup) return false;
    return true;
  });

  const categoryStats = Object.entries(
    filteredData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.incidents;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, incidents]) => ({
    category: CATEGORY_LABELS[category] || category,
    incidents,
    color: CATEGORY_COLORS[category]
  }));

  const totalIncidents = filteredData.reduce((sum, item) => sum + item.incidents, 0);

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-blue-600 mb-2">Anonymized Trend Data</h2>
        <p className="text-muted-foreground">
          High-level statistics and insights without exposing individual identities
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-5" />
            Data Filters
          </CardTitle>
          <CardDescription>
            Filter data by category, region, demographics, and time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block mb-2">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="gender-based-violence">Gender-Based Violence</SelectItem>
                  <SelectItem value="youth-crime">Youth Crime</SelectItem>
                  <SelectItem value="disaster-alerts">Disaster Alerts</SelectItem>
                  <SelectItem value="trafficking">Human Trafficking</SelectItem>
                  <SelectItem value="child-abuse">Child Abuse</SelectItem>
                  <SelectItem value="armed-robbery">Armed Robbery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Lagos">Lagos State</SelectItem>
                  <SelectItem value="Ogun">Ogun State</SelectItem>
                  <SelectItem value="Oyo">Oyo State</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2">Gender</label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2">Age Group</label>
              <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="0-17">0-17 years</SelectItem>
                  <SelectItem value="18-24">18-24 years</SelectItem>
                  <SelectItem value="25-34">25-34 years</SelectItem>
                  <SelectItem value="35-49">35-49 years</SelectItem>
                  <SelectItem value="50+">50+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedRegion('all');
                setSelectedGender('all');
                setSelectedAgeGroup('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Incidents</CardDescription>
            <CardTitle className="text-blue-600">{totalIncidents}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="size-4" />
              <span>Q4 2024</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-blue-600">{categoryStats.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Active categories</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Regions Covered</CardDescription>
            <CardTitle className="text-blue-600">{new Set(filteredData.map(d => d.state)).size}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              <span>States</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Communities</CardDescription>
            <CardTitle className="text-blue-600">{new Set(filteredData.map(d => d.community)).size}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="size-4" />
              <span>Local areas</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Incidents by Category</CardTitle>
            <CardDescription>Distribution of incident types</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidents" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Category Distribution</CardTitle>
            <CardDescription>Proportion of incidents by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  dataKey="incidents"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Benchmark Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">Benchmark Comparison</CardTitle>
          <CardDescription>Compare selected region against state and national averages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="mb-1">Regional Average</div>
                <div className="text-muted-foreground">Lagos State</div>
              </div>
              <div className="text-right">
                <div className="text-blue-600">23.5 incidents/month</div>
                <Badge variant="outline" className="mt-1">Baseline</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="mb-1">National Average</div>
                <div className="text-muted-foreground">Nigeria</div>
              </div>
              <div className="text-right">
                <div className="text-blue-600">18.2 incidents/month</div>
                <Badge variant="secondary" className="mt-1">-22% vs Regional</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="mb-1">Global Average</div>
                <div className="text-muted-foreground">West Africa Region</div>
              </div>
              <div className="text-right">
                <div className="text-blue-600">21.8 incidents/month</div>
                <Badge variant="secondary" className="mt-1">-7% vs Regional</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
