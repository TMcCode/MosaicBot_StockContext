# MosaicBot Stock Context — Earnings Automation & Public Site Spec

**Status:** Approved for implementation planning  
**Docs repo:** `mosaicbot_stockcontext` (this repository)  
**Automation code:** `MosaicBotMain_Local_Dev` (`admin_dashboard/`)  
**Public site:** GitHub Pages from this repo  
**Data plane:** Same R2 bucket as admin (`mosaic_themes` via `storage_compat`)  
**Implementation playbook:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)  
**Last updated:** 2026-06-01

---

## 1. Goals

1. Automate watchlist/portfolio earnings workflows currently driven manually in **Ticker Management** (pre-earnings, post-earnings transcript, T+2 notes).
2. Write all outputs to the **same R2 paths** as manual admin (no parallel data store).
3. Auto-approve LLM outputs; admin retains edit / reset / delete / manual re-run.
4. Publish **static JSON** for a fast per-ticker site (no LLM in the browser).
5. Enforce **daily cost and throughput caps** ($20/day Gemini default, queued overflow).

---

## 2. Google Sheets layout (source of truth)

Spreadsheet: [Mosaic_Theme_Defaults](https://docs.google.com/spreadsheets/d/157WTHkSb3S52afjh6XPyZkf_HGnHlgJChwmaZ2Rj7dg/)

| Tab | GID | Purpose | Columns (key) |
|-----|-----|---------|----------------|
| **Portfolio** | `334674095` | Holdings: theme + ticker + weight | `Theme`, `Ticker`, `Weight`, `Notes` |
| **watchlist** (theme list) | `1801228893` | Theme names under coverage (not holdings) | `theme` |

**Out of scope for automation:** `Watchlist_Updates` (separate workflow — not a scheduler input for Stock Context).

### 2.1 Portfolio vs watchlist in code

The **Portfolio** tab (formerly `WatchlistTickers`) is **holdings**, not the theme watchlist.

`pre_earnings_utils.get_watchlist_themes()` today loads GID `334674095` and mislabels portfolio themes as “watchlist.” Automation must split loaders:

| Function (new) | GID | Returns |
|----------------|-----|---------|
| `get_portfolio_holdings()` | 334674095 | Rows: theme, ticker, weight, notes |
| `get_portfolio_theme_names()` | 334674095 | Unique themes on Portfolio tab |
| `get_watchlist_theme_names()` | 1801228893 | Theme names from watchlist tab only |

**Universe tiers for queue ranking:**

1. **Tier 1 — Portfolio tickers:** tickers on Portfolio tab.  
2. **Tier 2 — Portfolio-theme tickers:** tickers in `sym_theme_df` for any **portfolio theme**, excluding tier 1.  
3. **Tier 3 — Watchlist-only tickers:** tickers in **watchlist tab** themes, not in tiers 1–2.

Within tier: **higher Weight** → **older report/transcript date** → **higher market cap**.

**Earnings dates:** ETL snapshots on R2 only — `upcoming_earnings_latest.parquet`, `recent_earnings_latest.parquet`, optionally `earnings_with_estimates_and_fundamentals_enriched_latest.parquet` for BMO/AMC. Filter to universe. **No** `Watchlist_Updates`.

---

## 3. Processes overview

| ID | Name | Schedule | Daily cap | Notes |
|----|------|----------|-----------|-------|
| **A** | Pre-earnings | **Night batch only** | 20 (+ queue) | 14-day window; B cancels A |
| **B** | Post-earnings transcript + Earnings Results | Night 20 (+ queue); Midday **10** if queue | No `Ticker_Notes` |
| **C** | Post-earnings performance notes | **~3:00 AM ET** (after Fetch 3) | 40 | `Ticker_Notes`; T+2 calendar + BMO/AMC |
| **T1** | Theme update (event) | Nightly (~6 AM ET, after B) | 5 (+ backlog) | **One refresh per theme**; context = 90d constituent earnings summaries + theme/ticker tables + web search (not one full transcript) |
| **T2** | Theme update (180d rotation) | Night | 5 | Excludes portfolio + watchlist theme names |
| **P** | Stock Context publish | **~4:00 AM** + after midday B | — | Static JSON → CDN |

**Weekends:** Sat + Sun optional queue drain for **A and B** (if backlog).

**Gemini budget:** **$20/day** default (env `AUTOMATION_GEMINI_DAILY_CAP_USD`); single pool; stop when cap hit.

**Parallelism:** **3 concurrent** tickers for A and for B (Cloud Run env).

---

## 4. Process A — Pre-earnings (night)

### 4.1 Eligibility

- Universe ticker; report within **14 days** (queue when date **enters** window).  
- **B cancels A** for same `(ticker, earnings_date)`.  
- Manual pre-earnings from admin still allowed (`trigger=manual`).

### 4.2 Prior transcript

- Do not re-summarize if pre-earnings transcript pass marked complete in ledger.  
- If never updated: refresh per existing pre-earnings pipeline.

### 4.3 Table refresh (150 days = 5 months)

Per table: if **latest row older than 150 days** → refresh that table.

If **all** tables ≤150 days → refresh only:

- `Ticker_BullBearDetails`, `Ticker_KeyQuestions`, `Ticker_BullBearCase`, `Ticker_ReratingThresholds`

If **any** table stale → refresh **all** pre-earnings tables **including** `Ticker_DetailedOverview`.

**Never:** `Ticker_Notes` (process C).

### 4.4 Queue

- Max **20**/night; overflow → queue; same ranking as §6; weekend drain with B.

### 4.5 Implementation

- `_run_pre_earnings_pipeline_job` + automation recipe (no `transcript_notes`).  
- Auto-approve §10.

---

## 5. Process B — Post-earnings transcript

### 5.1 Eligibility

- Reported; universe; FMP transcript (may lag **days**).  
- Dedup: `Transcript_Completion_Ledger` unless manual reset.

### 5.2 Contents

`full_analysis`, `detailed_overview`, **Earnings Results** — **no** `transcript_notes`.

### 5.3 Transcript wait

- Retry until transcript or **30 days** → `abandoned`.  
- &lt;20 runs on quiet days is OK.

### 5.4 Notes independence

- C may run without transcript; **do not** edit notes when B completes later.  
- B only updates transcript tables + earnings results.

### 5.5 Queue & schedule

| Run | Cap | Condition |
|-----|-----|-----------|
| Night | 20 | Standard |
| Midday | 10 | Queue non-empty |
| Sat/Sun | Drain A+B | If backlog |

### 5.6 Implementation

- `_run_pet_processing_job` / `fetch_and_process_transcript`.  
- On success → ledger → record row in `Theme_T1_Pending` (merge by theme; nightly job drains up to 5).

---

## 6. Queue ranking (A & B)

1. Tier 1: Portfolio tab tickers  
2. Tier 2: Portfolio-theme tickers  
3. Tier 3: Watchlist-only  

Within tier: **Weight** → **older date** → **market cap**.

---

## 7. Process C — Ticker_Notes (~3 AM ET)

### 7.1 Purpose

Append **`Ticker_Notes`** with reaction + context (transcript if B done; else web + reaction).

### 7.2 Timing

- **~3:00 AM ET** after Fetch 3.  
- **T+2 calendar days**, BMO/AMC via `MarketPerformanceCalculator` (+ `notes_eligible_close_date`).  
- FMP timing when available.

| Event | Return window | Notes run (typical) |
|-------|---------------|---------------------|
| AMC Monday | Mon close → Wed close | Wed night (~3 AM Thu) |
| Thu PM (AMC) | Thu close → Sat close | Sat night |
| Fri PM (AMC) | Fri close → Mon close | Mon night |
| Fri BMO | Thu close → Sat close | Sat night |

### 7.3 vs B

- In B queue waiting transcript → C **after B** same session when possible.  
- 30d abandoned → C with web + reaction only.  
- **`c_status=done` is terminal** — late B never triggers second C.

### 7.4 Cap

- **40**/night; shared Gemini pool (default $20/day).

### 7.5 Implementation

- `_process_transcript_notes` wrapper; not in B `processing_mode`.

---

## 8. Theme updates

### 8.1 Daily budget

**10/day:** **5 T1** (after B) + **5 T2** (180d rotation).

- T2 excludes themes on **portfolio** or **watchlist** lists (those update via T1).  
- T2 skips themes T1 updated **same calendar day**.

### 8.2 Theme per ticker (T1)

1. Portfolio row theme  
2. Watchlist association theme  
3. **Manual default** (Ticker Management tab → `Ticker_Default_Theme.parquet`)  
4. Newest theme in `sym_theme_df`

**Tonight’s 5 T1 slots:** portfolio-tier → watchlist-tier → other; FIFO within tier.

### 8.3 Tables (T1 & T2)

`Theme_BullBearDetails`, `Theme_KeyMetrics`, `Theme_Overview`, `Theme_UpcomingCatalysts`, `Theme_Notes`

### 8.4 Theme_Notes LLM context

- Auto notes: **latest one per calendar quarter** only.  
- Manual admin notes: always included.

### 8.5 Queues

- T1 overflow → remains in `Theme_T1_Pending` for a later night (tier preserved on each row).  
- T2: oldest `last_theme_refresh_at` among eligible non-port/non-watchlist themes.

---

## 9. State & ledgers (R2)

See [R2_PATHS.md](R2_PATHS.md) and [STATUS_ENUMS.md](STATUS_ENUMS.md).

- `Earnings_Automation_State.parquet`  
- `Transcript_Completion_Ledger.parquet`  
- `Ticker_Default_Theme.parquet`  
- `Theme_Refresh_State.parquet`  
- `Automation_Queues.parquet`

---

## 10. Storage & auto-approve

- Same R2 text tables as manual.  
- Automation: `auto_approve_update` — not gated on pending staging.  
- `LLM_Thesis_Updates_Pending` → audit / prompt reset for manual runs.  
- Tags: `source=automation`, `automation_run_id`, `created_by=automation`.

---

## 11. Admin dashboard (MosaicBot)

| Area | Change |
|------|--------|
| **Ticker Management** | Automation queue tab; **Default theme** tab; manual Pre/Post |
| **LLM Thesis Updates** | Audit / prompt reset (not primary gate) |
| **Automation diagnostics** tile | Failures, spend vs daily cap, abandoned |
| **Parallel** | 3-wide pre + post on Cloud Run |

---

## 12. Public site (this repo)

### 12.1 Architecture

- GitHub Pages; **no sign-in v1**.  
- No LLM in browser.  
- JSON from CDN — **locked:** `DATA_BASE_URL=https://storage.stockthemes.ai/stockcontext/` ([R2_PATHS.md](R2_PATHS.md)).

### 12.2 Artifacts & schemas

Published under `gs://stockthemes-public/stockcontext/`. JSON Schema + examples in [`docs/schemas/`](schemas/) and [`docs/examples/`](examples/).

| Artifact | Schema |
|----------|--------|
| `manifest.v0.json` | `manifest.v0.schema.json` |
| `search_index.v0.json` | `search_index.v0.schema.json` |
| `feeds/home.v0.json` | `home_feeds.v0.schema.json` |
| `tickers/{SYM}/meta.v0.json` | `ticker_meta.v0.schema.json` |
| `tickers/{SYM}/chart_1y.v0.json` | `chart_1y.v0.schema.json` |
| `tickers/{SYM}/financials.v0.json` | `ticker_financials.v0.schema.json` |
| `tickers/{SYM}/tables/index.v0.json` | `ticker_tables_index.v0.schema.json` |
| `tickers/{SYM}/tables/{slug}.v0.json` | `ticker_table_body.v0.schema.json` |

### 12.3 Financials (Stock Lens / MosaicBot ETL)

- `ticker_performance` snapshot  
- `ticker_metrics_with_ntm_latest`  
- `theme_revenue_revisions_ticker_latest`

### 12.4 UX

- `/ticker/NVDA` per symbol; lazy text tables; mobile LCP target &lt;2.5s.

---

## 13. Cloud Run schedule (ET)

See [CLOUD_RUN.md](CLOUD_RUN.md).

| Time | Jobs |
|------|------|
| ~3:00 AM | C (notes) |
| ~4:00 AM | P (publish) |
| Night | A, B, T1+T2 |
| Midday | B (≤10 if queue), P incremental |
| Sat/Sun | A+B queue drain if backlog |

---

## 14. Implementation phases

**Full playbook:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

| Phase | Objective | Gate |
|-------|-----------|------|
| **0** | Schemas, paths, enums | ✅ Done |
| **1** | Universe, state, queue, budget — no LLM | CLI + tests |
| **2a** | Auto-approve + B | One ticker end-to-end |
| **2b** | C @ 3 AM | T+2; no late-B duplicate note |
| **2c** | A night, 20 cap | B cancels A; queue |
| **3** | T1+T2 themes, default tab | 10/day + quarter dedup |
| **4a** | Admin queue UI | Backlog visible |
| **4b** | Diagnostics + LLM tile | Failures + spend |
| **5a** | Publisher (MosaicBot) | CDN JSON valid |
| **5b** | GH Pages (this repo) | Per-ticker page |
| **6** | Cloud Run crons | Staging week green |

---

## 15. Resolved / minor open items

| Item | Resolution |
|------|------------|
| 5-month rule | **150 calendar days** per table (`AUTOMATION_STALE_TABLE_DAYS`) |
| Public prefix | **`stockthemes-public` / `stockcontext/`** → `https://storage.stockthemes.ai/stockcontext/` |
| Sign-in | **v2**; not v1 |
| Email alerts | Diagnostics tile v1; digest v2 |
| Focus checklist | Optional `feeds/focus_list.v0.json`; low egress |

---

## 16. Decision log

| # | Decision |
|---|----------|
| 1 | 10 themes/day: **5 T1 + 5 T2** |
| 2 | T2 excludes portfolio + watchlist theme names |
| 3 | T2 dedup if T1 same day; Theme_Notes quarter rule for auto notes |
| 4 | Pre queue same ranking as B |
| 5 | B cancels A; manual pre allowed |
| 6 | **$20/day** Gemini default (env override), one pool |
| 7 | Notes ~3 AM after Fetch 3 |
| 8 | Publish ~4 AM + after midday B |
| 9 | Diagnostics tile (email later) |
| 10 | Manifest yes; repo **mosaicbot_stockcontext** |
| — | Pre-earnings **night only** |
| — | Sat/Sun drain **A and B** |
| — | No sign-in v1 |
| — | Theme priority: port → watchlist → **manual default** → newest |
| — | No Watchlist_Updates for automation |
| — | Notes never re-run when B completes after C |

---

## 17. Related code (MosaicBotMain_Local_Dev)

| Component | Path |
|-----------|------|
| Pre-earnings | `admin_dashboard/tools/pre_earnings_rerating.py` → `_run_pre_earnings_pipeline_job` |
| Post-earnings | `admin_dashboard/tools/post_earnings_transcript.py` → `_run_pet_processing_job` |
| Transcript | `admin_dashboard/utils/fmp_transcript_utils.py` |
| Notes | `admin_dashboard/utils/document_manager.py` → `_process_transcript_notes` |
| Returns | `admin_dashboard/utils/market_performance_utils.py` |
| R2 I/O | `admin_dashboard/utils/gcs_utils.py` |
| Weights | `utils/watchlist_weighting_manager.py` |
| Sheets (refactor) | `admin_dashboard/utils/pre_earnings_utils.py` |
