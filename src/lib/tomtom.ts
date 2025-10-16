
import axios from 'axios';

// This is a generic helper to call our internal API routes.
async function callInternalApi(endpoint: string, params: Record<string, any>) {
  try {
    // We construct a URL to our OWN API route, not the external TomTom API.
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await axios.get(url.toString());
    return response.data;
  } catch (error: any) {
    console.error(`Error calling internal API route ${endpoint}:`, error.response ? error.response.data : error.message);
    throw new Error(error.response?.data?.error || `Failed to fetch from internal API: ${endpoint}`);
  }
}


export async function searchPlace(
  query: string,
  options?: Record<string, any>
) {
  // Use the new, specific search endpoint
  return callInternalApi('/api/tomtom/search', { q: query, ...options });
}

export async function getRoute(
  origin: {lat: number; lon: number},
  destination: {lat: number; lon: number},
  options?: Record<string, any>
) {
    const locations = `${origin.lat},${origin.lon}:${destination.lat},${destination.lon}`;
    // Use the new, specific route endpoint
    return callInternalApi('/api/tomtom/route', { locations, ...options });
}
