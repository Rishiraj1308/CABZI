
export type OsrmResult = {
    distanceKm: number;
    durationMin: number;
    coords: [number, number][];
  };
  
  export async function getDriverToPickupRoute(
    driver: { lat: number; lon: number },
    pickup: { lat: number; lon: number }
  ): Promise<OsrmResult | null> {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${driver.lon},${driver.lat};${pickup.lon},${pickup.lat}` +
      `?overview=full&geometries=geojson&steps=false`;
  
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
  
    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      coords: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]), // [lat,lng]
    };
  }
  
