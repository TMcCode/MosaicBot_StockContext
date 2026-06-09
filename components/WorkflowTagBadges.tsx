import {
  normalizeWorkflowTags,
  WORKFLOW_TAG_LABELS,
  WORKFLOW_TAG_TITLES,
  workflowTagClass,
} from "@/lib/workflowTags";

type Props = {
  tags?: string[] | null;
  className?: string;
};

export function WorkflowTagBadges({ tags, className }: Props) {
  const normalized = normalizeWorkflowTags(tags);
  if (normalized.length === 0) return null;

  return (
    <span className={className ? `workflow-tag-list ${className}` : "workflow-tag-list"}>
      {normalized.map((tag) => (
        <span key={tag} className={workflowTagClass(tag)} title={WORKFLOW_TAG_TITLES[tag]}>
          {WORKFLOW_TAG_LABELS[tag]}
        </span>
      ))}
    </span>
  );
}
