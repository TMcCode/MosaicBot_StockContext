# Stock Context — CI/CD and schedules

## Repositories

| Repo | Role |
|------|------|
| **MosaicBotMain_Local_Dev** | Cloud Run jobs: automation + publish |
| **mosaicbot_stockcontext** (this repo) | Static site → GitHub Pages |

## GitHub Actions (deploy on push to `main`)

### MosaicBot — Cloud Run

| Workflow | Cloud Run job(s) | Entrypoint |
|----------|------------------|------------|
| `deploy-stockcontext-automation.yml` | `stockcontext-pre-earnings` | `python -m stockcontext_jobs.run_pre_earnings` |
| | `stockcontext-post-transcript-night` | `python -m stockcontext_jobs.run_post_transcript` |
| | `stockcontext-post-transcript-midday` | `…run_post_transcript --midday` |
| | `stockcontext-earnings-notes` | `python -m stockcontext_jobs.run_earnings_notes` |
| | `stockcontext-theme-updates` | `python -m stockcontext_jobs.run_theme_updates` |
| `deploy-stockcontext-publish.yml` | `stockcontext-publish-job` | `python -m stockcontext_jobs.publish_stockcontext` |

### This repo — GitHub Pages

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy-pages.yml` | `push` to `main`, daily schedule, `workflow_dispatch` | Sync R2 → build static export → deploy Pages |

**First-time:** enable **Settings → Pages → GitHub Actions**. Add secrets: `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Optional vars: `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_DATA_BASE_URL`.

## Cloud Scheduler (America/New_York)

Run once after jobs are deployed (from MosaicBot repo):

```bash
./scripts/setup_stockcontext_automation_schedulers.sh
./scripts/setup_stockcontext_publish_scheduler.sh
```

| Local time | Scheduler id | Cloud Run job |
|------------|--------------|---------------|
| **00:00** | `stockcontext-pre-earnings` | Pre-earnings (Process A) |
| **00:10** | `stockcontext-post-transcript-night` | Night transcripts (Process B) |
| **03:00** | `stockcontext-earnings-notes` | Ticker_Notes (Process C) |
| **05:00** | `stockcontext-theme-updates` | Theme T1/T2 |
| **02:00** | `stockcontext-publish-early` | `--feeds-only --upload` (home/marquee + recent ticker/theme sync) |
| **06:00** | `stockcontext-publish-am` | Full incremental publish after notes + themes |
| **12:00** Mon–Fri | `stockcontext-post-transcript-midday` | Midday transcripts |

**Website:** `deploy-pages.yml` runs **twice daily** — ~**2:30 AM ET** (after early publish) and ~**7:30 AM ET** (after morning publish). Push to `main` always rebuilds.

## Nightly order

```text
00:00  pre-earnings (A)
00:10  post-transcript (night, B)
02:00  publish feeds + recent sync (early — A+B batch visible on site)
02:30  GitHub Pages build (early, UTC crons 06:30 + 07:30)
03:00  earnings notes
05:00  theme updates
06:00  publish stockcontext/ JSON (morning — notes + themes)
07:30  GitHub Pages build (morning, 12:30 UTC)
12:00  post-transcript (midday, weekdays)
```

## Publish universe (v1)

- **Ticker pages:** any symbol with ≥1 ticker text-table row (~494); tier/weight from portfolio coverage.
- **Theme index:** all themes in `sym_theme_df` (~874); theme pages only when theme text tables exist.
- **Pending:** listed gray in UI (`has_table_data: false`), no static page until automation fills tables.

## Manual runs

```bash
# MosaicBot (dry-run)
python -m stockcontext_jobs.run_post_transcript --dry-run
python -m stockcontext_jobs.run_earnings_notes --dry-run
python -m stockcontext_jobs.run_theme_updates --dry-run
python -m stockcontext_jobs.publish_stockcontext --dry-run --limit 5

# Trigger Cloud Run job
gcloud run jobs execute stockcontext-earnings-notes --region=us-central1 --project=lateral-raceway-321323

# This repo
gh workflow run deploy-pages.yml -f force_build=true
```

## Secrets (MosaicBot workflows)

- `GCP_SA_KEY`
- `R2_*`
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `FMP_API_KEY` (automation jobs)
