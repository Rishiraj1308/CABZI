
import fetch from 'node-fetch';

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if ((lat1 === lat2) && (lon1 === lon2)) {
        return 0;
    }
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

export async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data: any = await response.json();
        return data.display_name || 'Unknown Location';
    } catch (e) {
        console.error("Reverse geocoding error:", e);
        return "Location address not available";
    }
}
