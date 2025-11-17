'use server'

export async function searchPlace(query: string) {
    if (!query) return null;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error searching place:', error);
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
