/**
 * External GPU video worker (Python creative-engine on GPU host).
 * Not run on Vercel — set CREATIVE_WORKER_URL to your worker base URL.
 */

export type GpuVideoRequest = {
  prompt: string;
  productName?: string;
  format?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  scriptText?: string;
  variantLabel?: string;
};

export type GpuVideoResult = {
  success: boolean;
  jobId?: string;
  status: 'QUEUED' | 'COMPLETED' | 'FAILED';
  previewUrl?: string;
  error?: string;
  provider: 'GPU_WORKER' | 'UNCONFIGURED';
};

export function hasGpuWorker(): boolean {
  return Boolean(process.env.CREATIVE_WORKER_URL?.trim());
}

export async function queueGpuVideoRender(input: GpuVideoRequest): Promise<GpuVideoResult> {
  const base = process.env.CREATIVE_WORKER_URL?.replace(/\/$/, '');
  if (!base) {
    return { success: false, status: 'FAILED', error: 'CREATIVE_WORKER_URL not set', provider: 'UNCONFIGURED' };
  }

  const res = await fetch(`${base}/api/generate-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: input.prompt,
      product_name: input.productName || 'Grabber Product',
      format: input.format || 'SHORT_FORM_30S',
      aspect_ratio: input.aspectRatio || '9:16',
      duration_seconds: input.durationSeconds ?? 15,
      script_text: input.scriptText,
      variant_label: input.variantLabel,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      success: false,
      status: 'FAILED',
      error: `GPU worker HTTP ${res.status}: ${text.slice(0, 200)}`,
      provider: 'GPU_WORKER',
    };
  }

  const data = (await res.json()) as {
    success?: boolean;
    job_id?: string;
    status?: string;
    preview_url?: string;
  };

  return {
    success: data.success !== false,
    jobId: data.job_id,
    status: (data.status as GpuVideoResult['status']) || 'QUEUED',
    previewUrl: data.preview_url,
    provider: 'GPU_WORKER',
  };
}
