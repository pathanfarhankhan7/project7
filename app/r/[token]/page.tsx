'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield, ThumbsUp, ThumbsDown, AlertTriangle, Star, Package,
  DollarSign, Tag, Sparkles, TrendingUp, ArrowLeft, Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { supabase } from '@/lib/supabase-client';
import type { Analysis, Product, RecommendationLevel } from '@/lib/types';

const recommendationConfig: Record<RecommendationLevel, { label: string; color: string; bg: string }> = {
  highly_recommended: { label: 'Highly Recommended', color: 'text-success', bg: 'bg-success/20 border-success/30' },
  recommended: { label: 'Recommended', color: 'text-primary', bg: 'bg-primary/20 border-primary/30' },
  consider_alternatives: { label: 'Consider Alternatives', color: 'text-warning', bg: 'bg-warning/20 border-warning/30' },
  avoid: { label: 'Avoid', color: 'text-destructive', bg: 'bg-destructive/20 border-destructive/30' },
};

export default function SharedReportPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<(Analysis & { product: Product }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      const { data, error } = await supabase
        .from('analyses')
        .select(`*, product:products(*)`)
        .eq('share_token', params.token)
        .eq('is_shared', true)
        .maybeSingle();

      if (error || !data) {
        setError('This shared report could not be found or is no longer public.');
        setLoading(false);
        return;
      }
      setData(data as unknown as Analysis & { product: Product });
      setLoading(false);
    }
    fetchReport();
  }, [params.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Report Not Found</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/" className="mt-6 inline-block">
              <Button variant="outline">Go to ResolveAI</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analysis = data!;
  const product = analysis.product;
  const rec = recommendationConfig[analysis.recommendation];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-strong border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">ResolveAI</span>
          </Link>
          <Link href="/signup">
            <Button size="sm">
              <Sparkles className="w-4 h-4 mr-2" /> Try ResolveAI Free
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Share2 className="w-4 h-4" /> Shared Report
        </div>

        {/* Product Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-32 h-32 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold">{product.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {product.platform && <Badge variant="outline" className="text-xs">{product.platform}</Badge>}
                    {product.category && <Badge variant="outline" className="text-xs"><Tag className="w-3 h-3 mr-1" /> {product.category}</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-warning text-warning" />
                      <span className="text-sm font-semibold">{product.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                    <p className="text-sm font-semibold">{product.review_count?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-semibold">{product.price?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trust Score</p>
                    <p className="text-sm font-bold text-gradient-blue">{analysis.trust_score}/100</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Score & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Trust Score</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke={analysis.trust_score >= 75 ? 'hsl(var(--success))' : analysis.trust_score >= 55 ? 'hsl(var(--primary))' : analysis.trust_score >= 35 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'} strokeWidth="10" strokeDasharray={`${(analysis.trust_score / 100) * 327} 327`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{analysis.trust_score}</span>
                    <span className="text-xs text-muted-foreground">out of 100</span>
                  </div>
                </div>
                <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border ${rec.bg}`}>
                  <Badge className={`${rec.color} border-0`}>{rec.label}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{analysis.summary}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> Positive Highlights</h4>
                  <ul className="space-y-1.5">
                    {analysis.positive_highlights.map((h, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-success mt-0.5">+</span> {h}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1"><ThumbsDown className="w-4 h-4" /> Negative Highlights</h4>
                  <ul className="space-y-1.5">
                    {analysis.negative_highlights.map((h, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-destructive mt-0.5">-</span> {h}</li>)}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">Sentiment Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[
                  { name: 'Positive', value: analysis.sentiment_positive, color: 'hsl(var(--chart-4))' },
                  { name: 'Neutral', value: analysis.sentiment_neutral, color: 'hsl(var(--chart-3))' },
                  { name: 'Negative', value: analysis.sentiment_negative, color: 'hsl(var(--chart-5))' },
                ]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {[{ color: 'hsl(var(--chart-4))' }, { color: 'hsl(var(--chart-3))' }, { color: 'hsl(var(--chart-5))' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Complaints */}
        {analysis.common_complaints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /> Common Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.common_complaints.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/10">
                    <div className="w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center shrink-0 text-xs font-semibold text-warning">{i + 1}</div>
                    <p className="text-sm">{c}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center">
            <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold">Want to analyze your own products?</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-4">Get instant AI-powered review analysis, fake review detection, and trust scoring.</p>
            <Link href="/signup"><Button>Start Free Today</Button></Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
