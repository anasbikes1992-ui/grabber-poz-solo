/**
 * Creative media rendering — FAL / Replicate with dev-safe fallbacks.
 */
export type RenderCreativeInput = {
  visualPrompt: string;
  productImageUrl?: string | null;
  aspectRatio?: string;
  heroMediaType?: 'image' | 'video';
};

export type RenderCreativeResult = {
  outputUrl: string;
  provider: 'FAL' | 'REPLICATE' | 'PRODUCT_IMAGE' | 'DEV_PLACEHOLDER';
  mediaType: 'image' | 'video';
  stub?: boolean;
};

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1080&h=1920&fit=crop';

function aspectToFalSize(aspectRatio?: string): string {
  if (aspectRatio === '16:9') return 'landscape_16_9';
  if (aspectRatio === '1:1') return 'square';
  return 'portrait_16_9';
}

async function renderWithFal(input: RenderCreativeInput): Promise<RenderCreativeResult | null> {
  const key = process.env.FAL_KEY;
  if (!key) return null;

  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: input.visualPrompt.slice(0, 2000),
      image_size: aspectToFalSize(input.aspectRatio),
      num_inference_steps: 4,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`FAL render failed: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as { images?: Array<{ url?: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error('FAL returned no image URL');

  return {
    outputUrl: url,
    provider: 'FAL',
    mediaType: 'image',
  };
}

async function renderWithReplicate(input: RenderCreativeInput): Promise<RenderCreativeResult | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      version: 'black-forest-labs/flux-schnell',
      input: {
        prompt: input.visualPrompt.slice(0, 2000),
        aspect_ratio: input.aspectRatio === '16:9' ? '16:9' : input.aspectRatio === '1:1' ? '1:1' : '9:16',
        output_format: 'webp',
        output_quality: 80,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Replicate render failed: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as { output?: string | string[]; status?: string; error?: string };
  if (data.status === 'failed') throw new Error(data.error || 'Replicate prediction failed');

  const out = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!out || typeof out !== 'string') throw new Error('Replicate returned no output URL');

  return {
    outputUrl: out,
    provider: 'REPLICATE',
    mediaType: 'image',
  };
}

/** Render campaign hero media — tries FAL, then Replicate, then fallbacks. */
export async function renderCreativeMedia(input: RenderCreativeInput): Promise<RenderCreativeResult> {
  if (input.productImageUrl?.startsWith('http')) {
    return {
      outputUrl: input.productImageUrl,
      provider: 'PRODUCT_IMAGE',
      mediaType: input.heroMediaType === 'video' ? 'video' : 'image',
    };
  }

  try {
    const fal = await renderWithFal(input);
    if (fal) return fal;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
  }

  try {
    const rep = await renderWithReplicate(input);
    if (rep) return rep;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Creative media pipeline not configured (set FAL_KEY or REPLICATE_API_TOKEN)');
  }

  return {
    outputUrl: PLACEHOLDER_IMAGE,
    provider: 'DEV_PLACEHOLDER',
    mediaType: 'image',
    stub: true,
  };
}

export function hasCreativeMediaPipeline(): boolean {
  return Boolean(process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN || process.env.CLOUDINARY_URL);
}
