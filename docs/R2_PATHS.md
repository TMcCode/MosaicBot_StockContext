# Stock Context — R2 / CDN paths

## Locked public URL pattern (Phase 0)

| Setting | Value |
|---------|--------|
| **Publish bucket** | `stockthemes-public` (same bucket as [stockthemes.ai](https://stockthemes.ai); one Cloudflare CDN origin) |
| **Object prefix** | `stockcontext/` |
| **Public base URL** | `https://storage.stockthemes.ai/stockcontext/` |
| **GH Pages env** | `DATA_BASE_URL=https://storage.stockthemes.ai/stockcontext/` |

Publisher (`stockcontext_jobs/publish_stockcontext.py` — dedicated Cloud Run job, not admin dashboard) writes with keys like:

`gs://stockthemes-public/stockcontext/manifest.v0.json`

The static app resolves assets as `{DATA_BASE_URL}{relative_path}` — e.g.  
`https://storage.stockthemes.ai/stockcontext/tickers/NVDA/meta.v0.json`

**Cache-Control:** `public, max-age=300` on manifest/feeds (short); `public, max-age=86400` on per-ticker files (refresh via new `build_id` in manifest when needed).

**CORS:** Same bucket CORS as stockthemes (allow GitHub Pages origin + local dev).

**Private automation state** stays on `mosaic_themes` (R2 via `storage_compat`) — not on the public bucket.

---

## Automation state (private — `mosaic_themes`)

| Path | Purpose |
|------|---------|
| `text_tables/Earnings_Automation_State.parquet` | Per `(ticker, earnings_date)` cycle |
| `text_tables/Transcript_Completion_Ledger.parquet` | Dedup post-earnings transcript runs |
| `text_tables/Ticker_Default_Theme.parquet` | Manual default theme per ticker |
| `text_tables/Theme_Refresh_State.parquet` | Last full theme refresh (T1/T2) |
| `text_tables/Theme_T1_Pending.parquet` | One row per theme awaiting nightly T1 (deduped from B) |
| `text_tables/Automation_Queues.parquet` | Pre/post/theme queues |
| `text_tables/Automation_Gemini_Daily_Spend.parquet` | Daily Gemini pool (ET calendar day) |
| `text_tables/Automation_Config.parquet` | Admin-editable daily cap (`gemini_daily_cap_usd`); falls back to `AUTOMATION_GEMINI_DAILY_CAP_USD` env |
| `text_tables/LLM_Automation_Audit.parquet` | Optional automation approve audit |

Live thesis tables: `text_tables/{TableName}.parquet` (unchanged from admin).

---

## Published site JSON (`stockthemes-public` / `stockcontext/`)

```
stockcontext/
  manifest.v0.json                 # Site index + ticker + theme lists + feed URLs
  search_index.v0.json             # Search / browse (tickers + themes)
  feeds/
    home.v0.json                   # Home sections (movers, recent notes, …)
    focus_list.v0.json             # Optional v1.1 — manual focus tickers
  themes/
    index.v0.json                  # All themes (slug, name, meta_url) — static /theme/[slug] paths
    {slug}/
      meta.v0.json                 # Pre-baked constituents → ticker meta_url links
  tickers/
    {SYMBOL}/                      # SYMBOL uppercase, e.g. NVDA
      meta.v0.json
      chart_1y.v0.json
      financials.v0.json
      tables/
        index.v0.json
        {table_slug}.v0.json       # e.g. overview.v0.json
```

### Relative URLs in manifest

Manifest and `tables/index` store **paths relative to `data_base_url`** (no leading slash), e.g. `tickers/NVDA/meta.v0.json`.

### `build_id`

Monotonic or git-sha string in `manifest.v0.json`. Frontend may append `?b={build_id}` for cache-bust during development only; production relies on CDN TTL + overwrite publish.

---

## Schema & examples

JSON Schema: [`schemas/`](schemas/)  
Examples: [`examples/`](examples/)
