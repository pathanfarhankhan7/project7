'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Crown, Bell, Download, Trash2, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { Subscription, UserPlan } from '@/lib/types';

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setSubscription(subData as unknown as Subscription);

      const { count: ac } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setAnalysisCount(ac || 0);

      const { count: rc } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setReportCount(rc || 0);
    }
    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      await refreshProfile();
      toast.success('Profile updated');
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    const { data: analyses } = await supabase
      .from('analyses')
      .select(`*, product:products(*)`)
      .eq('user_id', user.id);
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id);
    const exportData = { analyses, reports, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resolveai-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleDeleteAllData = async () => {
    if (!user) return;
    if (!confirm('Are you sure? This will permanently delete all your analyses and reports. This action cannot be undone.')) return;
    await supabase.from('reports').delete().eq('user_id', user.id);
    await supabase.from('analyses').delete().eq('user_id', user.id);
    await supabase.from('chat_history').delete().eq('user_id', user.id);
    toast.success('All data deleted');
    setAnalysisCount(0);
    setReportCount(0);
  };

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, subscription, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-1 capitalize">{profile?.plan || 'free'} plan</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ''} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" /> Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div>
                  <p className="text-2xl font-bold capitalize">{subscription?.plan || 'free'}</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Badge className="capitalize">{subscription?.plan || 'free'}</Badge>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { plan: 'free', price: '$0', features: '5 analyses/month' },
                  { plan: 'pro', price: '$19', features: 'Unlimited analyses' },
                  { plan: 'enterprise', price: '$99', features: 'API + team' },
                ].map((p) => (
                  <Card key={p.plan} className={`text-center ${profile?.plan === p.plan ? 'border-primary' : ''}`}>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm font-semibold capitalize">{p.plan}</p>
                      <p className="text-2xl font-bold mt-1">{p.price}<span className="text-xs text-muted-foreground">/mo</span></p>
                      <p className="text-xs text-muted-foreground mt-1">{p.features}</p>
                      {profile?.plan === p.plan ? (
                        <Badge variant="outline" className="mt-2">Current</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => toast.info('Subscription upgrades coming soon!')}>
                          Upgrade
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Analysis complete notifications', desc: 'Get notified when an analysis finishes' },
                { label: 'Weekly summary email', desc: 'Receive a weekly summary of your analyses' },
                { label: 'Product alerts', desc: 'Alerts when a saved product\'s score changes' },
                { label: 'Product updates & news', desc: 'Updates about new features and improvements' },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 2} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Analyses</p>
                  <p className="text-2xl font-bold mt-1">{analysisCount}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Saved Reports</p>
                  <p className="text-2xl font-bold mt-1">{reportCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export & Delete Data</CardTitle>
              <CardDescription>Download your data or permanently delete it</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" /> Export All Data (JSON)
              </Button>
              <br />
              <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDeleteAllData}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete All My Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
