-- Stock Context — full article text for the /news page, signed-in readers only.
-- Written by MosaicBot's news radar (service role); rows older than 90 days are purged
-- by the feed publisher, after which only the public 300-char snippet remains.
-- Run in Supabase SQL Editor.

create table if not exists public.news_article_text (
  id text primary key,
  url text,
  title text,
  body text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists news_article_text_published_idx
  on public.news_article_text (published_at);

alter table public.news_article_text enable row level security;

drop policy if exists "news_article_text_select_authenticated" on public.news_article_text;
create policy "news_article_text_select_authenticated"
  on public.news_article_text for select
  to authenticated
  using (true);
