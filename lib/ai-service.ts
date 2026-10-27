import type { Analysis, Product, RecommendationLevel } from './types';
import { supabase } from './supabase-client';

export interface AnalysisInput {
  productName: string;
  productUrl?: string;
  platform?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  category?: string;
}

export interface FetchedProductData {
  name: string;
  url: string;
  platform: string;
  image_url: string | null;
  category: string | null;
  price: number | null;
  rating: number | null;
  review_count: number | null;
  reviews: ReviewSample[];
  meta_description: string | null;
}

export interface ReviewSample {
  text: string;
  rating: number;
  date?: string | null;
  author?: string | null;
}

const POSITIVE_WORDS = [
  'excellent', 'amazing', 'great', 'love', 'perfect', 'awesome', 'fantastic',
  'wonderful', 'best', 'superb', 'outstanding', 'brilliant', 'impressed',
  'recommend', 'quality', 'durable', 'reliable', 'fast', 'easy', 'beautiful',
  'comfortable', 'worth', 'premium', 'satisfied', 'happy', 'good', 'nice',
  'smooth', 'works', 'value', 'helpful', 'convenient', 'sturdy', 'solid',
  'crisp', 'clear', 'responsive', 'intuitive', 'lightweight', 'compact',
  'powerful', 'efficient', 'quiet', 'tasty', 'fresh', 'authentic',
];

const NEGATIVE_WORDS = [
  'terrible', 'awful', 'bad', 'worst', 'hate', 'horrible', 'poor', 'disappointed',
  'disappointing', 'broken', 'defective', 'useless', 'waste', 'cheap', 'flimsy',
  'slow', 'difficult', 'hard', 'uncomfortable', 'ugly', 'overpriced', 'refund',
  'return', 'failed', 'falling apart', 'not working', 'stopped working', 'broke',
  'damaged', 'missing', 'wrong', 'issue', 'problem', 'complaint', 'frustrating',
  'annoying', 'misleading', 'fake', 'scam', 'unreliable', 'blurry', 'laggy',
  'noisy', 'heavy', 'bulky', 'stale', 'sour', 'rancid', 'leaked', 'cracked',
];

const NEUTRAL_WORDS = [
  'okay', 'ok', 'fine', 'average', 'decent', 'moderate', 'standard', 'normal',
  'regular', 'typical', 'expected', 'adequate', 'sufficient', 'fair', 'acceptable',
];

const NEGATION_WORDS = ['not', 'no', "n't", 'never', 'hardly', 'barely', 'without'];

const INTENSIFIERS = ['very', 'extremely', 'really', 'so', 'incredibly', 'super', 'highly'];

const COMPLAINT_PATTERNS = [
  'stopped working', 'broke', 'defective', 'poor quality', 'cheap material',
  'overpriced', 'not as described', 'slow shipping', 'bad packaging',
  'poor customer service', 'no response', 'missing parts', 'wrong item',
  'fell apart', 'stopped charging', 'battery life', 'screen issue',
  'size issue', 'color difference', 'late delivery', 'damaged on arrival',
  'not worth', 'waste of money', 'poor battery', 'heating issue',
  'connectivity problem', 'wifi issue', 'bluetooth issue', 'audio problem',
  'sound quality', 'camera quality', 'build quality', 'customer support',
  'return policy', 'warranty issue', 'fake product', 'counterfeit',
];

