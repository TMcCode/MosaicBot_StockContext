/** Split published theme labels like `AI '26: Midstream AI Materials` into group + title. */
export type ThemeGroupLabel = {
  group: string;
  title: string;
};

export function splitThemeGroupLabel(label: string): ThemeGroupLabel | null {
  const idx = label.indexOf(": ");
  if (idx <= 0) {
    return null;
  }
  const group = label.slice(0, idx).trim();
  const title = label.slice(idx + 2).trim();
  if (!group || !title) {
    return null;
  }
  return { group, title };
}
