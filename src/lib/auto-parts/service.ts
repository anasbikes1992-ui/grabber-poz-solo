import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import {
  db,
  vehicleCompatibility,
  vehicleGenerations,
  vehicleMakes,
  vehicleModels,
} from '@/db';
import { assertValidYearRange, normalizeOemCode } from './fitment';

export async function upsertMake(name: string) {
  const cleaned = String(name || '').trim();
  if (!cleaned) throw new Error('make name required');

  const [existing] = await db.select().from(vehicleMakes).where(eq(vehicleMakes.name, cleaned)).limit(1);
  if (existing) return existing;

  const [row] = await db.insert(vehicleMakes).values({ name: cleaned }).returning();
  return row;
}

export async function upsertModel(makeId: string, name: string) {
  const cleaned = String(name || '').trim();
  if (!makeId || !cleaned) throw new Error('makeId and model name required');

  const [existing] = await db
    .select()
    .from(vehicleModels)
    .where(and(eq(vehicleModels.makeId, makeId), eq(vehicleModels.name, cleaned)))
    .limit(1);
  if (existing) return existing;

  const [row] = await db.insert(vehicleModels).values({ makeId, name: cleaned }).returning();
  return row;
}

export async function createGeneration(input: {
  modelId: string;
  name: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  engine?: string | null;
}) {
  const name = String(input.name || '').trim();
  if (!input.modelId || !name) throw new Error('modelId and name required');
  assertValidYearRange(input.yearFrom, input.yearTo);

  const [row] = await db
    .insert(vehicleGenerations)
    .values({
      modelId: input.modelId,
      name,
      yearFrom: input.yearFrom ?? null,
      yearTo: input.yearTo ?? null,
      engine: input.engine || null,
    })
    .returning();
  return row;
}

export async function addCompatibility(input: {
  generationId: string;
  productId: string;
  variantId?: string | null;
  oemCode?: string | null;
  notes?: string | null;
}) {
  if (!input.generationId || !input.productId) throw new Error('generationId and productId required');

  const oem = input.oemCode ? normalizeOemCode(input.oemCode) : null;

  const [row] = await db
    .insert(vehicleCompatibility)
    .values({
      generationId: input.generationId,
      productId: input.productId,
      variantId: input.variantId || null,
      oemCode: oem || null,
      notes: input.notes || null,
    })
    .onConflictDoNothing()
    .returning();

  if (row) return row;

  const [existing] = await db
    .select()
    .from(vehicleCompatibility)
    .where(
      and(
        eq(vehicleCompatibility.generationId, input.generationId),
        eq(vehicleCompatibility.productId, input.productId),
        input.variantId
          ? eq(vehicleCompatibility.variantId, input.variantId)
          : sql`${vehicleCompatibility.variantId} is null`,
      ),
    )
    .limit(1);

  if (existing && oem && existing.oemCode !== oem) {
    const [updated] = await db
      .update(vehicleCompatibility)
      .set({ oemCode: oem, notes: input.notes || existing.notes })
      .where(eq(vehicleCompatibility.id, existing.id))
      .returning();
    return updated;
  }

  return existing;
}

export async function listCompatibilityByProduct(productId: string) {
  return db
    .select({
      id: vehicleCompatibility.id,
      generationId: vehicleCompatibility.generationId,
      productId: vehicleCompatibility.productId,
      variantId: vehicleCompatibility.variantId,
      oemCode: vehicleCompatibility.oemCode,
      notes: vehicleCompatibility.notes,
      generationName: vehicleGenerations.name,
      yearFrom: vehicleGenerations.yearFrom,
      yearTo: vehicleGenerations.yearTo,
      modelId: vehicleGenerations.modelId,
      modelName: vehicleModels.name,
      makeId: vehicleModels.makeId,
      makeName: vehicleMakes.name,
    })
    .from(vehicleCompatibility)
    .innerJoin(vehicleGenerations, eq(vehicleCompatibility.generationId, vehicleGenerations.id))
    .innerJoin(vehicleModels, eq(vehicleGenerations.modelId, vehicleModels.id))
    .innerJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
    .where(eq(vehicleCompatibility.productId, productId));
}

