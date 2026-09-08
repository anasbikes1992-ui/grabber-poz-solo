import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SeoAgent } from '@/lib/seo/seo-agent';
import { KeywordIntelligenceEngine } from '@/lib/seo/keyword-intelligence';
import { requireStaffSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    await requireStaffSession();

    const audit = await SeoAgent.runFullAudit();

    const sampleKeywords = [
      'buy online Sri Lanka',
      'cash on delivery shop Colombo',
      'best electronics repair Kandy',
      'wholesale building supplies Sri Lanka',
      'grocery delivery near me',
    ];

    const keywordReports = sampleKeywords.map((kw) => KeywordIntelligenceEngine.evaluateKeyword(kw));

    return NextResponse.json({
      success: true,
      seoAudit: audit,
      highIntentKeywords: keywordReports,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: (err as { status?: number }).status || 500 }
    );
  }
}
