# Example JSON payloads (v0)

Validated against [../schemas/](../schemas/). Paths are relative to `data_base_url`.

| Example | Schema |
|---------|--------|
| [manifest.v0.example.json](manifest.v0.example.json) | manifest |
| [search_index.v0.example.json](search_index.v0.example.json) | search_index |
| [home_feeds.v0.example.json](home_feeds.v0.example.json) | home_feeds |
| [tickers/NVDA/meta.v0.example.json](tickers/NVDA/meta.v0.example.json) | ticker_meta |
| [tickers/NVDA/chart_1y.v0.example.json](tickers/NVDA/chart_1y.v0.example.json) | chart_1y |
| [tickers/NVDA/financials.v0.example.json](tickers/NVDA/financials.v0.example.json) | ticker_financials |
| [tickers/NVDA/tables/index.v0.example.json](tickers/NVDA/tables/index.v0.example.json) | ticker_tables_index |
| [tickers/NVDA/tables/overview.v0.example.json](tickers/NVDA/tables/overview.v0.example.json) | ticker_table_body |

**Client load order for `/ticker/NVDA`:**

1. `manifest.v0.json` (once per session) or cached
2. `tickers/NVDA/meta.v0.json`
3. Parallel: `chart_1y`, `financials`, `tables/index`
4. On accordion expand: `tables/{slug}.v0.json`
