
import axios from 'axios';

// Using the official OSRM demo server, but a self-hosted instance is recommended for production.
const OSRM_API_URL = "https://router.project-osrm.org"; 

// Using the official Nominatim API, which has a strict usage policy (1 req/sec). A self-hosted instance is better for production.
const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org";

/**
 * Searches for a place using the Nominatim API.
 * @param query The search query (e.g., "Cyber Hub, Gurgaon").
 * @returns A promise that resolves with the search results.
 */
export async function searchPlace(query: string): Promise<any> {
  try {
    const url = new URL(`${NOMINATIM_API_URL}/search`);
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '5');
    // Bias search results to India
    url.searchParams.append('countrycodes', 'in');

    const response = await axios.get(url.toString(), {
        headers: {
            'User-Agent': 'Curocity/1.0 (contact@curocity.com)'
        }
    });
    return response.data;
  } catch (error: any) {
    console.error("Nominatim search error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to fetch from Nominatim service");
  }
}

/**
 * Gets a route between two points using the OSRM API.
 * @param origin The starting coordinates.
 * @param destination The ending coordinates.
 * @returns A promise that resolves with the route information.
 */
export async function getRoute(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Promise<any> {
  try {
    const locations = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = `${OSRM_API_URL}/route/v1/driving/${locations}?overview=full&geometries=geojson`;

    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error("OSRM routing error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to fetch route from OSRM service");
  }
}
