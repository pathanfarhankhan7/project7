// ResolveAI Product Fetch Edge Function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProductData {
  name: string;
  url: string;
  platform: string;
  image_url: string | null;
  category: string | null;
  price: number | null;
  rating: number | null;
  review_count: number | null;
  reviews: { text: string; rating: number; date: string | null; author: string | null }[];
  meta_description: string | null;
}

function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("amazon.")) return "Amazon";
  if (lower.includes("flipkart.")) return "Flipkart";
  if (lower.includes("meesho.")) return "Meesho";
  if (lower.includes("myntra.")) return "Myntra";
  if (lower.includes("ebay.")) return "eBay";
  if (lower.includes("walmart.")) return "Walmart";
  if (lower.includes("bestbuy.")) return "Best Buy";
  if (lower.includes("aliexpress.")) return "AliExpress";
  if (lower.includes("apps.apple.com")) return "App Store";
  if (lower.includes("play.google.com")) return "Google Play";
  if (lower.includes("etsy.")) return "Etsy";
  if (lower.includes("target.")) return "Target";
  if (lower.includes("shopify.") || lower.includes("myshopify.")) return "Shopify";
  return "Unknown";
}

function extractFromJsonLd(html: string): Partial<ProductData> {
  const results: Partial<ProductData> = {};
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const type = item["@type"];
        if (type === "Product" || type === "IndividualProduct") {
          if (item["name"] && !results.name) results.name = item["name"];
          if (item["image"]) {
            const img = Array.isArray(item["image"]) ? item["image"][0] : item["image"];
            if (typeof img === "string") results.image_url = img;
          }
          if (item["category"] && !results.category) results.category = item["category"];
          if (item["offers"]) {
            const offers = Array.isArray(item["offers"]) ? item["offers"][0] : item["offers"];
            if (offers?.["price"]) results.price = parseFloat(offers["price"]);
            if (offers?.["priceSpecification"]?.["price"]) {
              results.price = parseFloat(offers["priceSpecification"]["price"]);
            }
          }
          const aggRating = item["aggregateRating"];
          if (aggRating) {
            if (aggRating["ratingValue"]) results.rating = parseFloat(aggRating["ratingValue"]);
            if (aggRating["reviewCount"]) results.review_count = parseInt(aggRating["reviewCount"], 10);
            if (aggRating["ratingCount"] && !results.review_count) {
              results.review_count = parseInt(aggRating["ratingCount"], 10);
            }
          }
          if (item["review"] && Array.isArray(item["review"]) && !results.reviews) {
            results.reviews = item["review"].map((r: Record<string, unknown>) => ({
              text: (r["reviewBody"] as string) || (r["description"] as string) || "",
              rating: r["reviewRating"]?.["ratingValue"] ? parseInt(r["reviewRating"]["ratingValue"], 10) : 0,
              date: (r["datePublished"] as string) || null,
              author: r["author"]?.["name"] ? String(r["author"]["name"]) : null,
            })).filter((r: { text: string }) => r.text.length > 10);
          }
        }
      }
    } catch {
      // skip malformed JSON-LD
    }
  }
  return results;
}

function extractFromMeta(html: string): Partial<ProductData> {
  const results: Partial<ProductData> = {};
  const getMeta = (property: string): string | null => {
    const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, "i");
    const match = html.match(regex);
    return match ? match[1] : null;
  };

  const ogTitle = getMeta("og:title");
  const ogImage = getMeta("og:image");
  const ogDescription = getMeta("og:description");
  const productPrice = getMeta("product:price:amount");
  const ogType = getMeta("og:type");

  if (ogTitle) results.name = ogTitle;
  if (ogImage) results.image_url = ogImage;
  if (ogDescription) results.meta_description = ogDescription;
  if (productPrice) results.price = parseFloat(productPrice);
  if (ogType === "product") results.category = "Product";

  return results;
}

function extractFromMicrodata(html: string): Partial<ProductData> {
  const results: Partial<ProductData> = {};
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch && !results.name) results.name = titleMatch[1].trim();

  const priceMatch = html.match(/(?:price|(?:\$|£|€|₹)\s*)(\d+(?:[.,]\d{1,2})?)/i);
  if (priceMatch && !results.price) {
    const p = parseFloat(priceMatch[1].replace(",", "."));
    if (!isNaN(p)) results.price = p;
  }

  const ratingMatch = html.match(/(?:rating|stars?)[:\s]*(\d(?:\.\d)?)/i);
  if (ratingMatch && !results.rating) {
    const r = parseFloat(ratingMatch[1]);
    if (r >= 0 && r <= 5) results.rating = r;
  }

  return results;
}

function extractReviews(html: string): { text: string; rating: number; date: string | null; author: string | null }[] {
  const reviews: { text: string; rating: number; date: string | null; author: string | null }[] = [];

  // Amazon-style review blocks
  const reviewDataRegex = /<span[^>]*data-hook=["']review-body["'][^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = reviewDataRegex.exec(html)) !== null && reviews.length < 50) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 20) {
      const surrounding = html.substring(Math.max(0, match.index - 500), match.index + match[1].length + 200);
      const ratingMatch = surrounding.match(/data-hook=["']review-star-rating["'][^>]*.*?(\d(?:\.\d)?)/i);
      const authorMatch = surrounding.match(/data-hook=["']review-author["'][^>]*>([^<]+)<\/span>/i);
      const dateMatch = surrounding.match(/data-hook=["']review-date["'][^>]*>([^<]+)<\/span>/i);
      reviews.push({
        text,
        rating: ratingMatch ? parseInt(ratingMatch[1], 10) : 0,
        date: dateMatch ? dateMatch[1].trim() : null,
        author: authorMatch ? authorMatch[1].trim() : null,
      });
    }
  }

  // Generic review blocks: look for elements with review-related class names
  if (reviews.length === 0) {
    const genericRegex = /<(?:div|p|span)[^>]*class=["'][^"']*(?:review|comment|testimonial)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|span)>/gi;
    while ((match = genericRegex.exec(html)) !== null && reviews.length < 50) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text.length > 30 && text.length < 2000) {
        reviews.push({ text, rating: 0, date: null, author: null });
      }
    }
  }

  return reviews;
}

function extractProductFromHtml(html: string, url: string): ProductData {
  const jsonLdData = extractFromJsonLd(html);
  const metaData = extractFromMeta(html);
  const microdata = extractFromMicrodata(html);
  const reviews = extractReviews(html);

  const merged: ProductData = {
    name: jsonLdData.name || metaData.name || microdata.name || "Unknown Product",
    url,
    platform: detectPlatform(url),
    image_url: jsonLdData.image_url || metaData.image_url || null,
    category: jsonLdData.category || metaData.category || null,
    price: jsonLdData.price ?? metaData.price ?? microdata.price ?? null,
    rating: jsonLdData.rating ?? microdata.rating ?? null,
    review_count: jsonLdData.review_count ?? null,
    reviews: jsonLdData.reviews || reviews,
    meta_description: metaData.meta_description || null,
  };

  return merged;
}

async function fetchProductData(url: string): Promise<ProductData> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product page: ${response.status}`);
  }

  const html = await response.text();
  return extractProductFromHtml(html, url);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: "Only HTTP/HTTPS URLs are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productData = await fetchProductData(url);

    return new Response(
      JSON.stringify({ product: productData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
