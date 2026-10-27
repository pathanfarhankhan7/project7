'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { generateChatResponse } from '@/lib/ai-service';
import { toast } from 'sonner';
import type { ChatMessage, Analysis, Product } from '@/lib/types';

const suggestionPrompts = [
  'Is this product worth buying?',
  'What are the most common complaints?',
  'Show cheaper alternatives.',
  'Explain the trust score.',
  'What is the sentiment breakdown?',
  'Are there fake reviews?',
];

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentAnalysis, setRecentAnalysis] = useState<{ product: Product; analysis: Analysis } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const { data: chatData } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      setMessages((chatData as unknown as ChatMessage[]) || []);

      const { data: analysisData } = await supabase
        .from('analyses')
        .select(`*, product:products(*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analysisData) {
        setRecentAnalysis(analysisData as unknown as { product: Product; analysis: Analysis } & Analysis);
      }
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      product_id: null,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    await new Promise((r) => setTimeout(r, 800));

    const response = generateChatResponse(input, {
      productName: recentAnalysis?.product?.name,
      analysis: recentAnalysis as unknown as Analysis | null,
    });

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: user.id,
      product_id: null,
      role: 'assistant',
      content: response,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'user',
      content: input,
    });
    await supabase.from('chat_history').insert({
      user_id: user.id,
      role: 'assistant',
      content: response,
    });

    setLoading(false);
  };

  const handleClear = async () => {
    if (!user) return;
    await supabase.from('chat_history').delete().eq('user_id', user.id);
    setMessages([]);
    toast.success('Chat history cleared');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ResolveAI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask about products, trust scores, comparisons, and recommendations.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear
          </Button>
        )}
      </div>

      {recentAnalysis && (
        <Card className="border-primary/30">
          <CardContent className="py-3 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Current context: <span className="text-foreground font-medium">{recentAnalysis.product?.name}</span>
              {' — '}Trust Score: <span className="text-primary font-bold">{(recentAnalysis as unknown as Analysis).trust_score}/100</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> AI Assistant
          </CardTitle>
        </CardHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">How can I help you?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                I can explain reports, compare products, suggest alternatives, and answer product questions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {suggestionPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-accent'
                    : 'bg-muted'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-xl p-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-xl p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything about products..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || loading}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
