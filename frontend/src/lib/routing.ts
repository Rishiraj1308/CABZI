'use server'

const getBaseUrl = () => {
  // For Vercel deployments, VERCEL_URL is automatically set.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // For local development, we default to localhost.
  return 'http://localhost:3000';
}

// This function now calls our Next.js API route with an absolute URL
export async function searchPlace(query: string) {
    if (!query) return null;

    const baseUrl = getBaseUrl();
    const absoluteUrl = `${baseUrl}/api/search?q=${encodeURIComponent(query)}`;

    console.log(`Searching for place via our API: ${query}`);
    try {
        console.log(`Fetching URL: ${absoluteUrl}`);
        const response = await fetch(absoluteUrl);

        console.log(`Our API response status: ${response.status}`);

        if (!response.ok) {
            console.error(`Our API request failed with status ${response.status}`);
            const errorText = await response.text();
            console.error(`Error response body: ${errorText}`);
            return null;
        }

        const data = await response.json();
        console.log('Our API response data:', JSON.stringify(data, null, 2));
        return data;
    } catch (error) {
        console.error('Error calling our search API:', error);
        return null;
    }
}

export async function getRoute(start: { lat: number, lon: number }, end: { lat: number, lon: number }) {
    try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching route:', error);
        return null;
    }
}
