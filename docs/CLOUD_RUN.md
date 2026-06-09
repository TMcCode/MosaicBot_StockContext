# Cloud Run — Stock Context

Jobs live in **MosaicBotMain_Local_Dev** (`stockcontext_jobs/`). Deploy via GitHub Actions; schedule via Cloud Scheduler scripts.

See [CI_CD.md](CI_CD.md) for the full matrix.

## Automation jobs (one image, four jobs)

| Cloud Run job | Scheduler (ET) | Module |
|---------------|----------------|--------|
| `stockcontext-pre-earnings` | 00:00 daily | `stockcontext_jobs.run_pre_earnings` |
| `stockcontext-post-transcript-night` | 00:10 daily | `stockcontext_jobs.run_post_transcript` |
| `stockcontext-earnings-notes` | 03:00 daily | `stockcontext_jobs.run_earnings_notes` |
| `stockcontext-theme-updates` | 05:00 daily | `stockcontext_jobs.run_theme_updates` |
| `stockcontext-post-transcript-midday` | 12:00 Mon–Fri | `…run_post_transcript --midday` |

Deploy: `.github/workflows/deploy-stockcontext-automation.yml`  
Schedulers: `./scripts/setup_stockcontext_automation_schedulers.sh`

## Publish job

| Cloud Run job | Scheduler (ET) | Module |
|---------------|----------------|--------|
| `stockcontext-publish-job` | **02:00** daily | `publish_stockcontext --feeds-only --upload` (after A+B) |
| `stockcontext-publish-job` | **06:00** daily | `publish_stockcontext --mode incremental --upload` (after notes + themes) |

Deploy: `.github/workflows/deploy-stockcontext-publish.yml`  
Scheduler: `./scripts/setup_stockcontext_publish_scheduler.sh`  
Alerts: `NOTIFY_EMAIL=… ./scripts/setup_stockcontext_publish_alerts.sh` (failed execution, running >2h, no success in 10h)

## Website

**Not** Cloud Run — **mosaicbot_stockcontext** `deploy-pages.yml` (GitHub Pages: ~2:30 AM, ~9 AM, ~10:30 AM ET daily; skip gate when `as_of` unchanged).

## Resources

Automation jobs use **32Gi / 8 CPU** until validated after the memory fix below. They set `MARKET_PERF_SKIP_REALTIME_SNAPSHOT=1` and read **ETL snapshots** (`ticker_metrics_with_ntm_latest.parquet`, `recent_earnings_latest.parquet`, `etf_data_latest.parquet`) instead of `last_realtime_data_latest.parquet`.

## Environment

- `AUTOMATION_DRY_RUN=0` in production jobs
- R2: `R2_*`, `MOSAIC_THEMES_BUCKET=mosaic-themes`
- LLM: `GEMINI_API_KEY`, `OPENAI_API_KEY`
- Transcripts: `FMP_API_KEY`, `MOSAIC_TRANSCRIPTS_BUCKET=mosaic-transcripts`

Staging: set `AUTOMATION_DRY_RUN=1` on a one-off execute or use `--dry-run` locally.

## Logging

Structured fields: `run_id`, `job`, `slot`, `tickers_planned`, `tickers_done`, `spend_usd`, `errors[]`.
