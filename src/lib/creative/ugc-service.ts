import { eq } from 'drizzle-orm';
import { db, creativeChapters, creativeScenes, products } from '@/db';
import { readBrandBrain } from '@/lib/creative/brand-brain';
import { buildGeminiVideoPrompt } from '@/lib/creative/marketing-yatra-prompts';
import { createCreativeProject, queueCreativeRender } from '@/lib/creative/creative-repo';

export type UgcObjective = 'AWARENESS' | 'CONVERSION' | 'RETARGETING' | 'LAUNCH';
export type UgcStyle = 'authentic' | 'testimonial' | 'unboxing' | 'problem_solution' | 'before_after';

export type UgcHook = { id: string; text: string; score: number };
export type UgcScript = {
  id: string;
  hookId: string;
  title: string;
  fullText: string;
  scenes: UgcScene[];
  cta: string;
};
export type UgcScene = {
  sequence: number;
  beat: 'HOOK' | 'PROBLEM' | 'PRODUCT' | 'BENEFIT' | 'CTA';
  narration: string;
  visualPrompt: string;
  durationSeconds: number;
};

export type UgcCampaignInput = {
  productId?: string;
  productName: string;
  productImageUrl?: string;
  objective: UgcObjective;
  style: UgcStyle;
  variantCount?: number;
  aspectRatio?: string;
  createdBy?: string | null;
};

const HOOK_TEMPLATES: Record<UgcObjective, string[]> = {
  AWARENESS: [
    'Stop scrolling — you need to see this {product}.',
    'Nobody told me {product} could do this…',
    'POV: you finally found {product} that actually works.',
    'This is why everyone in Sri Lanka is talking about {product}.',
    'I was skeptical until I tried {product}.',
  ],
  CONVERSION: [
    'Still paying too much? Meet {product}.',
    '{product} sold out twice — here is why.',
    'Add to cart energy: {product} at this price.',
    'The upgrade your daily routine needed: {product}.',
    'Limited stock on {product} — do not wait.',
  ],
  RETARGETING: [
    'You looked at {product} — still thinking about it?',
    'Cart abandoners: {product} is waiting for you.',
    'Last chance vibe: {product} promo ends soon.',
    'Remember {product}? Here is 10% off today.',
    'Your feed keeps showing {product} for a reason.',
  ],
  LAUNCH: [
    'NEW DROP: {product} just landed.',
    'Launch day — first look at {product}.',
    'We built {product} for one reason: you.',
    'Introducing {product} — pre-order open.',
    'Exclusive launch: {product} available now.',
  ],
};

const STYLE_COMMAND: Record<UgcStyle, string> = {
  authentic: 'unbox-now',
  testimonial: 'honest-take',
  unboxing: 'unbox-now',
  problem_solution: 'ache-to-answer',
  before_after: 'expectation-vs-reality',
};

function fill(template: string, product: string) {
  return template.replace(/\{product\}/g, product);
}

export function generateUgcHooks(productName: string, objective: UgcObjective, count = 10): UgcHook[] {
  const pool = HOOK_TEMPLATES[objective];
  return pool.slice(0, count).map((t, i) => ({
    id: `hook_${i + 1}`,
    text: fill(t, productName),
    score: Math.round(95 - i * 4 + Math.random() * 3),
  }));
}

export function generateUgcScripts(
  productName: string,
  hooks: UgcHook[],
  style: UgcStyle,
  brandTagline: string,
  count = 5,
): UgcScript[] {
  const problemLine =
    style === 'problem_solution'
      ? `Tired of overpaying or settling for less? That was me before ${productName}.`
      : `I kept wasting money until I found something that actually delivers.`;

  return hooks.slice(0, count).map((hook, i) => {
    const benefit =
      style === 'before_after'
        ? `Before: frustration. After: ${productName} — ${brandTagline.toLowerCase()}.`
        : `${productName} gives you quality you can trust — ${brandTagline}.`;

    const cta = 'Tap the link / WhatsApp us to order today.';
    const fullText = [hook.text, problemLine, `Meet ${productName}.`, benefit, cta].join(' ');

    const scenes: UgcScene[] = [
      { sequence: 1, beat: 'HOOK', narration: hook.text, visualPrompt: `Creator selfie hook about ${productName}`, durationSeconds: 3 },
      { sequence: 2, beat: 'PROBLEM', narration: problemLine, visualPrompt: `Relatable frustration scene before ${productName}`, durationSeconds: 4 },
      { sequence: 3, beat: 'PRODUCT', narration: `Meet ${productName}.`, visualPrompt: `Product hero shot ${productName} handheld`, durationSeconds: 5 },
      { sequence: 4, beat: 'BENEFIT', narration: benefit, visualPrompt: `Happy customer using ${productName}`, durationSeconds: 5 },
      { sequence: 5, beat: 'CTA', narration: cta, visualPrompt: `CTA overlay WhatsApp order ${productName}`, durationSeconds: 3 },
    ];

    return {
      id: `script_${i + 1}`,
      hookId: hook.id,
      title: `Variant ${i + 1}: ${hook.text.slice(0, 40)}…`,
      fullText,
      scenes,
      cta,
    };
  });
}

