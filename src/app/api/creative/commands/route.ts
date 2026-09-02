import { NextResponse } from 'next/server';
import {
  MARKETING_YATRA_CATEGORIES,
  MARKETING_YATRA_PROMPTS,
  listMarketingYatraPrompts,
} from '@/lib/creative/marketing-yatra-prompts';

/** List Marketing Yatra Gemini slash commands (60 prompts, 6 categories). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const prompts = category
    ? listMarketingYatraPrompts(category as Parameters<typeof listMarketingYatraPrompts>[0])
    : MARKETING_YATRA_PROMPTS;

  return NextResponse.json({
    success: true,
    source: 'Marketing Yatra · Google Gemini Video Ads (2026 Edition)',
    categories: MARKETING_YATRA_CATEGORIES,
    prompts,
    total: MARKETING_YATRA_PROMPTS.length,
  });
}
