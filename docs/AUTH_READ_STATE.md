# Sign-in & read state (Stock Context)

Stock Context uses the **same Supabase project** as [stockthemes.ai](https://stockthemes.ai): one email, one account. Read markers are stored in `public.page_reads` (not the theme watchlist).

## One-time setup (Supabase dashboard)

1. Run SQL: [`supabase/migrations/001_page_reads.sql`](../supabase/migrations/001_page_reads.sql) (also in `mosaicbot_stockthemes/supabase/migrations/005_stockcontext_page_reads.sql`).
2. **Authentication → URL configuration** — add redirect URLs:
   - `https://tmccode.github.io/MosaicBot_StockContext/**`
   - `http://localhost:3000/**` (and your custom domain when live)
3. Copy **Project URL** + **anon key** into `.env.local` and GitHub repo **Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   (same values as stockthemes Pages deploy)

## Behavior

| Page | Key | Unread when |
|------|-----|-------------|
| Theme | `theme` + slug | No row, or `seen_build_id` ≠ theme tables index `build_id` |
| Ticker | `ticker` + symbol | Same vs ticker tables index `build_id` |

- **Signed in:** reads sync across devices via Supabase.
- **Not signed in:** reads save in `localStorage` (`stockcontext-reads-v1`); merged into Supabase on first sign-in.

## Routes

| Route | Purpose |
|-------|---------|
| `/sign-in/` | Magic link |
| `/auth/callback/` | OAuth/PKCE callback |
| `/account/` | Email + sign out |
