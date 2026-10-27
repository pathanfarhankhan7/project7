'use client';

import { useState, useEffect } from 'react';
import {
  FileText, Download, Star, Heart, Trash2, Package,
  Shield, Smile, Frown, Loader2, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import type { Report, Analysis, Product, RecommendationLevel } from '@/lib/types';

const recommendationLabels: Record<RecommendationLevel, string> = {
  highly_recommended: 'Highly Recommended',
  recommended: 'Recommended',
  consider_alternatives: 'Consider Alternatives',
  avoid: 'Avoid',
};

interface ReportWithDetails extends Report {
  analysis: Analysis;
  analysis_product: Product;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewReport, setViewReport] = useState<ReportWithDetails | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const { data } = await supabase
        .from('reports')
        .select(`
          *,
          analysis:analyses(*, product:products(*))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((r: Record<string, unknown>) => ({
        ...(r as unknown as Report),
        analysis: (r as Record<string, unknown>).analysis as unknown as Analysis,
        analysis_product: ((r as Record<string, unknown>).analysis as Record<string, unknown>).product as unknown as Product,
      }));
      setReports(mapped);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from('reports').update({ is_favorite: !current }).eq('id', id);
    setReports(reports.map((r) => r.id === id ? { ...r, is_favorite: !current } : r));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('reports').delete().eq('id', id);
    setReports(reports.filter((r) => r.id !== id));
    toast.success('Report deleted');
  };

  const handleDownloadPDF = (report: ReportWithDetails) => {
    const a = report.analysis;
    const p = report.analysis_product;

    const html = `<!DOCTYPE html>
<html>
<head>
<title>ResolveAI Report - ${p.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; background: #0F172A; color: #F8FAFC; padding: 40px; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; }
  .header h1 { font-size: 28px; color: #3B82F6; }
  .header p { font-size: 13px; color: #94A3B8; margin-top: 5px; }
  .section { margin-bottom: 25px; }
  .section h2 { font-size: 16px; color: #3B82F6; margin-bottom: 10px; }
  .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1E293B; font-size: 13px; }
  .info-label { color: #94A3B8; }
  .info-value { font-weight: bold; color: #F8FAFC; }
  .summary { font-size: 13px; line-height: 1.6; color: #CBD5E1; padding: 12px; background: #1E293B; border-radius: 8px; }
  .highlights { list-style: none; padding: 0; }
  .highlights li { font-size: 13px; color: #CBD5E1; padding: 4px 0 4px 20px; position: relative; }
  .highlights.pos li::before { content: '+'; position: absolute; left: 0; color: #22C55E; font-weight: bold; }
  .highlights.neg li::before { content: '-'; position: absolute; left: 0; color: #EF4444; font-weight: bold; }
  .highlights.warn li::before { content: '!'; position: absolute; left: 0; color: #F59E0B; font-weight: bold; }
  .sentiment-bar { display: flex; gap: 10px; margin: 10px 0; }
  .sentiment-pill { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .pos { background: rgba(34,197,94,0.2); color: #22C55E; }
  .neu { background: rgba(6,182,212,0.2); color: #06B6D4; }
  .neg { background: rgba(239,68,68,0.2); color: #EF4444; }
  .divider { height: 1px; background: #334155; margin: 20px 0; }
  .footer { text-align: center; font-size: 11px; color: #64748B; margin-top: 30px; }
  @media print { body { background: white; color: black; } .header h1, .section h2 { color: #1E40AF; } }
</style>
</head>
<body>
  <div class="header">
    <h1>ResolveAI Analysis Report</h1>
    <p>Generated on ${new Date(report.created_at).toLocaleDateString()}</p>
  </div>

  <div class="section">
    <h2>Product Information</h2>
    <div class="info-row"><span class="info-label">Name</span><span class="info-value">${p.name}</span></div>
    ${p.platform ? `<div class="info-row"><span class="info-label">Platform</span><span class="info-value">${p.platform}</span></div>` : ''}
    ${p.category ? `<div class="info-row"><span class="info-label">Category</span><span class="info-value">${p.category}</span></div>` : ''}
    ${p.price != null ? `<div class="info-row"><span class="info-label">Price</span><span class="info-value">$${p.price.toFixed(2)}</span></div>` : ''}
    <div class="info-row"><span class="info-label">Rating</span><span class="info-value">${p.rating?.toFixed(1) || 'N/A'} / 5</span></div>
    <div class="info-row"><span class="info-label">Review Count</span><span class="info-value">${p.review_count?.toLocaleString() || 'N/A'}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <h2>Trust Score & Recommendation</h2>
    <div class="info-row"><span class="info-label">Trust Score</span><span class="info-value">${a.trust_score} / 100</span></div>
    <div class="info-row"><span class="info-label">Recommendation</span><span class="info-value">${recommendationLabels[a.recommendation]}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <h2>AI Summary</h2>
    <div class="summary">${a.summary}</div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <h2>Sentiment Breakdown</h2>
    <div class="sentiment-bar">
      <span class="sentiment-pill pos">Positive ${a.sentiment_positive.toFixed(1)}%</span>
      <span class="sentiment-pill neu">Neutral ${a.sentiment_neutral.toFixed(1)}%</span>
      <span class="sentiment-pill neg">Negative ${a.sentiment_negative.toFixed(1)}%</span>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <h2>Positive Highlights</h2>
    <ul class="highlights pos">
      ${a.positive_highlights.map(h => `<li>${h}</li>`).join('')}
    </ul>
  </div>

  <div class="section">
    <h2>Negative Highlights</h2>
    <ul class="highlights neg">
      ${a.negative_highlights.map(h => `<li>${h}</li>`).join('')}
    </ul>
  </div>

  ${a.common_complaints.length > 0 ? `
  <div class="section">
    <h2>Common Complaints</h2>
    <ul class="highlights warn">
      ${a.common_complaints.map(c => `<li>${c}</li>`).join('')}
    </ul>
  </div>` : ''}

  <div class="section">
    <h2>Fake Review Detection</h2>
    <div class="info-row"><span class="info-label">Suspicious Review %</span><span class="info-value">${a.fake_review_percentage}%</span></div>
  </div>

  <div class="footer">Generated by ResolveAI — AI-Powered Product Review Verification</div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      toast.error('Please allow popups to download reports');
    } else {
      toast.success('Report opened — use Ctrl/Cmd+P to save as PDF');
    }
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.analysis_product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'favorite' && r.is_favorite);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View, download, and manage your saved analysis reports.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reports</SelectItem>
            <SelectItem value="favorite">Favorites</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Save analysis reports from the product analysis page to view and download them here.
            </p>
            <a href="/dashboard/analyze">
              <Button>Analyze a Product</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const a = report.analysis;
            const p = report.analysis_product;
            return (
              <Card key={report.id} className="hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{p?.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {p?.platform} • {new Date(report.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => toggleFavorite(report.id, report.is_favorite)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${report.is_favorite ? 'fill-destructive text-destructive' : ''}`} />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-2xl font-bold text-gradient-blue">{a.trust_score}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {recommendationLabels[a.recommendation]}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Badge className="bg-success/20 text-success border-0 text-xs">
                      <Smile className="w-3 h-3 mr-1" /> {a.sentiment_positive.toFixed(0)}%
                    </Badge>
                    <Badge className="bg-destructive/20 text-destructive border-0 text-xs">
                      <Frown className="w-3 h-3 mr-1" /> {a.sentiment_negative.toFixed(0)}%
                    </Badge>
                  </div>

                  {p?.rating && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 fill-warning text-warning" />
                      {p.rating.toFixed(1)} ({p.review_count?.toLocaleString()} reviews)
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setViewReport(report)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownloadPDF(report)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(report.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Report View Dialog */}
      <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
          {viewReport && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewReport.analysis_product.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Trust Score</p>
                    <p className="text-3xl font-bold text-gradient-blue">{viewReport.analysis.trust_score}/100</p>
                  </div>
                  <Badge variant="outline">
                    {recommendationLabels[viewReport.analysis.recommendation]}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">AI Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{viewReport.analysis.summary}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-success/10 text-center">
                    <p className="text-xs text-muted-foreground">Positive</p>
                    <p className="text-lg font-bold text-success">{viewReport.analysis.sentiment_positive.toFixed(0)}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 text-center">
                    <p className="text-xs text-muted-foreground">Neutral</p>
                    <p className="text-lg font-bold text-accent">{viewReport.analysis.sentiment_neutral.toFixed(0)}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 text-center">
                    <p className="text-xs text-muted-foreground">Negative</p>
                    <p className="text-lg font-bold text-destructive">{viewReport.analysis.sentiment_negative.toFixed(0)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-success mb-2">Positive Highlights</h4>
                    <ul className="space-y-1">
                      {viewReport.analysis.positive_highlights.map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-success">+</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-destructive mb-2">Negative Highlights</h4>
                    <ul className="space-y-1">
                      {viewReport.analysis.negative_highlights.map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-destructive">-</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {viewReport.analysis.common_complaints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-warning mb-2">Common Complaints</h4>
                    <ul className="space-y-1">
                      {viewReport.analysis.common_complaints.map((c, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-warning">!</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Fake Review Detection</span>
                  <Badge variant="outline">{viewReport.analysis.fake_review_percentage}% suspicious</Badge>
                </div>

                <Button className="w-full" onClick={() => handleDownloadPDF(viewReport)}>
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
