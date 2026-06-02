# JSON schemas (v0)

Draft 2020-12 schemas for published Stock Context artifacts.  
**Public base URL:** `https://storage.stockthemes.ai/stockcontext/` (see [R2_PATHS.md](../R2_PATHS.md)).

| Schema | Artifact |
|--------|----------|
| [manifest.v0.schema.json](manifest.v0.schema.json) | `manifest.v0.json` |
| [search_index.v0.schema.json](search_index.v0.schema.json) | `search_index.v0.json` |
| [home_feeds.v0.schema.json](home_feeds.v0.schema.json) | `feeds/home.v0.json` |
| [ticker_meta.v0.schema.json](ticker_meta.v0.schema.json) | `tickers/{SYMBOL}/meta.v0.json` |
| [chart_1y.v0.schema.json](chart_1y.v0.schema.json) | `tickers/{SYMBOL}/chart_1y.v0.json` |
| [ticker_financials.v0.schema.json](ticker_financials.v0.schema.json) | `tickers/{SYMBOL}/financials.v0.json` |
| [ticker_tables_index.v0.schema.json](ticker_tables_index.v0.schema.json) | `tickers/{SYMBOL}/tables/index.v0.json` |
| [ticker_table_body.v0.schema.json](ticker_table_body.v0.schema.json) | `tickers/{SYMBOL}/tables/{slug}.v0.json` |

Examples: [../examples/](../examples/)

Validate locally (optional):

```bash
# ajv-cli or similar
ajv validate -s manifest.v0.schema.json -d ../examples/manifest.v0.example.json
```