const FAKE_REVIEW_INDICATORS = [
  'great product', 'highly recommend', 'amazing product', 'love this',
  'best ever', 'must buy', 'five stars', 'perfect product',
  'buy now', '10/10', 'highly recommended', 'game changer',
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Build Quality': ['quality', 'build', 'material', 'sturdy', 'durable', 'cheap', 'flimsy', 'solid', 'premium', 'well-built', 'construction'],
  'Value for Money': ['price', 'expensive', 'overpriced', 'worth', 'value', 'affordable', 'cost', 'budget', 'money', 'costly', 'reasonable'],
  'Performance': ['fast', 'slow', 'performance', 'works', 'reliable', 'efficient', 'speed', 'laggy', 'responsive', 'powerful', 'smooth'],
  'Design': ['design', 'look', 'beautiful', 'ugly', 'color', 'aesthetic', 'style', 'appearance', 'sleek', 'modern', 'compact'],
  'Durability': ['broke', 'broken', 'durable', 'last', 'stopped', 'fell apart', 'sturdy', 'long-lasting', 'wear', 'tear'],
  'Customer Service': ['service', 'support', 'refund', 'return', 'response', 'helpful', 'warranty', 'unhelpful', 'rude', 'friendly'],
  'Shipping': ['delivery', 'shipping', 'arrived', 'package', 'fast', 'slow', 'damaged', 'packaging', 'courier', 'tracking'],
  'Ease of Use': ['easy', 'difficult', 'simple', 'complicated', 'convenient', 'intuitive', 'user-friendly', 'setup', 'install'],
  'Battery': ['battery', 'charging', 'charge', 'power', 'drain', 'long-lasting', 'backup'],
  'Audio': ['sound', 'audio', 'speaker', 'noise', 'volume', 'bass', 'quality', 'crisp', 'loud'],
  'Camera': ['camera', 'photo', 'picture', 'image', 'lens', 'resolution', 'blurry', 'focus'],
};

function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('amazon.')) return 'Amazon';
  if (lower.includes('flipkart.')) return 'Flipkart';
  if (lower.includes('meesho.')) return 'Meesho';
  if (lower.includes('myntra.')) return 'Myntra';
  if (lower.includes('ebay.')) return 'eBay';
  if (lower.includes('walmart.')) return 'Walmart';
  if (lower.includes('bestbuy.')) return 'Best Buy';
  if (lower.includes('aliexpress.')) return 'AliExpress';
  if (lower.includes('apps.apple.com')) return 'App Store';
  if (lower.includes('play.google.com')) return 'Google Play';
  if (lower.includes('etsy.')) return 'Etsy';
  if (lower.includes('target.')) return 'Target';
  return 'Unknown';
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\b[\w']+\b/g) ?? [];
}

function countSentimentWithNegation(text: string): { positive: number; negative: number; neutral: number } {
  const tokens = tokenize(text);
  let pos = 0, neg = 0, neu = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prevToken = i > 0 ? tokens[i - 1] : '';
    const prevPrevToken = i > 1 ? tokens[i - 2] : '';
    const isNegated = NEGATION_WORDS.includes(prevToken) || NEGATION_WORDS.includes(prevPrevToken);

    if (POSITIVE_WORDS.includes(token)) {
      if (isNegated) neg++;
      else pos++;
    }
    if (NEGATIVE_WORDS.includes(token)) {
      if (isNegated) pos++;
      else neg++;
    }
    if (NEUTRAL_WORDS.includes(token)) neu++;
  }
  return { positive: pos, negative: neg, neutral: neu };
}