export async function listCompatibilityByGeneration(generationId: string) {
  return db.select().from(vehicleCompatibility).where(eq(vehicleCompatibility.generationId, generationId));
}

export async function searchByVehicle(input: {
  makeId?: string;
  modelId?: string;
  year?: number;
  generationId?: string;
}) {
  const conditions = [];

  if (input.generationId) {
    conditions.push(eq(vehicleCompatibility.generationId, input.generationId));
  }
  if (input.modelId) {
    conditions.push(eq(vehicleGenerations.modelId, input.modelId));
  }
  if (input.makeId) {
    conditions.push(eq(vehicleModels.makeId, input.makeId));
  }
  if (input.year != null) {
    const y = Number(input.year);
    conditions.push(
      and(
        or(sql`${vehicleGenerations.yearFrom} is null`, lte(vehicleGenerations.yearFrom, y)),
        or(sql`${vehicleGenerations.yearTo} is null`, gte(vehicleGenerations.yearTo, y)),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: vehicleCompatibility.id,
      productId: vehicleCompatibility.productId,
      variantId: vehicleCompatibility.variantId,
      oemCode: vehicleCompatibility.oemCode,
      notes: vehicleCompatibility.notes,
      generationId: vehicleGenerations.id,
      generationName: vehicleGenerations.name,
      yearFrom: vehicleGenerations.yearFrom,
      yearTo: vehicleGenerations.yearTo,
      modelName: vehicleModels.name,
      makeName: vehicleMakes.name,
    })
    .from(vehicleCompatibility)
    .innerJoin(vehicleGenerations, eq(vehicleCompatibility.generationId, vehicleGenerations.id))
    .innerJoin(vehicleModels, eq(vehicleGenerations.modelId, vehicleModels.id))
    .innerJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
    .where(where);
}

export async function searchByOem(oemCode: string) {
  const oem = normalizeOemCode(oemCode);
  if (!oem) throw new Error('oemCode required');

  return db
    .select({
      id: vehicleCompatibility.id,
      productId: vehicleCompatibility.productId,
      variantId: vehicleCompatibility.variantId,
      oemCode: vehicleCompatibility.oemCode,
      notes: vehicleCompatibility.notes,
      generationId: vehicleGenerations.id,
      generationName: vehicleGenerations.name,
      yearFrom: vehicleGenerations.yearFrom,
      yearTo: vehicleGenerations.yearTo,
      modelName: vehicleModels.name,
      makeName: vehicleMakes.name,
    })
    .from(vehicleCompatibility)
    .innerJoin(vehicleGenerations, eq(vehicleCompatibility.generationId, vehicleGenerations.id))
    .innerJoin(vehicleModels, eq(vehicleGenerations.modelId, vehicleModels.id))
    .innerJoin(vehicleMakes, eq(vehicleModels.makeId, vehicleMakes.id))
    .where(eq(vehicleCompatibility.oemCode, oem));
}

export async function listMakes() {
  return db.select().from(vehicleMakes).orderBy(vehicleMakes.name);
}

export async function listModels(makeId?: string) {
  if (makeId) {
    return db.select().from(vehicleModels).where(eq(vehicleModels.makeId, makeId)).orderBy(vehicleModels.name);
  }
  return db.select().from(vehicleModels).orderBy(vehicleModels.name);
}

export async function listGenerations(modelId?: string) {
  if (modelId) {
    return db
      .select()
      .from(vehicleGenerations)
      .where(eq(vehicleGenerations.modelId, modelId))
      .orderBy(vehicleGenerations.name);
  }
  return db.select().from(vehicleGenerations).orderBy(vehicleGenerations.name);
}
