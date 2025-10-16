
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured on server" }, { status: 500 });
  }

  if (!query) {
    return NextResponse.json({ error: "Missing 'q' parameter for search" }, { status: 400 });
  }

  try {
    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`TomTom Search API error (${res.status}):`, errorBody);
      return NextResponse.json({ error: `TomTom API error: ${res.statusText}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("TomTom search proxy error:", error.message);
    return NextResponse.json({ error: "Failed to fetch from TomTom service" }, { status: 500 });
  }
}
