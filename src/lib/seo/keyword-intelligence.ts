/**
 * GRABBER BUSINESS OS — KEYWORD INTELLIGENCE ENGINE
 * Classifies search intents: Commercial, Transactional, Informational, and Local queries.
 */

import { SeoOpportunityScorer, type KeywordOpportunityScore } from './opportunity-scorer';

export type SearchIntent = 'COMMERCIAL' | 'TRANSACTIONAL' | 'INFORMATIONAL' | 'LOCAL';

export interface KeywordRecord {
  keyword: string;
  intent: SearchIntent;
  targetProductCategory?: string;
  targetUrl?: string;
  monthlySearchVolumeEst: number;
  cpcLkrEst: number;
  opportunity: KeywordOpportunityScore;
}

export class KeywordIntelligenceEngine {
  public static classifyIntent(keyword: string): SearchIntent {
    const q = keyword.toLowerCase().trim();

    // 1. Local intent (use word boundaries for short acronyms like 'lk')
    if (/\b(colombo|kandy|galle|jaffna|negombo|matara|near me|sri lanka|lk)\b/.test(q)) {
      return 'LOCAL';
    }

    // 2. Transactional intent
    if (/\b(order|buy online|delivery|cash on delivery|cod|checkout|purchase)\b/.test(q)) {
      return 'TRANSACTIONAL';
    }

    // 3. Commercial investigation intent
    if (/\b(buy|price|cost|shop|store|supplier|wholesale|discount|offer|best price)\b/.test(q)) {
      return 'COMMERCIAL';
    }

    // 4. Informational intent
    return 'INFORMATIONAL';
  }

  public static evaluateKeyword(keyword: string, category = 'General'): KeywordRecord {
    const intent = this.classifyIntent(keyword);

    let demand = 65;
    let commercial = 50;
    let gap = 70;
    let competition = 60;
    let conv = 50;

    switch (intent) {
      case 'TRANSACTIONAL':
        commercial = 95;
        conv = 85;
        demand = 70;
        break;
      case 'COMMERCIAL':
        commercial = 85;
        conv = 75;
        demand = 80;
        break;
      case 'LOCAL':
        commercial = 80;
        conv = 80;
        gap = 85;
        competition = 75;
        break;
      case 'INFORMATIONAL':
        commercial = 30;
        conv = 25;
        demand = 90;
        break;
    }

    const opportunity = SeoOpportunityScorer.calculateScore({
      keyword,
      searchDemandScore: demand,
      commercialIntentScore: commercial,
      rankingGapScore: gap,
      competitionEaseScore: competition,
      conversionPotentialScore: conv,
    });

    return {
      keyword,
      intent,
      targetProductCategory: category,
      monthlySearchVolumeEst: intent === 'INFORMATIONAL' ? 2400 : 850,
      cpcLkrEst: intent === 'TRANSACTIONAL' ? 45 : 20,
      opportunity,
    };
  }
}
