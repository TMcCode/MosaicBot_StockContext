"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { TableSectionContent } from "@/components/TableSectionContent";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import type { TableBody, TableIndexEntry } from "@/lib/types";

type Props = {
  entry: TableIndexEntry;
  buildId?: string;
  defaultOpen?: boolean;
};

export function LazyTableSection({ entry, buildId, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [body, setBody] = useState<TableBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);
  const loaded = useRef(false);

  const loadBody = useCallback(async () => {
    if (loaded.current || inflight.current || !entry.body_url) return;
    inflight.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicJson<TableBody>(entry.body_url, buildId);
      setBody(data);
      loaded.current = true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load section");
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, [entry.body_url, buildId]);

  useEffect(() => {
    if (defaultOpen) void loadBody();
  }, [defaultOpen, loadBody]);

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const next = e.currentTarget.open;
    setOpen(next);
    if (next) void loadBody();
  };

  return (
    <details
      className="card table-section table-accordion"
      open={open}
      onToggle={handleToggle}
    >
      <summary className="table-accordion-summary">
        <div className="table-accordion-heading">
          <span className="section-title">{entry.display_name}</span>
          {body && body.rows.length > 1 ? (
            <span className="table-meta-chip muted">{body.rows.length} rows</span>
          ) : entry.format === "multi_row" ? (
            <span className="table-meta-chip muted">Table</span>
          ) : null}
        </div>
        {entry.preview ? <p className="table-preview muted">{entry.preview}</p> : null}
      </summary>
      <div className="table-accordion-body">
        {loading && !body ? <p className="muted">Loading…</p> : null}
        {error ? <p className="muted">Could not load section ({error}).</p> : null}
        {body ? <TableSectionContent body={body} /> : null}
      </div>
    </details>
  );
}