function detectFakeReviews(reviews: ReviewSample[]): {
  flags: Record<string, unknown>;
  percentage: number;
  suspiciousIndices: number[];
} {
  const suspiciousIndices: number[] = [];
  let suspiciousCount = 0;

  const textGroups = new Map<string, number[]>();
  reviews.forEach((review, idx) => {
    const normalized = review.text.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!textGroups.has(normalized)) textGroups.set(normalized, []);
    textGroups.get(normalized)!.push(idx);
  });

  textGroups.forEach((indices) => {
    if (indices.length > 2) {
      suspiciousIndices.push(...indices);
      suspiciousCount += indices.length;
    }
  });

  const recentReviews = reviews.filter(
    (r) => r.date && Date.now() - new Date(r.date).getTime() < 7 * 24 * 60 * 60 * 1000
  );
  const reviewBurst = recentReviews.length > reviews.length * 0.3;

  const genericPraise = reviews.filter((r) =>
    FAKE_REVIEW_INDICATORS.some((ind) => r.text.toLowerCase().includes(ind))
  );

  const ratingOnly5 = reviews.filter((r) => r.rating === 5).length;
  const ratingDistribution = ratingOnly5 / (reviews.length || 1);
  const ratingManipulation = ratingDistribution > 0.7 && reviews.length > 20;

  const shortReviews = reviews.filter((r) => r.text.trim().split(/\s+/).length < 5);
  const excessiveShort = shortReviews.length > reviews.length * 0.5;

  reviews.forEach((review, idx) => {
    const words = tokenize(review.text);
    const wordSet = new Set(words);
    const uniqueRatio = words.length > 0 ? wordSet.size / words.length : 1;
    if (uniqueRatio < 0.4 && words.length > 10) {
      if (!suspiciousIndices.includes(idx)) suspiciousIndices.push(idx);
      suspiciousCount++;
    }
  });

  if (reviewBurst) suspiciousCount += Math.floor(recentReviews.length * 0.3);
  if (ratingManipulation) suspiciousCount += 5;
  if (excessiveShort) suspiciousCount += Math.floor(shortReviews.length * 0.2);
  suspiciousCount += Math.min(genericPraise.length, 10);

  const percentage = Math.min(
    Math.round((suspiciousCount / (reviews.length || 1)) * 100),
    100
  );

  return {
    flags: {
      repeatedWording: textGroups.size < reviews.length * 0.7,
      reviewBurst,
      genericPraiseCount: genericPraise.length,
      ratingManipulation,
      excessiveShortReviews: excessiveShort,
      suspiciousCount,
      totalReviews: reviews.length,
    },
    percentage,
    suspiciousIndices,
  };
}

