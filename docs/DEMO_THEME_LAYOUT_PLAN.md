# Demo Theme Layout Plan

Status: Approved implementation SSOT.

## Product Decisions

- Demo storefront is a real prospect theme selector, not a mock.
- Keep single-business deployment: one app install, one business, one database.
- Split storefront customization into:
  - `themePreset`: colors, fonts, effects.
  - `layoutTemplate`: homepage/catalog/PDP visual recipe.
  - `verticalPack`: operational feature flags and domain workflows.
- Do not rewrite commerce, POS, stock, checkout APIs, or schema for theme work.
- ThePartyStore remains `layoutTemplate=party` and `presetId=party-pop`.

## Milestones

1. Demo recovery: seed demo catalog, brand as Grabber Demo, use `LANDING_MODE=storefront`, route company CTAs to the working demo.
2. Theme architecture: add `layoutTemplate`, root `data-layout-template`, Vibe/Ocean presets, and builder selectors.
3. Six templates: party, fashion, tech repair, retail wholesale, jewelry, energy.
4. Demo picker and checkout chrome: demo-only picker via host/env/query and checkout on storefront visual tokens.
5. Safe cleanup and docs: quarantine before delete, deprecate legacy import paths, label vertical readiness.

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
npm run demo:seed -- --env-file=.env.demo
```

Demo host env:

- `LANDING_MODE=storefront`
- `NEXT_PUBLIC_DEMO_THEME_PICKER=1`
