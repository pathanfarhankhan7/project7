'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Package, Shield, Smile, Frown,
  Search, ArrowRight, BarChart3, Clock, Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Area, AreaChart,
} from 'recharts';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import type { AnalysisWithProduct } from '@/lib/types';

const recommendationColors: Record<string, string> = {
  highly_recommended: 'hsl(var(--success))',
  recommended: 'hsl(var(--primary))',
  consider_alternatives: 'hsl(var(--warning))',
  avoid: 'hsl(var(--destructive))',
};

const recommendationLabels: Record<string, string> = {
  highly_recommended: 'Highly Recommended',
  recommended: 'Recommended',
  consider_alternatives: 'Consider Alternatives',
  avoid: 'Avoid',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const { data } = await supabase
        .from('analyses')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setAnalyses((data as unknown as AnalysisWithProduct[]) || []);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const totalAnalyzed = analyses.length;
  const avgTrustScore = totalAnalyzed > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.trust_score, 0) / totalAnalyzed)
    : 0;
  const avgPositive = totalAnalyzed > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.sentiment_positive, 0) / totalAnalyzed)
    : 0;
  const avgNegative = totalAnalyzed > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.sentiment_negative, 0) / totalAnalyzed)
    : 0;

  const sentimentPieData = [
    { name: 'Positive', value: avgPositive, color: 'hsl(var(--chart-4))' },
    { name: 'Neutral', value: 100 - avgPositive - avgNegative, color: 'hsl(var(--chart-3))' },
    { name: 'Negative', value: avgNegative, color: 'hsl(var(--chart-5))' },
  ];

  const trustScoreData = analyses.slice(0, 10).reverse().map((a, i) => ({
    name: a.product?.name?.slice(0, 15) || `P${i + 1}`,
    score: a.trust_score,
  }));

  const recommendationData = ['highly_recommended', 'recommended', 'consider_alternatives', 'avoid'].map((rec) => ({
    name: recommendationLabels[rec],
    value: analyses.filter((a) => a.recommendation === rec).length,
    color: recommendationColors[rec],
  }));

  const trendData = analyses.slice(0, 7).reverse().map((a) => ({
    date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    trust: a.trust_score,
    sentiment: a.sentiment_positive,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s an overview of your product analyses.
          </p>
        </div>
        <Link href="/dashboard/analyze">
          <Button>
            <Search className="w-4 h-4 mr-2" /> Analyze New Product
          </Button>
        </Link>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Products Analyzed"
          value={totalAnalyzed.toString()}
          color="primary"
        />
        <StatCard
          icon={Shield}
          label="Average Trust Score"
          value={`${avgTrustScore}/100`}
          color={avgTrustScore >= 60 ? 'success' : avgTrustScore >= 40 ? 'warning' : 'destructive'}
        />
        <StatCard
          icon={Smile}
          label="Positive Sentiment"
          value={`${avgPositive}%`}
          color="success"
        />
        <StatCard
          icon={Frown}
          label="Negative Sentiment"
          value={`${avgNegative}%`}
          color="destructive"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-72">
              <div className="h-full shimmer rounded-lg" />
            </Card>
          ))}
        </div>
      ) : totalAnalyzed === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Start by analyzing your first product. Paste a product URL or enter a name to get instant trust scores and review insights.
            </p>
            <Link href="/dashboard/analyze">
              <Button>
                <Search className="w-4 h-4 mr-2" /> Analyze Your First Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sentiment Distribution</CardTitle>
                <CardDescription>Overall sentiment across all analyses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sentimentPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sentimentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {sentimentPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: entry.color }} />
                      <span className="text-xs text-muted-foreground">{entry.name}: {entry.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trust Score Trend</CardTitle>
                <CardDescription>Recent analyses trust score and sentiment</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="trustGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="trust" stroke="hsl(var(--primary))" fill="url(#trustGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="sentiment" stroke="hsl(var(--accent))" fill="url(#sentimentGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommendations Breakdown</CardTitle>
                <CardDescription>How your analyzed products rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={recommendationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {recommendationData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Analyses</CardTitle>
                <CardDescription>Latest products you&apos;ve analyzed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
                  {analyses.slice(0, 5).map((analysis) => (
                    <Link
                      key={analysis.id}
                      href={`/dashboard/analyze?id=${analysis.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{analysis.product?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ color: recommendationColors[analysis.recommendation], borderColor: recommendationColors[analysis.recommendation] }}
                          >
                            {analysis.trust_score}/100
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Score per Product */}
          {trustScoreData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trust Scores by Product</CardTitle>
                <CardDescription>Individual product trust scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trustScoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  return (
    <Card className="hover:border-border/80 transition-colors">
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