function extractTopics(reviews: ReviewSample[]): { topic: string; weight: number; sentiment: string }[] {
  const topicMap = new Map<string, { count: number; sentiment: number }>();

  reviews.forEach((review) => {
    const text = review.text.toLowerCase();
    const sentiment = countSentimentWithNegation(review.text);
    const reviewSentiment = sentiment.positive > sentiment.negative ? 1 : sentiment.negative > sentiment.positive ? -1 : 0;

    Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
      const found = keywords.some((kw) => text.includes(kw));
      if (found) {
        if (!topicMap.has(topic)) topicMap.set(topic, { count: 0, sentiment: 0 });
        const entry = topicMap.get(topic)!;
        entry.count++;
        entry.sentiment += reviewSentiment;
      }
    });
  });

  return Array.from(topicMap.entries())
    .map(([topic, { count, sentiment }]) => ({
      topic,
      weight: count,
      sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
}

function detectComplaints(reviews: ReviewSample[]): string[] {
  const complaintMap = new Map<string, { count: number; examples: string[] }>();

  reviews.forEach((review) => {
    if (review.rating <= 2 || (review.rating === 0 && countSentimentWithNegation(review.text).negative > 0)) {
      const text = review.text.toLowerCase();
      COMPLAINT_PATTERNS.forEach((pattern) => {
        if (text.includes(pattern)) {
          const existing = complaintMap.get(pattern);
          if (existing) {
            existing.count++;
            if (existing.examples.length < 2) existing.examples.push(review.text.slice(0, 120));
          } else {
            complaintMap.set(pattern, { count: 1, examples: [review.text.slice(0, 120)] });
          }
        }
      });
    }
  });

  return Array.from(complaintMap.entries())
    .filter(([, { count }]) => count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([complaint]) => complaint.charAt(0).toUpperCase() + complaint.slice(1));
}

function extractAspectSentiments(reviews: ReviewSample[]): { aspect: string; positive: number; negative: number; neutral: number; mentions: number }[] {
  const aspectMap = new Map<string, { positive: number; negative: number; neutral: number; mentions: number }>();

  reviews.forEach((review) => {
    const text = review.text.toLowerCase();
    Object.entries(TOPIC_KEYWORDS).forEach(([aspect, keywords]) => {
      const found = keywords.some((kw) => text.includes(kw));
      if (found) {
        if (!aspectMap.has(aspect)) aspectMap.set(aspect, { positive: 0, negative: 0, neutral: 0, mentions: 0 });
        const entry = aspectMap.get(aspect)!;
        entry.mentions++;
        const sentiment = countSentimentWithNegation(review.text);
        if (sentiment.positive > sentiment.negative) entry.positive++;
        else if (sentiment.negative > sentiment.positive) entry.negative++;
        else entry.neutral++;
      }
    });
  });

  return Array.from(aspectMap.entries())
    .map(([aspect, data]) => ({ aspect, ...data }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 8);
}

function calculateTrustScore(
  sentiment: { positive: number; neutral: number; negative: number },
  fakePercentage: number,
  rating: number,
  reviewCount: number
): number {
  let score = 50;
  score += sentiment.positive * 0.35;
  score -= sentiment.negative * 0.4;
  score -= fakePercentage * 0.3;
  if (rating > 0) score += (rating - 3) * 8;
  if (reviewCount > 100) score += 5;
  if (reviewCount > 500) score += 5;
  score = Math.max(1, Math.min(100, Math.round(score)));
  return score;
}

function getRecommendation(trustScore: number): RecommendationLevel {
  if (trustScore >= 75) return 'highly_recommended';
  if (trustScore >= 55) return 'recommended';
  if (trustScore >= 35) return 'consider_alternatives';
  return 'avoid';
}

function generatePositiveHighlights(reviews: ReviewSample[], topics: { topic: string; sentiment: string }[]): string[] {
  const highlights: string[] = [];
  topics
    .filter((t) => t.sentiment === 'positive')
    .forEach((t) => highlights.push(`Strong ${t.topic.toLowerCase()} performance noted by reviewers`));

  const positiveReviews = reviews.filter((r) => r.rating >= 4);
  if (positiveReviews.length > reviews.length * 0.5) {
    highlights.push('Majority of users are satisfied with their purchase');
  }
  if (positiveReviews.length > reviews.length * 0.7) {
    highlights.push('Excellent overall user satisfaction');
  }

  const durabilityMentions = positiveReviews.filter((r) =>
    r.text.toLowerCase().match(/durable|sturdy|long.lasting|quality|well.built/)
  ).length;
  if (durabilityMentions > 3) {
    highlights.push('Reported to be durable and well-built');
  }

  const valueMentions = positiveReviews.filter((r) =>
    r.text.toLowerCase().match(/worth|value|affordable|reasonably.priced/)
  ).length;
  if (valueMentions > 3) {
    highlights.push('Good value for money according to reviewers');
  }

  if (highlights.length === 0 && reviews.length > 0) {
    const realPositive = positiveReviews.slice(0, 2).map((r) => r.text.slice(0, 100));
    highlights.push(...realPositive);
  }
  return highlights.slice(0, 5);
}

function generateNegativeHighlights(reviews: ReviewSample[], topics: { topic: string; sentiment: string }[]): string[] {
  const highlights: string[] = [];
  topics
    .filter((t) => t.sentiment === 'negative')
    .forEach((t) => highlights.push(`${t.topic} concerns raised by multiple users`));

  const negativeReviews = reviews.filter((r) => r.rating <= 2);
  if (negativeReviews.length > reviews.length * 0.2) {
    highlights.push('Significant portion of users reported issues');
  }

  const durabilityIssues = negativeReviews.filter((r) =>
    r.text.toLowerCase().match(/broke|stopped|broken|fell apart|cracked/)
  ).length;
  if (durabilityIssues > 3) {
    highlights.push('Durability and longevity concerns');
  }

  const serviceIssues = negativeReviews.filter((r) =>
    r.text.toLowerCase().match(/customer.service|support|refund|return|warranty|no.response/)
  ).length;
  if (serviceIssues > 3) {
    highlights.push('Customer service and support complaints');
  }

  if (highlights.length === 0 && reviews.length > 0) {
    const realNegative = negativeReviews.slice(0, 2).map((r) => r.text.slice(0, 100));
    if (realNegative.length > 0) {
      highlights.push(...realNegative);
    } else {
      highlights.push('Minor issues reported by some users');
    }
  }
  return highlights.slice(0, 5);
}

function generateSummary(
  productName: string,
  trustScore: number,
  sentiment: { positive: number; neutral: number; negative: number },
  fakePercentage: number,
  recommendation: RecommendationLevel,
  reviewCount: number,
  hasRealData: boolean
): string {
  const recText = {
    highly_recommended: 'highly recommended',
    recommended: 'recommended',
    consider_alternatives: 'worth considering alternatives before purchasing',
    avoid: 'not recommended',
  }[recommendation];

  const sentimentDesc =
    sentiment.positive > 60
      ? 'overwhelmingly positive'
      : sentiment.positive > 40
        ? 'generally positive'
        : sentiment.negative > 40
          ? 'predominantly negative'
          : 'mixed';

  const dataNote = hasRealData
    ? `Based on analysis of ${reviewCount} real reviews extracted from the product page, `
    : `Based on analysis of ${reviewCount} reviews, `;

  return `${dataNote}customer sentiment for the ${productName} is ${sentimentDesc} with ${sentiment.positive.toFixed(0)}% positive, ${sentiment.neutral.toFixed(0)}% neutral, and ${sentiment.negative.toFixed(0)}% negative reviews. ${fakePercentage > 20 ? `Approximately ${fakePercentage}% of reviews show suspicious patterns that may be inauthentic. ` : ''}The trust score of ${trustScore}/100 indicates this product is ${recText}.`;
}

export function analyzeReviews(
  productName: string,
  reviews: ReviewSample[],
  productData: Partial<FetchedProductData>
): {
  product: Partial<Product>;
  analysis: Omit<Analysis, 'id' | 'product_id' | 'user_id' | 'created_at'> & {
    aspect_sentiments?: { aspect: string; positive: number; negative: number; neutral: number; mentions: number }[];
  };
} {
  const platform = productData.platform || (productData.url ? detectPlatform(productData.url) : 'Unknown');
  const reviewCount = productData.review_count || reviews.length;
  const rating = productData.rating || 0;
  const hasRealData = reviews.length > 0;

  const sentimentCounts = reviews.reduce(
    (acc, r) => {
      const s = countSentimentWithNegation(r.text);
      acc.positive += s.positive;
      acc.negative += s.negative;
      acc.neutral += s.neutral;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );

  const totalSentiment = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral || 1;
  const sentiment = {
    positive: (sentimentCounts.positive / totalSentiment) * 100,
    neutral: (sentimentCounts.neutral / totalSentiment) * 100,
    negative: (sentimentCounts.negative / totalSentiment) * 100,
  };

  const fakeDetection = detectFakeReviews(reviews);
  const topics = extractTopics(reviews);
  const complaints = detectComplaints(reviews);
  const aspectSentiments = extractAspectSentiments(reviews);
  const trustScore = calculateTrustScore(sentiment, fakeDetection.percentage, rating, reviewCount);
  const recommendation = getRecommendation(trustScore);

  const positiveHighlights = generatePositiveHighlights(reviews, topics);
  const negativeHighlights = generateNegativeHighlights(reviews, topics);
  const summary = generateSummary(
    productName,
    trustScore,
    sentiment,
    fakeDetection.percentage,
    recommendation,
    reviewCount,
    hasRealData
  );

  return {
    product: {
      name: productName,
      url: productData.url,
      platform,
      category: productData.category || 'General',
      price: productData.price ?? null,
      rating: rating > 0 ? parseFloat(rating.toFixed(1)) : null,
      review_count: reviewCount,
      image_url: productData.image_url || null,
    },
    analysis: {
      trust_score: trustScore,
      recommendation,
      sentiment_positive: parseFloat(sentiment.positive.toFixed(1)),
      sentiment_neutral: parseFloat(sentiment.neutral.toFixed(1)),
      sentiment_negative: parseFloat(sentiment.negative.toFixed(1)),
      summary,
      positive_highlights: positiveHighlights,
      negative_highlights: negativeHighlights,
      common_complaints: complaints,
      fake_review_flags: fakeDetection.flags,
      fake_review_percentage: fakeDetection.percentage,
      topics,
      aspect_sentiments: aspectSentiments,
    },
  };
}

export async function fetchProductFromUrl(url: string): Promise<FetchedProductData | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/product-fetch`;
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      console.error('Edge function returned non-OK:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.error) {
      console.error('Edge function error:', data.error);
      return null;
    }

    return data.product as FetchedProductData;
  } catch (err) {
    console.error('Failed to fetch product from URL:', err);
    return null;
  }
}

export function analyzeProduct(input: AnalysisInput): {
  product: Partial<Product>;
  analysis: Omit<Analysis, 'id' | 'product_id' | 'user_id' | 'created_at'> & {
    aspect_sentiments?: { aspect: string; positive: number; negative: number; neutral: number; mentions: number }[];
  };
} {
  const platform = input.platform || (input.productUrl ? detectPlatform(input.productUrl) : 'Unknown');
  const reviewCount = input.reviewCount || 0;
  const rating = input.rating || 0;

  const emptyResult = {
    product: {
      name: input.productName,
      url: input.productUrl,
      platform,
      category: input.category || 'General',
      price: input.price ?? null,
      rating: rating > 0 ? parseFloat(rating.toFixed(1)) : null,
      review_count: reviewCount,
      image_url: null,
    } as Partial<Product>,
    analysis: {
      trust_score: 50,
      recommendation: 'consider_alternatives' as RecommendationLevel,
      sentiment_positive: 0,
      sentiment_neutral: 100,
      sentiment_negative: 0,
      summary: `No review text was available for ${input.productName}. The analysis could not be completed with real data. Please provide a product URL to fetch actual reviews.`,
      positive_highlights: [] as string[],
      negative_highlights: [] as string[],
      common_complaints: [] as string[],
      fake_review_flags: { noData: true } as Record<string, unknown>,
      fake_review_percentage: 0,
      topics: [] as { topic: string; weight: number; sentiment: string }[],
      aspect_sentiments: [],
    } as Omit<Analysis, 'id' | 'product_id' | 'user_id' | 'created_at'> & {
      aspect_sentiments?: { aspect: string; positive: number; negative: number; neutral: number; mentions: number }[];
    },
  };

  return emptyResult;
}

export function generateChatResponse(
  question: string,
  context?: { productName?: string; analysis?: Analysis | null }
): string {
  const q = question.toLowerCase();

  if (q.includes('worth') || q.includes('should i buy') || q.includes('recommend')) {
    if (context?.analysis) {
      const score = context.analysis.trust_score;
      if (score >= 75) {
        return `Based on the analysis, ${context.productName || 'this product'} is highly recommended. With a trust score of ${score}/100, it shows strong positive sentiment and minimal fake review activity. The majority of users are satisfied with their purchase.`;
      } else if (score >= 55) {
        return `${context.productName || 'This product'} is recommended with a trust score of ${score}/100. While it has positive aspects, be aware of the highlighted concerns. It's a solid choice but consider your specific needs.`;
      } else if (score >= 35) {
        return `I'd suggest considering alternatives to ${context.productName || 'this product'}. The trust score of ${score}/100 indicates some concerns. Check the negative highlights and common complaints before making a decision.`;
      } else {
        return `Based on the analysis, I recommend avoiding ${context.productName || 'this product'}. The trust score of ${score}/100 is low, with significant negative sentiment and potential issues. There are likely better alternatives available.`;
      }
    }
    return 'Please analyze a product first, and I can give you a specific recommendation based on its trust score and sentiment analysis.';
  }

  if (q.includes('complaint') || q.includes('problem') || q.includes('issue')) {
    if (context?.analysis && context.analysis.common_complaints.length > 0) {
      return `The most common complaints about ${context.productName || 'this product'} are: ${context.analysis.common_complaints.map((c) => `\n• ${c}`).join('')}. These issues were mentioned by multiple reviewers and are worth considering before purchasing.`;
    }
    return 'No specific complaints were detected in the analysis. Try analyzing a product first.';
  }

  if (q.includes('alternative') || q.includes('cheaper') || q.includes('better')) {
    return `For alternatives to ${context?.productName || 'your product'}, I recommend looking for products in the same category with trust scores above 70. You can use the comparison tool to compare multiple products side by side. Consider factors like price, trust score, and sentiment when choosing alternatives.`;
  }

  if (q.includes('trust score') || q.includes('score')) {
    if (context?.analysis) {
      return `The trust score for ${context.productName || 'this product'} is ${context.analysis.trust_score}/100. This score is calculated based on sentiment analysis (${context.analysis.sentiment_positive}% positive), fake review detection (${context.analysis.fake_review_percentage}% suspicious), overall rating, and review volume. A score above 75 is excellent, 55-74 is good, 35-54 suggests caution, and below 35 means the product should be avoided.`;
    }
    return 'Trust scores range from 1-100 and are calculated using sentiment analysis, fake review detection, ratings, and review volume. Analyze a product to see its specific trust score.';
  }

  if (q.includes('sentiment') || q.includes('feeling') || q.includes('opinion')) {
    if (context?.analysis) {
      return `Customer sentiment for ${context.productName || 'this product'} breaks down as: ${context.analysis.sentiment_positive}% positive, ${context.analysis.sentiment_neutral}% neutral, and ${context.analysis.sentiment_negative}% negative. ${context.analysis.sentiment_positive > 50 ? 'The overall sentiment is positive.' : context.analysis.sentiment_negative > 40 ? 'The overall sentiment leans negative.' : 'Sentiment is mixed.'}`;
    }
    return 'Sentiment analysis categorizes reviews into positive, neutral, and negative. Analyze a product to see its sentiment breakdown.';
  }

  if (q.includes('fake') || q.includes('authentic') || q.includes('real')) {
    if (context?.analysis) {
      return `Approximately ${context.analysis.fake_review_percentage}% of reviews for ${context.productName || 'this product'} show suspicious patterns. ${context.analysis.fake_review_percentage > 20 ? 'This is a significant amount and may indicate review manipulation. Be cautious of overly positive reviews.' : 'This is within a normal range and most reviews appear authentic.'}`;
    }
    return 'Fake review detection analyzes patterns like repeated wording, review bursts, generic praise, and rating manipulation. Analyze a product to see the results.';
  }

  if (q.includes('compare') || q.includes('comparison')) {
    return 'You can compare multiple products using the Comparison tool. Analyze products first, then add them to the comparison to see side-by-side ratings, trust scores, sentiment breakdowns, pros, cons, and recommendations.';
  }

  if (q.includes('aspect') || q.includes('feature') || q.includes('category breakdown')) {
    if (context?.analysis) {
      const topics = context.analysis.topics;
      if (topics.length > 0) {
        return `Here's the aspect-based breakdown for ${context.productName || 'this product'}: ${topics.map((t) => `\n• ${t.topic}: ${t.sentiment} (${t.weight} mentions)`).join('')}. This shows which specific aspects of the product users are most satisfied or dissatisfied with.`;
      }
    }
    return 'Aspect-based sentiment analysis breaks down reviews by specific product features like build quality, value, performance, etc. Analyze a product to see the breakdown.';
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return "Hello! I'm the ResolveAI Assistant. I can help you understand product analyses, compare products, explain trust scores, detect fake reviews, analyze sentiment by aspect, and suggest alternatives. What would you like to know?";
  }

  if (q.includes('how') && (q.includes('work') || q.includes('analyze'))) {
    return 'ResolveAI works by fetching real product data and reviews from the URL you provide. It then analyzes the actual review text using natural language processing to determine sentiment, detect fake reviews, extract topics and complaints, and calculate a trust score. All analysis is based on real review data, not generated or simulated.';
  }

  if (q.includes('what') && q.includes('can') && (q.includes('do') || q.includes('help'))) {
    return "I can help you with: understanding trust scores, reviewing sentiment breakdowns, identifying common complaints, detecting fake reviews, comparing products, and getting recommendations. Just ask me about any analyzed product!";
  }

  if (context?.analysis) {
    return `Based on the analysis of ${context.productName || 'this product'}, the trust score is ${context.analysis.trust_score}/100 with ${context.analysis.sentiment_positive}% positive sentiment. ${context.analysis.summary} You can ask me about specific complaints, alternatives, the trust score, sentiment breakdown, or aspect analysis.`;
  }

  return 'I can help you understand product analyses, compare products, explain trust scores, detect fake reviews, analyze sentiment by aspect, and suggest alternatives. Try asking "Is this product worth buying?" or "What are the common complaints?" after analyzing a product.';
}
