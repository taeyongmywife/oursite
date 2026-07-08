export function getEntryPath<T extends { id: string; slug?: string }>(entry: T): string {
  return entry.slug ?? entry.id.replace(/\.(md|mdx)$/, '');
}
