'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  History, Package, Shield, Search, Filter, ArrowRight,
  ChevronDown, Trash2, SortAsc, SortDesc,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { AnalysisWithProduct, RecommendationLevel } from '@/lib/types';

const recommendationConfig: Record<RecommendationLevel, { label: string; color: string; dot: string }> = {
  highly_recommended: { label: 'Highly Recommended', color: 'text-green-400 border-green-400/40', dot: 'bg-green-400' },
  recommended: { label: 'Recommended', color: 'text-blue-400 border-blue-400/40', dot: 'bg-blue-400' },
  consider_alternatives: { label: 'Consider Alternatives', color: 'text-yellow-400 border-yellow-400/40', dot: 'bg-yellow-400' },
  avoid: { label: 'Avoid', color: 'text-red-400 border-red-400/40', dot: 'bg-red-400' },
};

type SortKey = 'newest' | 'oldest' | 'trust_high' | 'trust_low';
type FilterKey = 'all' | RecommendationLevel;

export default function HistoryPage() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (!user) return;
    fetchHistory();
  }, [user]);

  async function fetchHistory() {
    const { data } = await supabase
      .from('analyses')
      .select(`*, product:products(*)`)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    setAnalyses((data as unknown as AnalysisWithProduct[]) || []);
    setLoading(false);
  }

  async function handleDelete(analysisId: string, productName: string) {
    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', analysisId);

    if (error) {
      toast.error('Failed to delete analysis');
    } else {
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      toast.success(`Deleted analysis for "${productName}"`);
    }
  }

  const filtered = analyses
    .filter((a) => {
      const matchesSearch = a.product?.name?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || a.recommendation === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'trust_high') return b.trust_score - a.trust_score;
      if (sort === 'trust_low') return a.trust_score - b.trust_score;
      return 0;
    });

  const sortLabels: Record<SortKey, string> = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    trust_high: 'Trust: High to Low',
    trust_low: 'Trust: Low to High',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analysis History</h1>
          <p className="text-sm text-muted-foreground mt-1">All your past product analyses.</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-24">
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
          <h1 className="text-2xl font-bold">Analysis History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {analyses.length} total analysis{analyses.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Link href="/dashboard/analyze">
          <Button>
            <Search className="w-4 h-4 mr-2" /> New Analysis
          </Button>
        </Link>
      </div>

      {analyses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {filter === 'all' ? 'All' : recommendationConfig[filter as RecommendationLevel]?.label}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Recommendation</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter('all')}>All</DropdownMenuItem>
              {Object.entries(recommendationConfig).map(([key, cfg]) => (
                <DropdownMenuItem key={key} onClick={() => setFilter(key as FilterKey)}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot} mr-2`} />
                  {cfg.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {sort.startsWith('trust_high') ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                {sortLabels[sort]}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(sortLabels).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => setSort(key as SortKey)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {analyses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No analysis history yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Once you analyze products, all your results will appear here with full details.
            </p>
            <Link href="/dashboard/analyze">
              <Button>
                <Search className="w-4 h-4 mr-2" /> Start Analyzing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No analyses match your filters.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(''); setFilter('all'); }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((analysis) => {
            const cfg = recommendationConfig[analysis.recommendation];
            return (
              <Card key={analysis.id} className="group hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <p className="text-sm font-semibold truncate">{analysis.product?.name}</p>
                        {analysis.product?.platform && (
                          <Badge variant="outline" className="text-xs w-fit">{analysis.product.platform}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5`} />
                          {cfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-32">
                          <Progress
                            value={analysis.trust_score}
                            className={`h-1.5 ${
                              analysis.trust_score >= 75 ? '[&>div]:bg-green-400' :
                              analysis.trust_score >= 55 ? '[&>div]:bg-blue-400' :
                              analysis.trust_score >= 35 ? '[&>div]:bg-yellow-400' :
                              '[&>div]:bg-red-400'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-semibold flex items-center gap-1">
                          <Shield className="w-3 h-3 text-muted-foreground" />
                          {analysis.trust_score}/100
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Fake: {analysis.fake_review_percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/dashboard/analyze?id=${analysis.id}`}>
                        <Button variant="outline" size="sm" className="text-xs hidden sm:flex">
                          <ArrowRight className="w-3 h-3 mr-1" /> View
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the analysis for &quot;{analysis.product?.name}&quot;. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(analysis.id, analysis.product?.name)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
