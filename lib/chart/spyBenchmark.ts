import type { ChartPerformanceV0 } from "@/lib/chart/types";
import { stockthemesBrowserChartFetchBase } from "@/lib/chart/stockthemesPublicBase";

type SpySnapshotV0 = {
  schema_version: 0;
  as_of: string;
  performance?: ChartPerformanceV0;
};

let cachedPerf: ChartPerformanceV0 | null | undefined;
let inflight: Promise<ChartPerformanceV0 | null> | null = null;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export async function fetchSpyBenchmarkPerformance(
  signal?: AbortSignal,
): Promise<ChartPerformanceV0 | null> {
  const cacheEnabled = process.env.NODE_ENV !== "development";
  if (cacheEnabled && cachedPerf !== undefined) return cachedPerf;
  if (inflight) return inflight;

  inflight = (async () => {
    const base = stockthemesBrowserChartFetchBase();
    const url = `${base}/spy_snapshot.v0.json`;
    try {
      const res = await fetch(url, { credentials: "omit", cache: "default", signal });
      if (!res.ok) {
        if (cacheEnabled) cachedPerf = null;
        return null;
      }
      const data = JSON.parse(await res.text()) as SpySnapshotV0;
      const perf = data.performance;
      const parsed = perf?.dates?.length && perf?.values?.length ? perf : null;
      if (cacheEnabled) cachedPerf = parsed;
      return parsed;
    } catch (e) {
      if (signal?.aborted || isAbortError(e)) throw e;
      if (cacheEnabled) cachedPerf = null;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
