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

**First-time:** enable **Settings → Pages → GitHub Actions**. Add secrets: `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Vars: `NEXT_PUBLIC_SITE_URL=https://stockcontext.info`, empty `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_DATA_BASE_URL` (CDN). Custom domain: [CUSTOM_DOMAIN.md](CUSTOM_DOMAIN.md).

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
| **~after 22:00 chain** | `stockcontext-publish-job` (feeds-only) | Home/marquee after night seed |
| **~after 03:35** | `stockcontext-publish-job` (full) | Full incremental after notes (`run-notes-then-publish.sh`) |
| **12:00** Mon–Fri | `stockcontext-post-transcript-midday` | Midday transcripts |

**Website:** `deploy-pages.yml` runs on schedule ~**2:30 AM**, ~**4:30 AM** (primary, after Contabo morning notes→publish), ~**11:30 AM**, and ~**1:30 PM ET** weekdays (`as_of` skip gate avoids full rebuilds when unchanged). Contabo also dispatches Pages after each successful publish. Push to `main` always rebuilds.

**Alerts (MosaicBot):** `NOTIFY_EMAIL=… ./scripts/setup_stockcontext_publish_alerts.sh` — email on failed execution, run >2h, or no success in 10h.

## Nightly order

```text
22:00  post-transcript → theme updates → narrative seed → feeds-only publish (+ Pages)
02:30  GitHub Pages build (early, UTC 06:30)
03:35  earnings notes → full publish → Pages dispatch
04:30  GitHub Pages build (morning primary / backup, UTC 08:30 → 4:30 EDT / 3:30 EST)
11:30  GitHub Pages safety net (UTC 15:30)
12:00  post-transcript midday (weekdays) → …
13:30  GitHub Pages midday (weekdays, UTC 17:30)
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
