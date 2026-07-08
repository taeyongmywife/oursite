export const BLOG_CATEGORIES = [
  { slug: 'all', label: 'ALL' },
  { slug: 'ai-lab', label: 'AI实验室' },
  { slug: 'commerce-lab', label: '商业实验' },
  { slug: 'creative-space', label: '创造空间' },
  { slug: 'thinking-notes', label: '思考记录' },
] as const;

export type BlogCategorySlug = (typeof BLOG_CATEGORIES)[number]['slug'];

export function formatBlogDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function formatArchiveId(index: number): string {
  return `FRAGMENT_${String(index + 1).padStart(3, '0')}`;
}

export function sortBlogPosts<T extends { data: { pubDate: Date } }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function getBlogPostPath<T extends { id: string; slug?: string }>(post: T): string {
  return post.slug ?? post.id.replace(/\.(md|mdx)$/, '');
}

export function createBlogIdMap<T extends { id: string; slug?: string; data: { pubDate: Date } }>(posts: T[]) {
  return new Map(
    sortBlogPosts(posts).map((post, index) => [getBlogPostPath(post), formatArchiveId(index)]),
  );
}

export function getBlogCategoryLabel(category: string): string {
  return BLOG_CATEGORIES.find((item) => item.slug === category)?.label ?? category;
}

export function isBlogCategory(category: string): category is BlogCategorySlug {
  return BLOG_CATEGORIES.some((item) => item.slug === category);
}
