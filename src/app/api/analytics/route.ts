import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/analytics/service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle') || 'solobuilder';

    const analytics = await AnalyticsService.getAnalyticsOverview(handle);
    return NextResponse.json({ success: true, analytics });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
