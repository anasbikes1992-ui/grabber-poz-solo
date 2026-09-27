const ALLOWED_UPLOADS = [
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], signatures: [[0xff, 0xd8, 0xff]] },
  { mime: 'image/png', extensions: ['png'], signatures: [[0x89, 0x50, 0x4e, 0x47]] },
  { mime: 'image/webp', extensions: ['webp'], signatures: [[0x52, 0x49, 0x46, 0x46]] },
  { mime: 'image/gif', extensions: ['gif'], signatures: [[0x47, 0x49, 0x46, 0x38]] },
] as const;

const ALLOWED_BUCKETS = new Set(['products', 'media', 'storefront']);

export type ValidatedUpload = {
  bytes: Buffer;
  extension: string;
  mimeType: string;
  originalName: string;
};

function extensionFromName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || '';
}

function hasSignature(bytes: Buffer, signatures: readonly (readonly number[])[]) {
  return signatures.some((sig) => sig.every((value, index) => bytes[index] === value));
}

export function safeUploadBucket(input: FormDataEntryValue | null, fallback = 'products') {
  const bucket = String(input || fallback).trim().toLowerCase();
  return ALLOWED_BUCKETS.has(bucket) ? bucket : fallback;
}

export async function validateUploadFile(file: File, maxBytes: number): Promise<ValidatedUpload> {
  if (file.size <= 0) {
    throw new Error('Upload file is empty');
  }
  if (file.size > maxBytes) {
    throw new Error(`Max upload size is ${Math.floor(maxBytes / (1024 * 1024))}MB`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extensionFromName(file.name);
  const declaredMime = file.type.toLowerCase();
  const rule = ALLOWED_UPLOADS.find(
    (item) => item.mime === declaredMime && item.extensions.includes(ext as never),
  );

  if (!rule || !hasSignature(bytes, rule.signatures)) {
    throw new Error('Only JPG, PNG, WEBP, or GIF images are allowed');
  }

  return {
    bytes,
    extension: ext,
    mimeType: rule.mime,
    originalName: file.name,
  };
}
