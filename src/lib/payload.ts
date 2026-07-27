const payloadUrl = import.meta.env.PUBLIC_PAYLOAD_URL;

interface PayloadPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: unknown;
  category: number | { id: number; slug: string; title: string };
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  featured: boolean;
  tags: Array<number | { id: number; title: string; slug: string }>;
  author: number;
  knowledgeIndex: Array<number | { id: number; term: string; slug: string }>;
  cover: unknown;
}

interface PayloadCategory {
  id: number;
  title: string;
  slug: string;
}

let cachedCategoryMap: Record<string, number> | null = null;
let cachedTagsMap: Record<number, { id: number; title: string; slug: string }> | null = null;

async function getCategoryMap(): Promise<Record<string, number>> {
  if (cachedCategoryMap) return cachedCategoryMap;

  try {
    const res = await fetch(`${payloadUrl}/api/categories?limit=100`);

    if (!res.ok) {
      console.warn(`[payload] Categories fetch returned ${res.status}`);
      return {};
    }

    const { docs } = await res.json();
    const map: Record<string, number> = {};

    for (const cat of docs) {
      map[cat.slug] = cat.id;
    }

    cachedCategoryMap = map;
    return map;
  } catch (err) {
    console.warn(`[payload] Failed to fetch categories: ${err}`);
    return {};
  }
}

export async function getTagsMap(): Promise<Record<number, { id: number; title: string; slug: string }>> {
  if (cachedTagsMap) return cachedTagsMap;

  try {
    const res = await fetch(`${payloadUrl}/api/tags?limit=100`);

    if (!res.ok) {
      console.warn(`[payload] Tags fetch returned ${res.status}`);
      return {};
    }

    const { docs } = await res.json();
    const map: Record<number, { id: number; title: string; slug: string }> = {};

    for (const tag of docs) {
      map[tag.id] = { id: tag.id, title: tag.title, slug: tag.slug };
    }

    cachedTagsMap = map;
    return map;
  } catch (err) {
    console.warn(`[payload] Failed to fetch tags: ${err}`);
    return {};
  }
}

export async function getPosts(category?: string): Promise<PayloadPost[]> {
  let docs: PayloadPost[];

  try {
    const res = await fetch(`${payloadUrl}/api/posts?depth=1&limit=100`);

    if (!res.ok) {
      console.warn(`[payload] Posts fetch returned ${res.status}. Returning empty.`);
      return [];
    }

    docs = (await res.json()).docs;
  } catch (err) {
    console.warn(`[payload] Failed to fetch posts: ${err}. Returning empty.`);
    return [];
  }

  const posts: PayloadPost[] = docs.sort(
    (a: PayloadPost, b: PayloadPost) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (!category) {
    return posts;
  }

  const categoryMap = await getCategoryMap();
  const categoryId = categoryMap[category];

  if (!categoryId) {
    console.warn(`[payload] Category "${category}" not found. Available:`, Object.keys(categoryMap));
    return [];
  }

  return posts.filter((post) => {
    const postCat = post.category;
    if (typeof postCat === "number") return postCat === categoryId;
    if (postCat && typeof postCat === "object") return postCat.slug === category;
    return false;
  });
}

export interface TagGroup {
  tag: { id: number; title: string; slug: string };
  posts: Array<{ title: string; slug: string; createdAt: string }>;
}

export function groupPostsByTag(posts: PayloadPost[]): TagGroup[] {
  const grouped: Record<string, TagGroup> = {};

  for (const post of posts) {
    const postTags = Array.isArray(post.tags) ? post.tags : [];

    if (postTags.length === 0) {
      const key = "__untagged__";
      if (!grouped[key]) {
        grouped[key] = {
          tag: { id: -1, title: "Untagged", slug: "" },
          posts: [],
        };
      }
      grouped[key].posts.push({
        title: post.title,
        slug: post.slug,
        createdAt: post.createdAt,
      });
      continue;
    }

    for (const tag of postTags) {
      const tagId = typeof tag === "number" ? tag : tag.id;
      const tagTitle = typeof tag === "number" ? `Tag #${tag}` : tag.title;
      const tagSlug = typeof tag === "number" ? "" : tag.slug;

      const key = String(tagId);
      if (!grouped[key]) {
        grouped[key] = {
          tag: { id: tagId, title: tagTitle, slug: tagSlug },
          posts: [],
        };
      }
      grouped[key].posts.push({
        title: post.title,
        slug: post.slug,
        createdAt: post.createdAt,
      });
    }
  }

  return Object.values(grouped).sort((a, b) => {
    const countDiff = b.posts.length - a.posts.length;
    if (countDiff !== 0) return countDiff;
    return a.tag.title.localeCompare(b.tag.title);
  });
}

export async function getPostBySlug(slug: string): Promise<PayloadPost | null> {
  try {
    const res = await fetch(
      `${payloadUrl}/api/posts?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`
    );

    if (!res.ok) {
      console.warn(`[payload] getPostBySlug returned ${res.status} for "${slug}".`);
      return null;
    }

    const { docs } = await res.json();
    return docs?.[0] ?? null;
  } catch (err) {
    console.warn(`[payload] Failed to fetch post "${slug}": ${err}`);
    return null;
  }
}

export async function getKnowledgeBySlug(slug: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${payloadUrl}/api/knowledge-index?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`
    );

    if (!res.ok) {
      console.warn(`[payload] getKnowledgeBySlug returned ${res.status} for "${slug}".`);
      return null;
    }

    const { docs } = await res.json();
    return docs?.[0] ?? null;
  } catch (err) {
    console.warn(`[payload] Failed to fetch knowledge "${slug}": ${err}`);
    return null;
  }
}

export async function getKnowledgeList(): Promise<Array<{ id: number; term: string; slug: string }>> {
  try {
    const res = await fetch(`${payloadUrl}/api/knowledge-index?limit=100&depth=0`);

    if (!res.ok) {
      console.warn(`[payload] getKnowledgeList returned ${res.status}`);
      return [];
    }

    const { docs } = await res.json();
    return docs.map((d: Record<string, unknown>) => ({
      id: d.id as number,
      term: d.term as string,
      slug: d.slug as string,
    }));
  } catch (err) {
    console.warn(`[payload] Failed to fetch knowledge list: ${err}`);
    return [];
  }
}
