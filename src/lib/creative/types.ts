/**
 * GRABBER BUSINESS OS — CREATIVE FACTORY & MEDIA TYPES
 * Video Provider Abstraction, Script & Storyboarding Hierarchy
 */

export type CreativeFormat =
  | 'SHORT_FORM_15S'
  | 'SHORT_FORM_30S'
  | 'SHORT_FORM_60S'
  | 'SHORT_FORM_90S'
  | 'LONG_FORM_2M'
  | 'LONG_FORM_5M'
  | 'LONG_FORM_10M'
  | 'LONG_FORM_20M';

export type AspectRatio = '9:16' | '1:1' | '16:9';

export type VideoProviderType = 'WAN21' | 'LTX' | 'HUNYUAN' | 'CLOUD';

export interface MediaAsset {
  id: string;
  title: string;
  assetType:
    | 'PRODUCT_IMAGE'
    | 'PRODUCT_VIDEO'
    | 'STOCK_FOOTAGE'
    | 'AI_GENERATED'
    | 'LOGO'
    | 'BRAND_ASSET'
    | 'MUSIC'
    | 'SFX'
    | 'VOICE'
    | 'FINISHED_VIDEO';
  source: 'LOCAL_UPLOAD' | 'AI_GENERATED' | 'STOCK';
  license?: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds?: number;
  resolution?: string; // e.g. "1080x1920"
  tags: string[];
  createdBy?: string;
  createdAt: Date;
}

export interface CreativeShot {
  sequence: number;
  narrationText: string;
  visualPrompt?: string;
  assignedMediaAssetId?: string;
  durationSeconds: number;
}

export interface CreativeScene {
  sequence: number;
  title: string;
  shots: CreativeShot[];
}

export interface CreativeChapter {
  sequence: number;
  title: string;
  description?: string;
  scenes: CreativeScene[];
}

export interface CreativeProject {
  id: string;
  title: string;
  productId?: string;
  format: CreativeFormat;
  aspectRatio: AspectRatio;
  chapters: CreativeChapter[];
  status: 'DRAFT' | 'SCRIPTED' | 'QUEUED' | 'RENDERING' | 'COMPLETED' | 'FAILED';
  outputUrl?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoProvider {
  name: VideoProviderType;
  generateClip(prompt: string, options: { durationSeconds: number; aspectRatio: AspectRatio }): Promise<{ clipUrl: string; duration: number }>;
}
