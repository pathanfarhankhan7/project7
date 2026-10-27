'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Layers, Loader2, Plus, X, Search, Shield, Star,
  Package, TrendingUp, ArrowRight, CheckCircle2, AlertCircle,
  Sparkles, ListPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { analyzeReviews, fetchProductFromUrl } from '@/lib/ai-service';
import { toast } from 'sonner';
import type { RecommendationLevel } from '@/lib/types';

interface BatchResult {
  url: string;
  productName: string;
  status: 'pending' | 'fetching' | 'analyzing' | 'done' | 'error';
  trustScore: number | null;
  recommendation: RecommendationLevel | null;
  reviewCount: number | null;
  error?: string;
}

const recommendationLabels: Record<RecommendationLevel, string> = {
  highly_recommended: 'Highly Recommended',
  recommended: 'Recommended',
  consider_alternatives: 'Consider Alternatives',
  avoid: 'Avoid',
};

export default function BatchAnalysisPage() {
  const { user } = useAuth();
  const [urls, setUrls] = useState<string[]>(['', '', '']);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [running, setRunning] = useState(false);

  const addUrlField = () => setUrls([...urls, '']);
  const removeUrlField = (idx: number) => setUrls(urls.filter((_, i) => i !== idx));
  const updateUrl = (idx: number, value: string) => setUrls(urls.map((u, i) => i === idx ? value : u));

  const validUrls = urls.filter((u) => u.trim().length > 0);

  const runBatch = async () => {
    if (validUrls.length === 0) {
      toast.error('Please enter at least one product URL');
      return;
    }

    setRunning(true);
    const initial: BatchResult[] = validUrls.map((url) => ({
      url, productName: '', status: 'pending', trustScore: null, recommendation: null, reviewCount: null,
    }));
    setResults(initial);

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i].trim();
      setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: 'fetching' } : r));

      try {
        const fetched = await fetchProductFromUrl(url);

        if (fetched && fetched.reviews && fetched.reviews.length > 0) {
          setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: 'analyzing', productName: fetched.name } : r));
          const analysis = analyzeReviews(fetched.name, fetched.reviews, fetched);

          if (user) {
            const { data: productData } = await supabase
              .from('products')
              .insert({
                user_id: user.id,
                name: analysis.product.name,
                url: analysis.product.url,
                image_url: analysis.product.image_url,
                category: analysis.product.category,
                price: analysis.product.price,
                rating: analysis.product.rating,
                review_count: analysis.product.review_count,
                platform: analysis.product.platform,
              })
              .select()
              .single();

            if (productData) {
              await supabase.from('analyses').insert({
                product_id: productData.id,
                user_id: user.id,
                trust_score: analysis.analysis.trust_score,
                recommendation: analysis.analysis.recommendation,
                sentiment_positive: analysis.analysis.sentiment_positive,
                sentiment_neutral: analysis.analysis.sentiment_neutral,
                sentiment_negative: analysis.analysis.sentiment_negative,
                summary: analysis.analysis.summary,
                positive_highlights: analysis.analysis.positive_highlights,
                negative_highlights: analysis.analysis.negative_highlights,
                common_complaints: analysis.analysis.common_complaints,
                fake_review_flags: analysis.analysis.fake_review_flags,
                fake_review_percentage: analysis.analysis.fake_review_percentage,
                topics: analysis.analysis.topics,
              });
            }
          }

          setResults((prev) => prev.map((r, idx) => idx === i ? {
            ...r, status: 'done', productName: analysis.product.name || fetched.name,
            trustScore: analysis.analysis.trust_score,
            recommendation: analysis.analysis.recommendation,
            reviewCount: analysis.product.review_count || fetched.reviews.length,
          } : r));
        } else if (fetched && fetched.name) {
          setResults((prev) => prev.map((r, idx) => idx === i ? {
            ...r, status: 'error', productName: fetched.name,
            error: 'Product found but no reviews could be extracted',
          } : r));
        } else {
          setResults((prev) => prev.map((r, idx) => idx === i ? {
            ...r, status: 'error', error: 'Could not fetch product data from URL',
          } : r));
        }
      } catch {
        setResults((prev) => prev.map((r, idx) => idx === i ? {
          ...r, status: 'error', error: 'Analysis failed',
        } : r));
      }
    }

    setRunning(false);
    toast.success('Batch analysis complete!');
  };

  const completedCount = results.filter((r) => r.status === 'done').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Batch Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze multiple products at once. Paste up to 10 product URLs and run them all.
        </p>
      </div>

      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-primary" /> Product URLs
          </CardTitle>
          <CardDescription>Add product URLs to analyze in batch</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {urls.map((url, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Product URL #${idx + 1} (e.g., https://amazon.com/...)`}
                  value={url}
                  onChange={(e) => updateUrl(idx, e.target.value)}
                  className="pl-10"
                  disabled={running}
                />
              </div>
              {urls.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeUrlField(idx)} disabled={running}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addUrlField} disabled={running || urls.length >= 10}>
              <Plus className="w-4 h-4 mr-2" /> Add URL
            </Button>
            <Button onClick={runBatch} disabled={running || validUrls.length === 0} className="ml-auto">
              {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Run Batch Analysis</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {running && results.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{completedCount + errorCount} / {results.length}</span>
            </div>
            <Progress value={((completedCount + errorCount) / results.length) * 100} />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="flex gap-2">
              {completedCount > 0 && <Badge className="bg-success/20 text-success border-success/30">{completedCount} done</Badge>}
              {errorCount > 0 && <Badge className="bg-destructive/20 text-destructive border-destructive/30">{errorCount} failed</Badge>}
            </div>
          </div>

          {results.map((result, idx) => (
            <Card key={idx} className={`transition-all ${result.status === 'done' ? 'hover:border-primary/30' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                    {result.status === 'pending' && <div className="w-6 h-6 rounded-full border-2 border-muted" />}
                    {result.status === 'fetching' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                    {result.status === 'analyzing' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                    {result.status === 'done' && <CheckCircle2 className="w-6 h-6 text-success" />}
                    {result.status === 'error' && <AlertCircle className="w-6 h-6 text-destructive" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {result.productName || result.url}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{result.url}</p>
                    {result.status === 'error' && result.error && (
                      <p className="text-xs text-destructive mt-1">{result.error}</p>
                    )}
                    {result.status === 'done' && result.trustScore !== null && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <Badge variant="outline" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" /> {result.trustScore}/100
                        </Badge>
                        {result.recommendation && (
                          <Badge variant="outline" className="text-xs">
                            {recommendationLabels[result.recommendation]}
                          </Badge>
                        )}
                        {result.reviewCount !== null && (
                          <span className="text-xs text-muted-foreground">{result.reviewCount} reviews</span>
                        )}
                      </div>
                    )}
                  </div>

                  {result.status === 'done' && (
                    <div className="shrink-0">
                      <div className={`text-2xl font-bold ${
                        result.trustScore! >= 75 ? 'text-success' :
                        result.trustScore! >= 55 ? 'text-primary' :
                        result.trustScore! >= 35 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {result.trustScore}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {completedCount > 0 && !running && (
            <div className="flex justify-center pt-4">
              <Link href="/dashboard/history">
                <Button variant="outline">
                  View All in History <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Batch Analysis</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Add multiple product URLs above and analyze them all at once. Results are saved to your history automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
