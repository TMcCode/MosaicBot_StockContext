# Custom domain — stockcontext.info

Site UI: **https://stockcontext.info** (GitHub Pages + Cloudflare DNS).  
Public JSON stays on the shared R2 CDN: **https://storage.stockthemes.ai/stockcontext/** (same bucket as stockthemes.ai).

## 1. Cloudflare DNS (zone `stockcontext.info`)

In **DNS → Records**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `A` | `@` | `185.199.108.153` | DNS only (grey) recommended for GitHub Pages |
| `A` | `@` | `185.199.109.153` | same |
| `A` | `@` | `185.199.110.153` | same |
| `A` | `@` | `185.199.111.153` | same |
| `CNAME` | `www` | `tmccode.github.io` | DNS only or proxied |

Optional: **Redirect rule** `www.stockcontext.info` → `https://stockcontext.info` (301).

> GitHub’s apex A records are required for `stockcontext.info` without `www`. If SSL errors appear with orange-cloud proxy, switch those records to **DNS only** first; re-enable proxy after Pages shows a valid certificate.

## 2. GitHub Pages (repo `MosaicBot_StockContext`)

1. **Settings → Pages → Custom domain** → enter `stockcontext.info` → Save.
2. Wait for DNS check + certificate (can take up to 24h; usually minutes).
3. Enable **Enforce HTTPS** when available.

## 3. GitHub Actions variables

**Settings → Secrets and variables → Actions → Variables:**

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://stockcontext.info` |
| `NEXT_PUBLIC_BASE_PATH` | *(leave empty or delete)* — apex domain serves from `/`, not `/MosaicBot_StockContext/` |
| `NEXT_PUBLIC_DATA_BASE_URL` | `https://storage.stockthemes.ai/stockcontext/` *(unchanged)* |

Then **Actions → Deploy Stock Context to GitHub Pages → Run workflow** with `force_build=true` (or push to `main`).

## 4. Supabase (same project as stockthemes.ai)

**Authentication → URL configuration:**

- **Site URL:** can stay `https://stockthemes.ai` or set `https://stockcontext.info` if this becomes primary.
- **Redirect URLs** — add:
  - `https://stockcontext.info/**`
  - `https://www.stockcontext.info/**` *(if you use www)*

Keep existing `http://localhost:3000/**` and github.io URLs until you retire the old URL.

## 5. Verify

```bash
curl -sI https://stockcontext.info/ | head -5
curl -s https://storage.stockthemes.ai/stockcontext/manifest.v0.json | head -c 200
```

Sign-in: magic link should return to `https://stockcontext.info/...` after step 4.

## What does *not* change

- Cloud Run publish job, R2 paths, and `STOCKCONTEXT_PUBLIC_BASE_URL` in MosaicBot — still `storage.stockthemes.ai/stockcontext/`.
- stockthemes.ai — separate site and domain.
