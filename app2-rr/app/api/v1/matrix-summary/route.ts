import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/serverAuth';

// Proxy endpoint — fetches today's offline dependency summary from matrix-dashboard
// matrix-dashboard must be running at MATRIX_DASHBOARD_URL
export async function GET(req: NextRequest) {
  const auth = getAuthUser();
  if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const matrixUrl = process.env.MATRIX_DASHBOARD_URL;
  if (!matrixUrl) {
    return NextResponse.json({ success: false, error: 'MATRIX_DASHBOARD_URL not configured' }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    const res = await fetch(`${matrixUrl}/api/v1/entries?date=${date}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 60 }, // cache 60s
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Matrix dashboard returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Matrix dashboard is offline or unreachable', detail: err?.message },
      { status: 503 }
    );
  }
}
