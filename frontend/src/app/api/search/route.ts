
import { NextResponse } from 'next/server';

// Base URL for the Nominatim API
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// A unique user agent to identify your application
// IMPORTANT: Replace with your actual app name and contact info
const APP_USER_AGENT = 'Curocity/1.0 (support@curocity.in)';

/**
 * This route acts as a proxy to the Nominatim API.
 * It handles both searching for a place (forward geocoding) and finding an address from coordinates (reverse geocoding).
 * It automatically adds the required User-Agent header to all outgoing requests to comply with Nominatim's usage policy.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  let nominatimUrl;

  if (searchQuery) {
    // Handle forward geocoding (searching for a place)
    nominatimUrl = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`;
  } else if (lat && lon) {
    // Handle reverse geocoding (finding address from lat/lon)
    nominatimUrl = `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lon}&format=json`;
  } else {
    return NextResponse.json(
      { error: 'Either a search query (q) or latitude/longitude (lat, lon) is required.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': APP_USER_AGENT,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nominatim API Error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch data from Nominatim', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
