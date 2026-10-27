'use client';

import { useState, useEffect } from 'react';
import {
  GitCompare, Star, Shield, ThumbsUp, ThumbsDown, Trash2,
  TrendingUp, Plus, Package, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { AnalysisWithProduct, RecommendationLevel } from '@/lib/types';

const recommendationConfig: Record<RecommendationLevel, { label: string; color: string }> = {
  highly_recommended: { label: 'Highly Recommended', color: 'text-success' },
  recommended: { label: 'Recommended', color: 'text-primary' },
  consider_alternatives: { label: 'Consider Alternatives', color: 'text-warning' },
  avoid: { label: 'Avoid', color: 'text-destructive' },
};

export default function ComparePage() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisWithProduct[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const { data } = await supabase
        .from('analyses')
        .select(`*, product:products(*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const allAnalyses = (data as unknown as AnalysisWithProduct[]) || [];
      setAnalyses(allAnalyses);
      if (allAnalyses.length >= 2) {
        setSelected([allAnalyses[0].id, allAnalyses[1].id]);
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const selectedAnalyses = analyses.filter((a) => selected.includes(a.id));

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 4) {
      setSelected([...selected, id]);
    } else {
      toast.error('You can compare up to 4 products at a time');
    }
  };

  const radarData = selectedAnalyses.map((a) => ({
    product: a.product?.name?.slice(0, 15) || 'Product',
    'Trust Score': a.trust_score,
    'Positive %': Math.round(a.sentiment_positive),
    'Authenticity': 100 - a.fake_review_percentage,
  }));

  const barData = selectedAnalyses.map((a) => ({
    name: a.product?.name?.slice(0, 12) || 'Product',
    Trust: a.trust_score,
    Positive: Math.round(a.sentiment_positive),
    Negative: Math.round(a.sentiment_negative),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Product Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare up to 4 products side by side. Select from your analyzed products below.
        </p>
      </div>

      {analyses.length < 2 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <GitCompare className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Not enough products to compare</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              You need at least 2 analyzed products to use the comparison tool. Analyze more products first.
            </p>
            <a href="/dashboard/analyze">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Analyze Products
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Product Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Products to Compare</CardTitle>
              <CardDescription>{selected.length} of 4 selected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analyses.map((analysis) => (
                  <button
                    key={analysis.id}
                    onClick={() => toggleSelect(analysis.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      selected.includes(analysis.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{analysis.product?.name}</p>
                      <p className="text-xs text-muted-foreground">Score: {analysis.trust_score}/100</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedAnalyses.length >= 2 && (
            <>
              {/* Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedAnalyses.map((analysis) => (
                  <Card key={analysis.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <button onClick={() => toggleSelect(analysis.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold mb-1 line-clamp-2">{analysis.product?.name}</h3>
                      {analysis.product?.platform && (
                        <Badge variant="outline" className="text-xs mb-3">{analysis.product.platform}</Badge>
                      )}

                      <div className="space-y-3 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Trust Score</p>
                          <p className="text-2xl font-bold text-gradient-blue">{analysis.trust_score}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-warning text-warning" />
                            <span className="font-semibold">{analysis.product?.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Recommendation</p>
                          <p className={`text-sm font-semibold ${recommendationConfig[analysis.recommendation].color}`}>
                            {recommendationConfig[analysis.recommendation].label}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sentiment</p>
                          <div className="flex gap-1">
                            <Badge className="bg-success/20 text-success border-0 text-xs">{analysis.sentiment_positive.toFixed(0)}%</Badge>
                            <Badge className="bg-warning/20 text-warning border-0 text-xs">{analysis.sentiment_neutral.toFixed(0)}%</Badge>
                            <Badge className="bg-destructive/20 text-destructive border-0 text-xs">{analysis.sentiment_negative.toFixed(0)}%</Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Fake Reviews</p>
                          <Progress
                            value={analysis.fake_review_percentage}
                            className={`h-2 ${
                              analysis.fake_review_percentage > 30 ? '[&>div]:bg-destructive' :
                              analysis.fake_review_percentage > 15 ? '[&>div]:bg-warning' :
                              '[&>div]:bg-success'
                            }`}
                          />
                          <p className="text-xs text-muted-foreground mt-1">{analysis.fake_review_percentage}% suspicious</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Pros</p>
                          <ul className="space-y-0.5">
                            {analysis.positive_highlights.slice(0, 2).map((h, i) => (
                              <li key={i} className="text-xs flex items-start gap-1">
                                <ThumbsUp className="w-3 h-3 text-success mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Cons</p>
                          <ul className="space-y-0.5">
                            {analysis.negative_highlights.slice(0, 2).map((h, i) => (
                              <li key={i} className="text-xs flex items-start gap-1">
                                <ThumbsDown className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <Tabs defaultValue="radar" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="radar">Radar Comparison</TabsTrigger>
                  <TabsTrigger value="bar">Bar Comparison</TabsTrigger>
                </TabsList>

                <TabsContent value="radar">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Multi-Dimensional Comparison</CardTitle>
                      <CardDescription>Trust score, positive sentiment, and authenticity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={[
                          { metric: 'Trust Score', ...Object.fromEntries(selectedAnalyses.map(a => [a.product?.name?.slice(0, 10), a.trust_score])) },
                          { metric: 'Positive %', ...Object.fromEntries(selectedAnalyses.map(a => [a.product?.name?.slice(0, 10), Math.round(a.sentiment_positive)])) },
                          { metric: 'Authenticity', ...Object.fromEntries(selectedAnalyses.map(a => [a.product?.name?.slice(0, 10), 100 - a.fake_review_percentage])) },
                          { metric: 'Rating x20', ...Object.fromEntries(selectedAnalyses.map(a => [a.product?.name?.slice(0, 10), Math.round((a.product?.rating || 0) * 20)])) },
                        ]}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 100]} />
                          {selectedAnalyses.map((a, i) => {
                            const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
                            return (
                              <Radar
                                key={a.id}
                                name={a.product?.name?.slice(0, 15)}
                                dataKey={a.product?.name?.slice(0, 10)}
                                stroke={colors[i % 4]}
                                fill={colors[i % 4]}
                                fillOpacity={0.15}
                                strokeWidth={2}
                              />
                            );
                          })}
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bar">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Score Comparison</CardTitle>
                      <CardDescription>Side-by-side comparison of key metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="Trust" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Positive" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Negative" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  );
}
