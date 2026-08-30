# GRABBER BUSINESS OS — CREATIVE FACTORY & MEDIA LIBRARY SPECIFICATION
**Abstracted Provider Pipeline, Decoupled Async Worker & Media Asset Management**

---

## 1. Decoupled Architecture

* **Independent Operation:** The core Business OS is 100% operational without GPU hardware or the Creative Factory.
* **Asynchronous Background Worker:** Creative generation tasks are submitted to a database job queue and processed by an optional dedicated Python/GPU worker or cloud API.
* **Provider Abstraction (`VideoProvider`):** Enables swapping models (Wan 2.1, LTX, Hunyuan, Cloud APIs) seamlessly without rewriting core logic.

```
       BUSINESS OS CORE (Next.js / Node.js)
                 │
                 │  Enqueue Render Job
                 ▼
         CREATIVE_JOBS TABLE (Queue)
                 │
                 ▼
    PYTHON CREATIVE WORKER (Asynchronous)
                 │
   ┌─────────────┴─────────────┐
   ▼                           ▼
VIDEO PROVIDER ADAPTER     PIPER TTS & WHISPER
 (Wan / LTX / Hunyuan)     (Voiceover & Audio)
   │                           │
   └─────────────┬─────────────┘
                 │
                 ▼
           FFMPEG ENGINE
 (Timeline, Music, Captions, Ducking)
                 │
                 ▼
          FINISHED VIDEO
                 │
                 ▼
           MEDIA LIBRARY
```

---

## 2. Multi-Format & Long-Form Video Pipeline

### 2.1 Short-Form (Social & Ads)
* **Durations:** 15s, 30s, 45s, 60s, 90s.
* **Aspect Ratios:** 9:16 (TikTok, Reels, Shorts), 1:1 (Square Feed), 16:9 (Landscape).
* **Use Cases:** Flash sale promotions, product showcase, customer testimonials, UGC hook videos.

### 2.2 Long-Form (Brand & Educational)
* **Durations:** 2m, 5m, 10m, 20m+.
* **Structured Hierarchy:**
  $$\text{Project} \longrightarrow \text{Script} \longrightarrow \text{Chapters} \longrightarrow \text{Scenes} \longrightarrow \text{Shots} \longrightarrow \text{Voice} \longrightarrow \text{Music} \longrightarrow \text{Captions} \longrightarrow \text{Timeline} \longrightarrow \text{Render}$$

---

## 3. Central Media Library

Every asset stored in the Media Library includes structured metadata:
* `id`, `title`, `asset_type` (`PRODUCT_IMAGE`, `PRODUCT_VIDEO`, `STOCK_FOOTAGE`, `AI_GENERATED`, `LOGO`, `BRAND_ASSET`, `MUSIC`, `SFX`, `VOICE`, `FINISHED_VIDEO`).
* `source`, `license`, `file_url`, `mime_type`, `size_bytes`, `duration_seconds`, `resolution`, `tags`, `owner_id`, `created_at`.
