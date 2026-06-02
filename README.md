# MosaicBot Stock Context

Fast, mobile-friendly per-ticker research site (GitHub Pages) backed by automated earnings workflows and static JSON published from R2.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/AUTOMATION_SPEC.md](docs/AUTOMATION_SPEC.md) | Product & technical spec (processes A/B/C, themes, R2, admin, publish) |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phased build playbook with task IDs, files, acceptance criteria |
| [docs/R2_PATHS.md](docs/R2_PATHS.md) | Published JSON layout on object storage |
| [docs/STATUS_ENUMS.md](docs/STATUS_ENUMS.md) | Automation state machine |
| [docs/CLOUD_RUN.md](docs/CLOUD_RUN.md) | Scheduled jobs (ET) |

## Repositories

| Repo | Role |
|------|------|
| **mosaicbot_stockcontext** (this repo) | Static frontend + docs |
| **MosaicBotMain_Local_Dev** | Admin dashboard, automation runners, ETL, publisher |

Automation **code** lives in MosaicBot; **specs** live here.

## Status

**Phase 5 started** — publisher in MosaicBot, static Next.js site + GitHub Pages workflow in this repo.

## Local dev (frontend)

```bash
npm ci
npm run sync:cache    # R2 sync, or seeds docs/examples into .cache/stockcontext-public
npm run dev
```

Production builds read **only** `.cache/stockcontext-public` (no browser CDN fetches) — same egress model as [mosaicbot_stockthemes](https://github.com/).

## Publish data (MosaicBot)

```bash
cd MosaicBotMain_Local_Dev
source mosenv/bin/activate
python -m stockcontext_jobs.publish_stockcontext --dry-run --limit 5
python -m stockcontext_jobs.publish_stockcontext   # same entrypoint as Cloud Run job
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DATA_BASE_URL` | `https://storage.stockthemes.ai/stockcontext/` |
| `NEXT_PUBLIC_BASE_PATH` | **`/MosaicBot_StockContext`** (must match repo name; workflow defaults this if unset) |
| R2 secrets (CI) | Same as stockthemes — prefix `stockcontext/` |
