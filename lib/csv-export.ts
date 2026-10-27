import type { AnalysisWithProduct } from './types';

export function exportAnalysesToCSV(analyses: AnalysisWithProduct[]): string {
  const headers = [
    'Product Name',
    'Platform',
    'Category',
    'Price',
    'Rating',
    'Review Count',
    'Trust Score',
    'Recommendation',
    'Positive %',
    'Neutral %',
    'Negative %',
    'Fake Review %',
    'Summary',
    'Common Complaints',
    'Date Analyzed',
  ];

  const rows = analyses.map((a) => {
    const p = a.product;
    return [
      escapeCSV(p.name || ''),
      escapeCSV(p.platform || ''),
      escapeCSV(p.category || ''),
      p.price?.toFixed(2) || 'N/A',
      p.rating?.toFixed(1) || 'N/A',
      p.review_count?.toString() || 'N/A',
      a.trust_score.toString(),
      a.recommendation,
      a.sentiment_positive.toFixed(1),
      a.sentiment_neutral.toFixed(1),
      a.sentiment_negative.toFixed(1),
      a.fake_review_percentage.toString(),
      escapeCSV(a.summary),
      escapeCSV(a.common_complaints.join('; ')),
      new Date(a.created_at).toLocaleDateString(),
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
