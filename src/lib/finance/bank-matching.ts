import { and, desc, eq, sql } from 'drizzle-orm';
import { bankPaymentMatches, bankStatementLines, db, orderAutomationEvents, orders, payments } from '@/db';

export type BankFeedLineInput = {
  accountId: string;
  statementDate: string | Date;
  amount: number;
  currency?: string;
  description?: string | null;
  bankReference?: string | null;
  rawJson?: Record<string, unknown>;
};

export type PaymentCandidate = {
  id: string;
  amount: string | number;
  providerRef?: string | null;
  status?: string | null;
  createdAt?: Date | string;
};

export function normalizeBankDirection(amount: number) {
  return amount < 0 ? 'DEBIT' : 'CREDIT';
}

export function scorePaymentMatch(line: { amount: number; bankReference?: string | null }, payment: PaymentCandidate) {
  const paymentAmount = Number(payment.amount || 0);
  const difference = Math.round((Math.abs(line.amount) - paymentAmount) * 100) / 100;
  let confidence = Math.abs(difference) <= 0.01 ? 0.7 : 0;
  const ref = String(line.bankReference || '').trim().toLowerCase();
  const providerRef = String(payment.providerRef || '').trim().toLowerCase();
  if (ref && providerRef && ref === providerRef) confidence += 0.3;
  return {
    confidence: Math.min(1, confidence),
    differenceAmount: difference,
    rule: ref && providerRef && ref === providerRef ? 'REF_AND_AMOUNT' : 'AMOUNT_ONLY',
  };
}

export async function importBankStatementLines(lines: BankFeedLineInput[]) {
  let imported = 0;
  for (const line of lines) {
    if (!line.accountId) throw new Error('accountId required');
    if (!Number.isFinite(Number(line.amount))) throw new Error('amount must be numeric');
    const [row] = await db
      .insert(bankStatementLines)
      .values({
        accountId: line.accountId,
        statementDate: new Date(line.statementDate),
        amount: Number(line.amount).toFixed(2),
        currency: line.currency || 'LKR',
        description: line.description || null,
        bankReference: line.bankReference || null,
        direction: normalizeBankDirection(Number(line.amount)),
        status: 'UNMATCHED',
        rawJson: line.rawJson || {},
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    if (row) imported += 1;
  }
  return { imported };
}

export async function proposeBankPaymentMatches(statementLineId?: string) {
  const lineRows = await db
    .select()
    .from(bankStatementLines)
    .where(statementLineId ? eq(bankStatementLines.id, statementLineId) : eq(bankStatementLines.status, 'UNMATCHED'))
    .orderBy(desc(bankStatementLines.statementDate))
    .limit(100);

  let proposed = 0;
  for (const line of lineRows) {
    const amount = Math.abs(Number(line.amount));
    const candidates = await db
      .select()
      .from(payments)
      .where(and(eq(payments.status, 'SUCCESS'), sql`abs(${payments.amount}::numeric - ${amount}) <= 0.01`))
      .limit(10);
    let best: { payment: (typeof candidates)[number]; confidence: number; differenceAmount: number; rule: string } | null = null;
    for (const payment of candidates) {
      const score = scorePaymentMatch({ amount: Number(line.amount), bankReference: line.bankReference }, payment);
      if (!best || score.confidence > best.confidence) best = { payment, ...score };
    }
    if (!best || best.confidence < 0.7) continue;
    await db
      .insert(bankPaymentMatches)
      .values({
        statementLineId: line.id,
        paymentId: best.payment.id,
        matchStatus: best.confidence >= 1 ? 'AUTO_MATCHED' : 'PROPOSED',
        confidence: best.confidence.toFixed(4),
        differenceAmount: best.differenceAmount.toFixed(2),
        rule: best.rule,
      })
      .onConflictDoNothing()
      .catch(() => undefined);
    proposed += 1;
  }
  return { proposed };
}

export async function approveBankPaymentMatch(matchId: string, actorId?: string | null) {
  const [match] = await db.select().from(bankPaymentMatches).where(eq(bankPaymentMatches.id, matchId)).limit(1);
  if (!match) throw new Error('Bank payment match not found');
  const [updated] = await db
    .update(bankPaymentMatches)
    .set({
      matchStatus: 'APPROVED',
      approvedBy: actorId || null,
      approvedAt: new Date(),
    })
    .where(eq(bankPaymentMatches.id, matchId))
    .returning();
  await db
    .update(bankStatementLines)
    .set({ status: 'MATCHED', updatedAt: new Date() })
    .where(eq(bankStatementLines.id, match.statementLineId));
  if (match.paymentId) {
    const [payment] = await db.select().from(payments).where(eq(payments.id, match.paymentId)).limit(1);
    if (payment) {
      const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId)).limit(1);
      if (order) {
        await db.insert(orderAutomationEvents).values({
          orderId: order.id,
          eventKey: 'bank_match',
          label: 'Bank match',
          status: 'DONE',
          idempotencyKey: `bank_match:${match.id}`,
          detailJson: { paymentId: payment.id, statementLineId: match.statementLineId },
          actorId: actorId || null,
          updatedAt: new Date(),
        }).catch(() => undefined);
      }
    }
  }
  return updated;
}

export async function listBankFeed(limit = 100) {
  const [lines, matches] = await Promise.all([
    db.select().from(bankStatementLines).orderBy(desc(bankStatementLines.statementDate)).limit(limit).catch(() => []),
    db.select().from(bankPaymentMatches).orderBy(desc(bankPaymentMatches.createdAt)).limit(limit).catch(() => []),
  ]);
  return { lines, matches };
}
