'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark, Package, Star, Shield, Trash2, Search,
  ArrowRight, Tag, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { Product, Analysis } from '@/lib/types';

interface SavedProductRow {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product: Product & { analyses: Analysis[] };
}

const recommendationColors: Record<string, string> = {
  highly_recommended: 'text-green-400 border-green-400/40',
  recommended: 'text-blue-400 border-blue-400/40',
  consider_alternatives: 'text-yellow-400 border-yellow-400/40',
  avoid: 'text-red-400 border-red-400/40',
};

const recommendationLabels: Record<string, string> = {
  highly_recommended: 'Highly Recommended',
  recommended: 'Recommended',
  consider_alternatives: 'Consider Alternatives',
  avoid: 'Avoid',
};

export default function SavedProductsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchSaved();
  }, [user]);

  async function fetchSaved() {
    const { data } = await supabase
      .from('saved_products')
      .select(`
        *,
        product:products(
          *,
          analyses(trust_score, recommendation, sentiment_positive, sentiment_negative, id, created_at)
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    setSaved((data as unknown as SavedProductRow[]) || []);
    setLoading(false);
  }

  async function handleRemove(savedId: string, productName: string) {
    const { error } = await supabase
      .from('saved_products')
      .delete()
      .eq('id', savedId);

    if (error) {
      toast.error('Failed to remove from saved');
    } else {
      setSaved((prev) => prev.filter((s) => s.id !== savedId));
      toast.success(`Removed "${productName}" from saved`);
    }
  }

  const filtered = saved.filter((s) =>
    s.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Saved Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Your bookmarked products for quick access.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-52">
              <div className="h-full shimmer rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Saved Products</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {saved.length} product{saved.length !== 1 ? 's' : ''} bookmarked
          </p>
        </div>
        <Link href="/dashboard/analyze">
          <Button>
            <Search className="w-4 h-4 mr-2" /> Analyze New Product
          </Button>
        </Link>
      </div>

      {saved.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search saved products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {saved.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No saved products yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              After analyzing a product, click the Favorite button to save it here for quick access.
            </p>
            <Link href="/dashboard/analyze">
              <Button>
                <Search className="w-4 h-4 mr-2" /> Analyze a Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No products match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((row) => {
            const product = row.product;
            const latestAnalysis = product?.analyses?.[0];
            return (
              <Card key={row.id} className="group hover:border-primary/30 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{product?.name}</CardTitle>
                        {product?.platform && (
                          <p className="text-xs text-muted-foreground">{product.platform}</p>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from saved?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove &quot;{product?.name}&quot; from your saved products. The analysis data will not be deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleRemove(row.id, product?.name)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {product?.category && (
                      <Badge variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" /> {product.category}
                      </Badge>
                    )}
                    {product?.rating && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" /> {product.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  {latestAnalysis && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Trust Score
                        </span>
                        <span className="text-sm font-bold">{latestAnalysis.trust_score}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${latestAnalysis.trust_score}%`,
                            background:
                              latestAnalysis.trust_score >= 75 ? 'hsl(var(--success))' :
                              latestAnalysis.trust_score >= 55 ? 'hsl(var(--primary))' :
                              latestAnalysis.trust_score >= 35 ? 'hsl(var(--warning))' :
                              'hsl(var(--destructive))',
                          }}
                        />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${recommendationColors[latestAnalysis.recommendation] || ''}`}
                      >
                        {recommendationLabels[latestAnalysis.recommendation] || latestAnalysis.recommendation}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {latestAnalysis && (
                      <Link href={`/dashboard/analyze?id=${latestAnalysis.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <ArrowRight className="w-3 h-3 mr-1" /> View Analysis
                        </Button>
                      </Link>
                    )}
                    {product?.url && (
                      <a href={product.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Saved {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
