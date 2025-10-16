
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Webhook received:', body);
    return NextResponse.json({ status: 'ok', message: 'Webhook received' });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// Add a GET handler as well for basic testing.
export async function GET() {
  return NextResponse.json({ message: 'n8n webhook endpoint is active.' });
}