export async function persistUgcStoryboard(projectId: string, scripts: UgcScript[]) {
  for (let ci = 0; ci < scripts.length; ci++) {
    const script = scripts[ci];
    const [chapter] = await db
      .insert(creativeChapters)
      .values({
        projectId,
        sequence: ci + 1,
        title: script.title,
        description: script.fullText,
      })
      .returning();

    for (const scene of script.scenes) {
      await db.insert(creativeScenes).values({
        chapterId: chapter.id,
        projectId,
        sequence: scene.sequence,
        narrationText: scene.narration,
        visualPrompt: scene.visualPrompt,
        durationSeconds: String(scene.durationSeconds),
      });
    }
  }
}

export async function createUgcCampaign(input: UgcCampaignInput) {
  const brand = await readBrandBrain();
  const variantCount = Math.min(Math.max(input.variantCount ?? 5, 1), 10);
  const hooks = generateUgcHooks(input.productName, input.objective, 10);
  const scripts = generateUgcScripts(input.productName, hooks, input.style, brand.tagline, variantCount);

  let productImageUrl = input.productImageUrl;
  if (input.productId && !productImageUrl) {
    const [p] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
    productImageUrl = p?.imageUrl || undefined;
  }

  const commandId = STYLE_COMMAND[input.style] || 'unbox-now';
  const built = buildGeminiVideoPrompt({
    commandId,
    productName: input.productName,
    productImageUrl,
    brandVoice: brand.voice,
  });

  const { project, job } = await createCreativeProject({
    title: `${input.productName} · ${input.objective} · ${input.style}`,
    kind: 'UGC',
    productId: input.productId || null,
    format: 'SHORT_FORM_30S',
    aspectRatio: input.aspectRatio || '9:16',
    visualPrompt: built.visualPrompt,
    productName: input.productName,
    productImageUrl,
    commandId,
    geminiCommand: built.geminiCommand,
    createdBy: input.createdBy || null,
    scriptSummary: scripts[0]?.fullText.slice(0, 220),
  });

  await persistUgcStoryboard(project.id, scripts);

  return {
    projectId: project.id,
    jobId: job.id,
    hooks,
    scripts,
    geminiCommand: built.geminiCommand,
    visualPrompt: built.visualPrompt,
    variantCount: scripts.length,
  };
}

export async function queueUgcVideoRenders(input: {
  projectId: string;
  scripts: UgcScript[];
  productName: string;
  productImageUrl?: string;
  aspectRatio?: string;
  createdBy?: string | null;
}) {
  const jobs: { scriptId: string; jobId: string; projectId: string }[] = [];

  for (const script of input.scripts) {
    const visualPrompt = script.scenes.map((s) => s.visualPrompt).join(' | ');
    const { project, job } = await createCreativeProject({
      title: `${input.productName} · ${script.id}`,
      kind: 'UGC',
      format: 'SHORT_FORM_30S',
      aspectRatio: input.aspectRatio || '9:16',
      visualPrompt,
      productName: input.productName,
      productImageUrl: input.productImageUrl,
      createdBy: input.createdBy || null,
      scriptSummary: script.fullText.slice(0, 220),
    });

    await queueCreativeRender({
      jobId: job.id,
      projectId: project.id,
      visualPrompt,
      productImageUrl: input.productImageUrl,
      aspectRatio: input.aspectRatio || '9:16',
      heroMediaType: 'video',
      renderKind: 'UGC',
      scriptText: script.fullText,
      variantLabel: script.id,
    });

    jobs.push({ scriptId: script.id, jobId: job.id, projectId: project.id });
  }

  return { queued: jobs.length, jobs };
}

export async function loadUgcCampaignDetail(projectId: string) {
  const chapters = await db
    .select()
    .from(creativeChapters)
    .where(eq(creativeChapters.projectId, projectId))
    .orderBy(creativeChapters.sequence);

  const scenes = await db
    .select()
    .from(creativeScenes)
    .where(eq(creativeScenes.projectId, projectId))
    .orderBy(creativeScenes.sequence);

  return { chapters, scenes };
}
