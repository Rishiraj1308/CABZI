
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locations = searchParams.get("locations");
  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured on server" }, { status: 500 });
  }

  if (!locations) {
    return NextResponse.json({ error: "Missing 'locations' parameter for routing" }, { status: 400 });
  }

  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${apiKey}&instructionsType=tagged&routeType=fastest`;
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`TomTom Routing API error (${res.status}):`, errorBody);
      return NextResponse.json({ error: `TomTom API error: ${res.statusText}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("TomTom route proxy error:", error.message);
    return NextResponse.json({ error: "Failed to fetch from TomTom service" }, { status: 500 });
  }
}
