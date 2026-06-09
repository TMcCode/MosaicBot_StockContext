export type WorkflowTag = "pre_earnings_ready" | "notes_pending";

export const WORKFLOW_TAG_LABELS: Record<WorkflowTag, string> = {
  pre_earnings_ready: "pre",
  notes_pending: "note",
};

/** Full meaning on hover. */
export const WORKFLOW_TAG_TITLES: Record<WorkflowTag, string> = {
  pre_earnings_ready: "Pre-earnings tables done — awaiting earnings report",
  notes_pending: "Post-earnings done — earnings note still needed",
};

export function isWorkflowTag(value: string): value is WorkflowTag {
  return value === "pre_earnings_ready" || value === "notes_pending";
}

export function normalizeWorkflowTags(tags?: string[] | null): WorkflowTag[] {
  if (!tags?.length) return [];
  return tags.filter(isWorkflowTag);
}

export function workflowTagClass(tag: WorkflowTag): string {
  if (tag === "pre_earnings_ready") return "badge badge-workflow-pre";
  return "badge badge-workflow-notes";
}
