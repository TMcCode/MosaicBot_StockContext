# Automation status enums

Primary key: `(ticker, earnings_date)` in `Earnings_Automation_State.parquet`.

## `a_status` (pre-earnings)

| Value | Meaning |
|-------|---------|
| `pending` | In 14d window, not yet scheduled |
| `queued` | Waiting for nightly cap / budget |
| `running` | Job in flight |
| `done` | Pre-earnings pass complete for this cycle |
| `failed` | Error; see `last_error` |
| `cancelled` | Superseded by B or manual cancel |

**Allowed transitions:** `pending → queued → running → done|failed`; any → `cancelled` when B starts same cycle; `failed → queued` on manual re-queue.

## `b_status` (post-earnings transcript)

| Value | Meaning |
|-------|---------|
| `pending` | Reported, not yet processed |
| `queued` | Waiting for cap, budget, or FMP transcript |
| `running` | Job in flight |
| `done` | Transcript + earnings results complete |
| `failed` | Error |
| `abandoned` | No transcript within 30d of report |

**Allowed transitions:** `pending → queued` (repeat until transcript or 30d); `queued → running → done|failed`; `pending|queued → abandoned` at 30d cutoff.

## `c_status` (Ticker_Notes)

| Value | Meaning |
|-------|---------|
| `pending` | Not yet eligible |
| `queued` | Eligible, waiting for 3 AM batch or post-B |
| `running` | Notes job in flight |
| `done` | Note appended (**terminal**) |
| `failed` | Error |

**Allowed transitions:** `pending → queued` when `notes_eligible_date` passed; `queued → running → done|failed`. **`done` is terminal** — late B must not trigger another C.

## Queue row `skip_reason` (optional)

`cap_exceeded`, `budget_exceeded`, `waiting_transcript`, `ledger_complete`, `dry_run`
