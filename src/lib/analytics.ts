import { BetaAnalyticsDataClient } from "@google-analytics/data";

let cachedVisitors: number | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

export async function getTotalVisitors(): Promise<number> {
  const propertyId = process.env.GA_PROPERTY_ID;
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKey) {
    // Graceful fallback if GA credentials are not set yet
    console.warn(
      "Google Analytics credentials not set. Add GA_PROPERTY_ID, GA_CLIENT_EMAIL, and GA_PRIVATE_KEY to .env to show real visitor numbers."
    );
    return 0;
  }

  const now = Date.now();
  // Return cached result if TTL has not expired
  if (cachedVisitors !== null && now - lastFetchTime < CACHE_TTL) {
    return cachedVisitors;
  }

  try {
    const formattedPrivateKey = privateKey
      .replace(/\\n/g, "\n")
      .replace(/"/g, "")
      .trim();

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      },
    });

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "2020-01-01", // Query from absolute start of site tracking
          endDate: "today",
        },
      ],
      metrics: [
        {
          name: "screenPageViews", // Standard metric for total page views in GA4
        },
      ],
    });

    const value = response.rows?.[0]?.metricValues?.[0]?.value;
    if (value) {
      cachedVisitors = parseInt(value, 10);
      lastFetchTime = now;
      return cachedVisitors;
    }
  } catch (error) {
    console.error("Failed to fetch Google Analytics visitor count:", error);
    // Return stale cache if available
    if (cachedVisitors !== null) {
      return cachedVisitors;
    }
  }

  return 0;
}
