# 21st.dev Design Sync — MyPoz themes

Published **2026-09-11** (public community library).

| Theme | Live URL |
|-------|----------|
| MyPoz Emerald | https://21st.dev/community/themes/mypoz-emerald-1789083408973 |
| MyPoz Storefront | https://21st.dev/community/themes/mypoz-storefront-1789083411415 |
| MyPoz Ocean | https://21st.dev/community/themes/mypoz-ocean-1789083413813 |
| MyPoz Salon | https://21st.dev/community/themes/mypoz-salon-1789083416216 |

Source CSS: `themes/mypoz-*.css`

## Re-publish

Each `publish-theme` creates a **new** public theme (no upsert). API key: `21st_sk_…` via `--api-key` or `TWENTYFIRST_TOKEN` — **never commit the key**.

```powershell
$env:TWENTYFIRST_TOKEN = '21st_sk_…'   # from https://21st.dev/settings/api-keys
npx @21st-dev/cli publish-theme ./themes/mypoz-default.css --name "MyPoz Emerald" --tags dark,saas,minimal --api-key $env:TWENTYFIRST_TOKEN
```

## In-app

Tokens: `src/app/globals.css` + `storefrontThemeStyle()` (`--sf-ring`, `--sf-on-accent` for dark-preset contrast).
