/**
 * GRABBER BUSINESS OS — SEO KEYWORD OPPORTUNITY SCORER
 * Normalized 0–100 calculation based on:
 * - Search Demand: 25%
 * - Commercial Intent: 25%
 * - Ranking Gap: 20%
 * - Competition: 15%
 * - Conversion Potential: 15%
 */

export interface KeywordScoringInput {
  keyword: string;
  searchDemandScore: number;    // 0–100 (relative monthly search volume)
  commercialIntentScore: number;// 0–100 (how close searcher is to buying)
  rankingGapScore: number;      // 0–100 (gap between current rank and top 3)
  competitionEaseScore: number; // 0–100 (100 = easy competition, 0 = saturated)
  conversionPotentialScore: number; // 0–100 (historic product conversion)
}

export interface KeywordOpportunityScore {
  keyword: string;
  totalScore: number; // 0–100 normalized
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  breakdown: {
    searchDemand: number;
    commercialIntent: number;
    rankingGap: number;
    competitionEase: number;
    conversionPotential: number;
  };
  explanation: string;
}

export class SeoOpportunityScorer {
  public static calculateScore(input: KeywordScoringInput): KeywordOpportunityScore {
    const demand = Math.min(100, Math.max(0, input.searchDemandScore)) * 0.25;
    const intent = Math.min(100, Math.max(0, input.commercialIntentScore)) * 0.25;
    const gap = Math.min(100, Math.max(0, input.rankingGapScore)) * 0.20;
    const comp = Math.min(100, Math.max(0, input.competitionEaseScore)) * 0.15;
    const conv = Math.min(100, Math.max(0, input.conversionPotentialScore)) * 0.15;

    const total = Math.round(demand + intent + gap + comp + conv);

    let priority: KeywordOpportunityScore['priority'] = 'MEDIUM';
    if (total >= 85) priority = 'CRITICAL';
    else if (total >= 72) priority = 'HIGH';
    else if (total >= 50) priority = 'MEDIUM';
    else priority = 'LOW';

    let explanation = `Keyword "${input.keyword}" scored ${total}/100. `;
    if (intent >= 20) {
      explanation += 'Strong commercial buying intent. ';
    }
    if (gap >= 15) {
      explanation += 'Significant ranking headroom available. ';
    }
    if (total >= 75) {
      explanation += 'High recommendation to optimize product title, meta tags, and FAQ content.';
    }

    return {
      keyword: input.keyword,
      totalScore: total,
      priority,
      breakdown: {
        searchDemand: Math.round(demand * 4),
        commercialIntent: Math.round(intent * 4),
        rankingGap: Math.round(gap * 5),
        competitionEase: Math.round(comp * 6.67),
        conversionPotential: Math.round(conv * 6.67),
      },
      explanation,
    };
  }
}
