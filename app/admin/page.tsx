'use client';

import { useEffect, useState } from 'react';
import {
  Shield, Users, Package, BarChart3, Crown, TrendingUp,
  DollarSign, Activity, Loader2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Profile, Subscription, Analysis, Product } from '@/lib/types';

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [analyses, setAnalyses] = useState<(Analysis & { product: Product })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    async function fetchAdminData() {
      if (!user || profile?.role !== 'admin') return;

      const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setProfiles((profilesData as unknown as Profile[]) || []);

      const { data: subsData } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
      setSubscriptions((subsData as unknown as Subscription[]) || []);

      const { data: analysesData } = await supabase
        .from('analyses')
        .select(`*, product:products(*)`)
        .order('created_at', { ascending: false })
        .limit(50);
      setAnalyses((analysesData as unknown as (Analysis & { product: Product })[]) || []);

      const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts((productsData as unknown as Product[]) || []);

      setDataLoading(false);
    }
    fetchAdminData();
  }, [user, profile]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-4">You don&apos;t have admin privileges.</p>
            <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsers = profiles.length;
  const totalProducts = products.length;
  const totalAnalyses = analyses.length;
  const proUsers = subscriptions.filter((s) => s.plan === 'pro').length;
  const enterpriseUsers = subscriptions.filter((s) => s.plan === 'enterprise').length;
  const freeUsers = subscriptions.filter((s) => s.plan === 'free').length;
  const avgTrustScore = totalAnalyses > 0 ? Math.round(analyses.reduce((s, a) => s + a.trust_score, 0) / totalAnalyses) : 0;

  const planData = [
    { name: 'Free', value: freeUsers, color: 'hsl(var(--muted-foreground))' },
    { name: 'Pro', value: proUsers, color: 'hsl(var(--primary))' },
    { name: 'Enterprise', value: enterpriseUsers, color: 'hsl(var(--accent))' },
  ];

  const platformData = products.reduce((acc, p) => {
    const platform = p.platform || 'Unknown';
    const existing = acc.find((a) => a.platform === platform);
    if (existing) existing.count++;
    else acc.push({ platform, count: 1 });
    return acc;
  }, [] as { platform: string; count: number }[]).sort((a, b) => b.count - a.count).slice(0, 6);

  const recentSignups = profiles.slice(0, 7).map((p) => ({
    date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: 1,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="glass-strong border-b border-border h-16 flex items-center px-4 sm:px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold">ResolveAI Admin</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="outline" className="text-secondary border-secondary/30">
            <Crown className="w-3 h-3 mr-1" /> Admin
          </Badge>
          <Link href="/dashboard"><Button variant="outline" size="sm">Back to App</Button></Link>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard icon={Users} label="Total Users" value={totalUsers.toString()} color="primary" />
          <AdminStatCard icon={Package} label="Products Analyzed" value={totalProducts.toString()} color="accent" />
          <AdminStatCard icon={BarChart3} label="Total Analyses" value={totalAnalyses.toString()} color="secondary" />
          <AdminStatCard icon={TrendingUp} label="Avg Trust Score" value={`${avgTrustScore}/100`} color="success" />
        </div>

        {/* Revenue estimate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Revenue (est.)</p>
                  <p className="text-xl font-bold">${proUsers * 19 + enterpriseUsers * 99}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pro Subscribers</p>
                  <p className="text-xl font-bold">{proUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enterprise Users</p>
                  <p className="text-xl font-bold">{enterpriseUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscription Plans</CardTitle>
              <CardDescription>Distribution of user plans</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {planData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4">
                {planData.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-xs text-muted-foreground">{p.name}: {p.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products by Platform</CardTitle>
              <CardDescription>Which platforms are most analyzed</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="platform" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
            <CardDescription>{totalUsers} registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.slice(0, 20).map((p) => {
                    const sub = subscriptions.find((s) => s.user_id === p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                                {(p.full_name || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{p.full_name || 'Unnamed'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{sub?.plan || 'free'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                            {p.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Analyses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Analyses</CardTitle>
            <CardDescription>Latest product analyses across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Trust Score</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Fake %</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.slice(0, 15).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">{a.product?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          a.trust_score >= 75 ? 'text-success border-success/30' :
                          a.trust_score >= 55 ? 'text-primary border-primary/30' :
                          a.trust_score >= 35 ? 'text-warning border-warning/30' :
                          'text-destructive border-destructive/30'
                        }>
                          {a.trust_score}/100
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {a.recommendation.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.fake_review_percentage}%
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function AdminStatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: 'primary' | 'success' | 'warning' | 'destructive' | 'accent' | 'secondary';
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
    accent: 'text-accent bg-accent/10',
    secondary: 'text-secondary bg-secondary/10',
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
