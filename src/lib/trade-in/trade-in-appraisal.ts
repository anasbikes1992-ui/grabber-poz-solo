export const CONDITION_GRADES = ['A', 'B', 'C', 'D'] as const;
export type ConditionGrade = (typeof CONDITION_GRADES)[number];

const GRADE_MULTIPLIERS: Record<ConditionGrade, number> = {
  A: 0.65,
  B: 0.5,
  C: 0.35,
  D: 0.2,
};

export function appraiseTradeIn(baseValue: number, grade: ConditionGrade) {
  const mult = GRADE_MULTIPLIERS[grade] ?? 0.35;
  return Math.round(baseValue * mult);
}
