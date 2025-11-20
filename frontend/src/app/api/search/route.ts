
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CurocityApp/1.0 (contact@curocity.in)',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Nominatim API Error: ${errorText}`);
      return NextResponse.json({ error: 'Failed to fetch from Nominatim' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Internal Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
