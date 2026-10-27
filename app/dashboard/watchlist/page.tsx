'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Eye, Trash2, Plus, Loader2, Shield, Clock,
  TrendingUp, RefreshCw, Bell, BellOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { fetchProductFromUrl, analyzeReviews } from '@/lib/ai-service';
import type { WatchlistItem } from '@/lib/types';

export default function WatchlistPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchWatchlist();
  }, [user]);

  async function fetchWatchlist() {
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setItems((data as unknown as WatchlistItem[]) || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newUrl.trim()) {
      toast.error('Please enter a product URL');
      return;
    }
    setAdding(true);
    try {
      const fetched = await fetchProductFromUrl(newUrl.trim());
      const name = newName.trim() || fetched?.name || 'Unknown Product';
      const platform = fetched?.platform || 'Unknown';

      const { data, error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user!.id,
          product_url: newUrl.trim(),
          product_name: name,
          platform,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to add to watchlist');
      } else {
        setItems((prev) => [data as unknown as WatchlistItem, ...prev]);
        setNewUrl('');
        setNewName('');
        setAddOpen(false);
        toast.success('Added to watchlist');
      }
    } catch {
      toast.error('Could not fetch product data. Added with URL only.');
      const { data, error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user!.id,
          product_url: newUrl.trim(),
          product_name: newName.trim() || 'Unknown Product',
          platform: 'Unknown',
        })
        .select()
        .single();
      if (!error) {
        setItems((prev) => [data as unknown as WatchlistItem, ...prev]);
        setNewUrl('');
        setNewName('');
        setAddOpen(false);
      }
    }
    setAdding(false);
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from('watchlist').delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove from watchlist');
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Removed from watchlist');
    }
  }

  async function handleToggleNotify(item: WatchlistItem) {
    const newValue = !item.notify_on_change;
    await supabase.from('watchlist').update({ notify_on_change: newValue }).eq('id', item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, notify_on_change: newValue } : i));
  }

  async function handleCheck(item: WatchlistItem) {
    setChecking(item.id);
    try {
      const fetched = await fetchProductFromUrl(item.product_url);
      if (fetched && fetched.reviews && fetched.reviews.length > 0) {
        const analysis = analyzeReviews(item.product_name, fetched.reviews, fetched);
        const newScore = analysis.analysis.trust_score;

        await supabase.from('watchlist')
          .update({ last_trust_score: newScore, last_checked: new Date().toISOString() })
          .eq('id', item.id);

        setItems((prev) => prev.map((i) => i.id === item.id ? {
          ...i, last_trust_score: newScore, last_checked: new Date().toISOString(),
        } : i));

        if (item.last_trust_score !== null && item.last_trust_score !== newScore) {
          await supabase.from('notifications').insert({
            user_id: user!.id,
            title: 'Watchlist Alert',
            message: `Trust score for "${item.product_name}" changed from ${item.last_trust_score} to ${newScore}.`,
            type: 'system',
            action_url: '/dashboard/watchlist',
          });
        }

        toast.success(`Updated: ${item.product_name} - Score: ${newScore}`);
      } else {
        toast.warning('Could not fetch reviews for this product');
      }
    } catch {
      toast.error('Failed to check product');
    }
    setChecking(null);
  }

  async function handleCheckAll() {
    for (const item of items) {
      await handleCheck(item);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Watchlist</h1></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="h-24"><div className="h-full shimmer rounded-lg" /></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} product{items.length !== 1 ? 's' : ''} being monitored
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button variant="outline" onClick={handleCheckAll} disabled={checking !== null}>
              {checking !== null ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Check All</>}
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Add products to your watchlist to monitor their trust scores over time. Get notified when scores change.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="group hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{item.platform}</Badge>
                      {item.last_trust_score !== null ? (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Score: {item.last_trust_score}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not checked yet</span>
                      )}
                      {item.last_checked && (
                        <span className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(item.last_checked).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-2">
                      {item.notify_on_change ? (
                        <Bell className="w-4 h-4 text-primary" />
                      ) : (
                        <BellOff className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Switch checked={item.notify_on_change} onCheckedChange={() => handleToggleNotify(item)} />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCheck(item)}
                      disabled={checking === item.id}
                    >
                      {checking === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from watchlist?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Stop monitoring &quot;{item.product_name}&quot;?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleRemove(item.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Watchlist</DialogTitle>
            <DialogDescription>
              Enter a product URL to monitor. We&apos;ll check its trust score and notify you of changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product URL</label>
              <Input
                placeholder="https://amazon.com/product..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name (optional)</label>
              <Input
                placeholder="Auto-detected from URL if left empty"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !newUrl.trim()}>
              {adding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : 'Add to Watchlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
