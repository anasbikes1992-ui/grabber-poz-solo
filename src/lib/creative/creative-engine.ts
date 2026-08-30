/**
 * GRABBER BUSINESS OS — CREATIVE FACTORY & MEDIA LIBRARY SERVICE
 * Decoupled Video Generation Pipeline with Provider Abstraction
 */

import {
  MediaAsset,
  CreativeProject,
  CreativeFormat,
  AspectRatio,
  VideoProviderType,
  VideoProvider,
} from './types';

export class MockWanProvider implements VideoProvider {
  name: VideoProviderType = 'WAN21';
  async generateClip(prompt: string, options: { durationSeconds: number; aspectRatio: AspectRatio }) {
    return {
      clipUrl: `/rendered/wan21_${Date.now()}.mp4`,
      duration: options.durationSeconds,
    };
  }
}

export class MockLTXProvider implements VideoProvider {
  name: VideoProviderType = 'LTX';
  async generateClip(prompt: string, options: { durationSeconds: number; aspectRatio: AspectRatio }) {
    return {
      clipUrl: `/rendered/ltx_${Date.now()}.mp4`,
      duration: options.durationSeconds,
    };
  }
}

export class CreativeEngine {
  private providers: Map<VideoProviderType, VideoProvider> = new Map();
  private mediaLibrary: Map<string, MediaAsset> = new Map();
  private projects: Map<string, CreativeProject> = new Map();

  constructor() {
    this.registerProvider(new MockWanProvider());
    this.registerProvider(new MockLTXProvider());
  }

  public registerProvider(provider: VideoProvider) {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: VideoProviderType): VideoProvider | undefined {
    return this.providers.get(name);
  }

  // Media Library Operations
  public addMediaAsset(asset: Omit<MediaAsset, 'id' | 'createdAt'>): MediaAsset {
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullAsset: MediaAsset = {
      ...asset,
      id,
      createdAt: new Date(),
    };
    this.mediaLibrary.set(id, fullAsset);
    return fullAsset;
  }

  public getMediaAsset(id: string): MediaAsset | undefined {
    return this.mediaLibrary.get(id);
  }

  public listMediaAssets(filter?: { assetType?: string; tag?: string }): MediaAsset[] {
    return Array.from(this.mediaLibrary.values()).filter((a) => {
      if (filter?.assetType && a.assetType !== filter.assetType) return false;
      if (filter?.tag && !a.tags.includes(filter.tag)) return false;
      return true;
    });
  }

  // Creative Project Creation
  public createProject(params: {
    title: string;
    productId?: string;
    format: CreativeFormat;
    aspectRatio: AspectRatio;
    createdBy?: string;
  }): CreativeProject {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const project: CreativeProject = {
      id,
      title: params.title,
      productId: params.productId,
      format: params.format,
      aspectRatio: params.aspectRatio,
      chapters: [],
      status: 'DRAFT',
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.projects.set(id, project);
    return project;
  }

  public getProject(id: string): CreativeProject | undefined {
    return this.projects.get(id);
  }
}

export const defaultCreativeEngine = new CreativeEngine();
