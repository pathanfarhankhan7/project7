'use client';

import Link from 'next/link';
import { Shield, Search, Brain, BarChart3, AlertTriangle, ThumbsUp, ThumbsDown, MessageSquare, Sparkles, Check, ArrowRight, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LandingNav, LandingFooter } from '@/components/landing-nav';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">AI-Powered Review Analysis</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Know the Truth
            <br />
            <span className="text-gradient">Before You Buy</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            AI-powered review analysis, fake review detection, and product trust scoring.
            Make informed purchasing decisions with confidence.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link href={user ? '/dashboard' : '/signup'}>
              <Button size="lg" className="text-base px-8">
                {user ? 'Go to Dashboard' : 'Start Analyzing Free'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/#features">
              <Button variant="outline" size="lg" className="text-base px-8">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Trust Score Preview Card */}
          <div className="mt-16 max-w-2xl mx-auto animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <Card className="glass border-border/50 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Wireless Headphones Pro</p>
                      <p className="text-xs text-muted-foreground">amazon.com • 2,847 reviews</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gradient-blue">87</div>
                    <p className="text-xs text-muted-foreground">Trust Score</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-success/20 text-success border-success/30">Positive 72%</Badge>
                  <Badge className="bg-warning/20 text-warning border-warning/30">Neutral 18%</Badge>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">Negative 10%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Products Analyzed', value: '50K+' },
              { label: 'Reviews Processed', value: '12M+' },
              { label: 'Fake Reviews Detected', value: '1.2M+' },
              { label: 'Accuracy Rate', value: '94%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-gradient-blue">{stat.value}</div>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Everything you need to verify
              <br />
              <span className="text-gradient-blue">product authenticity</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive AI tools to analyze, verify, and compare products before purchasing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'Review Analysis', desc: 'Deep NLP analysis of customer reviews to extract meaningful insights and patterns.' },
              { icon: AlertTriangle, title: 'Fake Review Detection', desc: 'Advanced algorithms detect suspicious review patterns, repeated wording, and rating manipulation.' },
              { icon: TrendingUp, title: 'Sentiment Analysis', desc: 'Understand customer sentiment with positive, neutral, and negative breakdowns.' },
              { icon: BarChart3, title: 'Product Comparison', desc: 'Compare multiple products side by side with trust scores, pros, cons, and recommendations.' },
              { icon: Sparkles, title: 'AI Recommendations', desc: 'Get personalized purchase recommendations based on comprehensive analysis.' },
              { icon: Shield, title: 'Trust Score Generation', desc: 'A single 1-100 score that captures overall product trustworthiness at a glance.' },
            ].map((feature, i) => (
              <Card key={feature.title} className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Three steps to <span className="text-gradient-blue">trust</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Paste a Product URL', desc: 'Submit any product link from Amazon, Flipkart, eBay, Walmart, App Store, and more.' },
              { step: '02', title: 'AI Analyzes Reviews', desc: 'Our NLP engine processes reviews, detects fakes, and analyzes sentiment in seconds.' },
              { step: '03', title: 'Get Your Trust Score', desc: 'Receive a comprehensive report with trust score, recommendations, and actionable insights.' },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="text-6xl font-bold text-primary/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Simple, transparent <span className="text-gradient-blue">pricing</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">Start free. Upgrade when you need more.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                features: ['5 analyses per month', 'Basic sentiment analysis', 'Trust score generation', 'Community support'],
                cta: 'Get Started',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$19',
                period: 'per month',
                features: ['Unlimited analyses', 'Fake review detection', 'PDF reports', 'AI chat assistant', 'Product comparison', 'Priority support'],
                cta: 'Start Pro Trial',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: '$99',
                period: 'per month',
                features: ['Everything in Pro', 'API access', 'Bulk analysis', 'Custom integrations', 'Dedicated support', 'Team management'],
                cta: 'Contact Sales',
                highlight: false,
              },
            ].map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.highlight ? 'border-primary shadow-lg shadow-primary/10' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={user ? '/dashboard' : '/signup'} className="block">
                    <Button className={`w-full ${plan.highlight ? '' : 'variant-outline'}`} variant={plan.highlight ? 'default' : 'outline'}>
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Trusted by <span className="text-gradient-blue">thousands</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Chen', role: 'Smart Shopper', text: 'ResolveAI saved me from buying a product with mostly fake reviews. The trust score is incredibly accurate!', rating: 5 },
              { name: 'Marcus Johnson', role: 'Tech Reviewer', text: 'The sentiment analysis and fake review detection are game-changers. I use it before every purchase now.', rating: 5 },
              { name: 'Priya Sharma', role: 'E-commerce Manager', text: 'As someone in e-commerce, this tool is invaluable for understanding real customer sentiment. Highly recommended.', rating: 5 },
            ].map((t) => (
              <Card key={t.name}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm">
                      {t.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Frequently asked <span className="text-gradient-blue">questions</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              { q: 'What is a Trust Score?', a: 'The Trust Score is a 1-100 rating that summarizes a product\'s overall trustworthiness based on sentiment analysis, fake review detection, ratings, and review volume. Higher scores indicate more trustworthy products.' },
              { q: 'Which platforms are supported?', a: 'ResolveAI supports Amazon, Flipkart, Meesho, Myntra, eBay, Walmart, Best Buy, AliExpress, App Store, Google Play Store, and general review websites.' },
              { q: 'How does fake review detection work?', a: 'Our AI engine analyzes patterns like repeated wording, review bursts (many reviews in a short time), generic praise, and rating manipulation to identify potentially inauthentic reviews.' },
              { q: 'Can I compare products?', a: 'Yes! The comparison tool lets you analyze multiple products and compare them side by side with trust scores, sentiment breakdowns, pros, cons, and recommendations.' },
              { q: 'Is my data secure?', a: 'We use Supabase with row-level security to ensure your data is protected. Only you can access your analyses, reports, and chat history.' },
              { q: 'Can I export reports?', a: 'Pro and Enterprise plan users can generate downloadable PDF reports with full analysis details, sentiment breakdowns, and recommendations.' },
            ].map((faq) => (
              <AccordionItem key={faq.q} value={faq.q} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-base font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Start making <span className="text-gradient">informed decisions</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of smart shoppers who trust ResolveAI before buying.
          </p>
          <Link href={user ? '/dashboard' : '/signup'}>
            <Button size="lg" className="text-base px-8">
              {user ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
