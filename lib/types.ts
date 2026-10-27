export type UserPlan = 'free' | 'pro' | 'enterprise';
export type UserRole = 'user' | 'admin';
export type RecommendationLevel = 'highly_recommended' | 'recommended' | 'consider_alternatives' | 'avoid';
export type ChatRole = 'user' | 'assistant';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  plan: UserPlan;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  url: string | null;
  image_url: string | null;
  category: string | null;
  price: number | null;
  rating: number | null;
  review_count: number | null;
  platform: string | null;
  created_at: string;
}

export interface Analysis {
  id: string;
  product_id: string;
  user_id: string;
  trust_score: number;
  recommendation: RecommendationLevel;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  summary: string;
  positive_highlights: string[];
  negative_highlights: string[];
  common_complaints: string[];
  fake_review_flags: Record<string, unknown>;
  fake_review_percentage: number;
  topics: { topic: string; weight: number; sentiment: string }[];
  created_at: string;
}

export interface Report {
  id: string;
  analysis_id: string;
  user_id: string;
  title: string;
  is_favorite: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: UserPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  product_id: string | null;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface SavedProduct {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface AnalysisWithProduct extends Analysis {
  product: Product;
}

export interface ProductWithAnalysis extends Product {
  analyses: Analysis[];
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'analysis_complete' | 'report_saved' | 'welcome' | 'system';
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  product_url: string;
  product_name: string;
  platform: string;
  last_trust_score: number | null;
  last_checked: string | null;
  notify_on_change: boolean;
  created_at: string;
}
