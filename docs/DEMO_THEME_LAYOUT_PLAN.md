# Demo Theme Layout Plan

Status: Implemented for demo recovery and template/preset architecture. Keep this as the SSOT for future template polish.

## Product Decisions

- Demo storefront is a real prospect theme selector, not a mock.
- Keep single-business deployment: one app install, one business, one database.
- Split storefront customization into:
  - `themePreset`: colors, fonts, effects.
  - `layoutTemplate`: homepage/catalog/PDP visual recipe.
  - `verticalPack`: operational feature flags and domain workflows.
- Do not rewrite commerce, POS, stock, checkout APIs, or schema for theme work.
- ThePartyStore remains `layoutTemplate=party` and `presetId=party-pop`.
- `vibe` and `ocean` are implemented visual presets. `vibe` maps to `fashion`; `ocean` maps to `energy`.
- Six layout templates are implemented as root `data-layout-template` values with CSS differentiation: `party`, `fashion`, `tech_repair`, `retail_wholesale`, `jewelry`, and `energy`.

## Milestones

1. Demo recovery: DONE. Demo catalog is non-empty, branded as Grabber Demo, and company CTAs route to the working demo host.
2. Theme architecture: DONE. `layoutTemplate`, root `data-layout-template`, Vibe/Ocean presets, and builder selectors exist.
3. Six templates: IMPLEMENTED. Keep future work to visual refinement, not commerce/API rewrites.
4. Demo picker and checkout chrome: IMPLEMENTED. Demo-only picker uses host/env/query/localStorage, and checkout loads under the storefront shell/API model.
5. Safe cleanup and docs: IN PROGRESS. Quarantine before delete, deprecate legacy import paths, and label vertical readiness.

## Default Resolution

- Party-like presets resolve to `party`.
- `volta` resolves to `tech_repair` only when repairs are enabled; otherwise `retail_wholesale`.
- `vibe` resolves to `fashion`.
- `ocean` resolves to `energy`.
- Everything else resolves to `retail_wholesale`.

## Cleanup Policy

Use three statuses:

- `keep`: active code or documented future capability.
- `quarantine`: gated/archived/deprecated, no direct deletion yet.
- `delete-after-proof`: removable only after reference search, typecheck, focused tests, and full test pass.

Never delete vertical modules only because ThePartyStore does not use them.

## Test Gates

- `npm run typecheck`
- Focused storefront config/theme tests.
- Existing commerce integrity tests stay green.
- Demo seed shows non-zero catalog.
- Visual smoke at 375, 768, 1024, and 1440 widths for each template.

## Demo Recovery Command

Run against the demo database only:

```bash
npm run demo:seed -- --env-file=.env
```

Demo host env:

- `LANDING_MODE` unset for the shared company/demo app. Host routing sends `grabberpoz.com` to the company landing and `demo.grabberpoz.com` to storefront.
- `NEXT_PUBLIC_DEMO_THEME_PICKER=1`
