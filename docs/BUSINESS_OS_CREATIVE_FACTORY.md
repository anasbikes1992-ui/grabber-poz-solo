# Grabber Business OS — Creative Factory (Honest Spec)

**Claims boundary:** Creative is an **add-on**. Core POS/storefront works without GPU.  
See [`CLAIMS_AND_SCOPE.md`](./CLAIMS_AND_SCOPE.md) tiers C0–C2.

---

## 1. Architecture (as implemented)

```text
Next.js (/creative/*, /api/creative/*)
      → job_outbox (CREATIVE_RENDER | CREATIVE_PDF)
      → processors (creative-job-processor, creative-pdf-processor)
      → optional CREATIVE_WORKER_URL (GPU FastAPI — not on Vercel)
      → optional FAL_KEY / REPLICATE_API_TOKEN (images)
      → pdf-lib (PDF Studio, in-process)
      → media_assets + Creative Library UI
```

Social Channel Manager (`/social`) merges handles, pixels, feeds, and links into Creative.

---

## 2. What works without GPU

| Feature | Status |
|---------|--------|
| PDF Studio (price list, catalog, flyer, …) | ✅ In-app |
| UGC hooks / scripts / storyboard persistence | ✅ In-app |
| Video/UGC **job queue** | ✅ |
| Approve campaign → storefront hero | ✅ |
| Brand kit | ✅ |
| Marketing Yatra prompt pack | ✅ |
| Dev placeholder / product-image fallback | ✅ |

---

## 3. What needs extra infra

| Feature | Requirement |
|---------|-------------|
| Live AI video / UGC render | `CREATIVE_WORKER_URL` → `creative-engine` on GPU host |
| Cloud image gen | `FAL_KEY` or `REPLICATE_API_TOKEN` |
| Auto-post to Meta/TikTok | **Not implemented** — copy URL / open profile only |

Python stub worker: `creative-engine/main.py` (`npm run creative:start`). Treat stub preview URLs as non-production until real inference is wired.

---

## 4. Media library metadata

Assets use `media_assets` (`asset_type`, `file_url`, `mime_type`, tags, etc.).  
Finished renders should be saved into the library when jobs complete.

---

## 5. Forbidden marketing lines

- “AI videos run entirely on Vercel”  
- “One-click publish to Instagram Ads”  
- Bundling C2 GPU as “included in CORE”
