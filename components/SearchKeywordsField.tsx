import {
  formatSearchKeywordsText,
  parseKeywordListValue,
  parseSearchKeywordsGroups,
  type KeywordGroup,
} from "@/lib/themeOverviewFormat";

function KeywordChips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="keyword-chips">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function KeywordGroups({ groups }: { groups: KeywordGroup[] }) {
  return (
    <div className="keyword-groups">
      {groups.map((group) => (
        <section key={group.label} className="keyword-group">
          <h4 className="keyword-group-label">{group.label}</h4>
          <KeywordChips items={group.items} />
        </section>
      ))}
    </div>
  );
}

/** SearchKeywordsNow JSON object → grouped chips. */
export function SearchKeywordsField({ raw }: { raw: string }) {
  const groups = parseSearchKeywordsGroups(raw);
  if (groups?.length) return <KeywordGroups groups={groups} />;

  const fallback = formatSearchKeywordsText(raw);
  if (!fallback) return null;
  return <p className="keyword-fallback pre-line">{fallback}</p>;
}

/** Single pre-split column (brand / policy / event) — bullets or JSON array. */
export function KeywordListField({ raw }: { raw: string }) {
  const items = parseKeywordListValue(raw);
  if (!items.length) return null;
  return <KeywordChips items={items} />;
}
