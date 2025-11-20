
// Switched to HTTPS for OSRM for better security and to avoid mixed-content issues.
const OSRM_BASE_URL = 'https://router.project-osrm.org';

interface Coordinate {
    lat: number;
    lon: number;
}

// This function now calls our internal API route instead of Nominatim directly
export const searchPlace = async (query: string) => {
    if (!query) return [];
    try {
        // Use a relative path for the API call, which works universally
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            console.error("Search API Error:", await response.text());
            return [];
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Could not fetch search results', error);
        return [];
    }
};

export const getRoute = async (start: Coordinate, end: Coordinate) => {
    const { lat: startLat, lon: startLon } = start;
    const { lat: endLat, lon: endLon } = end;
    
    const url = `${OSRM_BASE_URL}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch route from OSRM');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('OSRM routing error:', error);
        throw error;
    }
};
