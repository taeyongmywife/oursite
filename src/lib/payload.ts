const payloadUrl = import.meta.env.PUBLIC_PAYLOAD_URL;

/**
 * 把 Payload 返回的相对媒体路径补全为完整 URL。
 * 前端（Vercel）与 CMS（Vercel）不同域，相对路径 /api/media/file/... 会解析到前端域名导致 404。
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${payloadUrl}${url}`;
}

function resolveCover<T extends { url?: string | null }>(cover: T | null | undefined): T | null {
  if (!cover) return null;
  return { ...cover, url: resolveMediaUrl(cover.url) ?? undefined };
}

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
  tagBox: Array<number | { id: number; title: string; slug: string }>;
  author: number;
  knowledgeIndex: Array<number | { id: number; term: string; slug: string }>;
  series: number | { id: number; title: string; slug: string } | null;
  logNumber: number | null;
  cover: unknown;
}

interface PayloadCategory {
  id: number;
  title: string;
  slug: string;
}

let cachedCategoryMap: Record<string, number> | null = null;

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

  const posts: PayloadPost[] = docs
    .sort(
      (a: PayloadPost, b: PayloadPost) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((post) => ({
      ...post,
      cover: resolveCover(post.cover as { url?: string } | null),
    }));

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

/**
 * 按 TagBox（主题盒子）对文章分组，用于 /fragments、/experiments 等分区页内分组。
 * 一篇文章可挂多个 TagBox，因此可能出现在多个分组里。
 */
export function groupPostsByTagBox(posts: PayloadPost[]): TagGroup[] {
  const grouped: Record<string, TagGroup> = {};

  for (const post of posts) {
    const postTags = Array.isArray(post.tagBox) ? post.tagBox : [];

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

// ===========================
// TagBox（主题盒子，文章主探索入口）
// ===========================

export interface PayloadTagBox {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover: unknown;
}

export async function getTagBoxes(): Promise<PayloadTagBox[]> {
  try {
    const res = await fetch(`${payloadUrl}/api/tagbox?limit=100&depth=0`);

    if (!res.ok) {
      console.warn(`[payload] TagBox fetch returned ${res.status}`);
      return [];
    }

    const { docs } = await res.json();
    return (docs as Array<Record<string, unknown>>).map((d) => ({
      id: d.id as number,
      title: d.title as string,
      slug: d.slug as string,
      description: (d.description as string) ?? null,
      cover: d.cover ?? null,
    }));
  } catch (err) {
    console.warn(`[payload] Failed to fetch tagbox: ${err}`);
    return [];
  }
}

export async function getTagBoxBySlug(slug: string): Promise<PayloadTagBox | null> {
  const boxes = await getTagBoxes();
  return boxes.find((b) => b.slug === slug) ?? null;
}

/** 返回挂了指定 TagBox 的全部文章（跨分区）。 */
export async function getPostsByTagBox(slug: string): Promise<PayloadPost[]> {
  const posts = await getPosts();
  return posts.filter((p) => {
    const tb = Array.isArray(p.tagBox) ? p.tagBox : [];
    return tb.some((t) => (typeof t === "object" ? t.slug : "") === slug);
  });
}

// ===========================
// Related Content（相关文章）
// ===========================

export interface RelatedPost {
  title: string;
  slug: string;
  category: string | null; // category slug，便于后续样式/路由区分
}

function tagBoxSlugsOf(post: PayloadPost): string[] {
  const tb = Array.isArray(post.tagBox) ? post.tagBox : [];
  return tb
    .map((t) => (typeof t === "object" && t !== null ? t.slug : ""))
    .filter(Boolean);
}

function seriesSlugOf(post: PayloadPost): string | null {
  const s = post.series;
  if (!s) return null;
  if (typeof s === "object" && s !== null) return s.slug;
  return null;
}

/**
 * 返回当前篇在所属系列内的上下篇 slug。
 * 用于避免 SeriesNav 翻页条与 RelatedContent 重复展示同一篇。
 */
export async function getSeriesAdjacent(
  post: PayloadPost
): Promise<{ prevSlug: string | null; nextSlug: string | null }> {
  const curSeries = seriesSlugOf(post);
  if (!curSeries) return { prevSlug: null, nextSlug: null };

  const all = await getPosts();
  const seriesPosts = all
    .filter((p) => seriesSlugOf(p) === curSeries)
    .sort((a, b) => (a.logNumber ?? 0) - (b.logNumber ?? 0));

  const idx = seriesPosts.findIndex((p) => p.slug === post.slug);
  return {
    prevSlug: idx > 0 ? seriesPosts[idx - 1].slug : null,
    nextSlug:
      idx >= 0 && idx < seriesPosts.length - 1
        ? seriesPosts[idx + 1].slug
        : null,
  };
}

/**
 * 计算与当前文章相关的其他文章：
 * - 共享 TagBox（主题盒子）数量加权（每个 +2）
 * - 同系列（Series）额外加权（+5）
 * 按得分降序、再按发布时间降序，取前 limit 篇。
 * 链接统一走 /blog/[slug]（所有文章通用路由）。
 */
export async function getRelatedPosts(
  current: PayloadPost,
  limit = 4,
  excludeSlugs: string[] = []
): Promise<RelatedPost[]> {
  const all = await getPosts();
  const curTags = tagBoxSlugsOf(current);
  const curSeries = seriesSlugOf(current);
  const exclude = new Set<string>([current.slug, ...excludeSlugs]);

  const scored: Array<{ post: PayloadPost; score: number }> = [];

  for (const p of all) {
    if (exclude.has(p.slug)) continue;
    if (p.status !== "published") continue;

    let score = 0;
    const shared = tagBoxSlugsOf(p).filter((t) => curTags.includes(t)).length;
    score += shared * 2;
    if (curSeries && seriesSlugOf(p) === curSeries) score += 5;

    if (score > 0) {
      scored.push({ post: p, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime()
    );
  });

  return scored.slice(0, limit).map(({ post }) => ({
    title: post.title,
    slug: post.slug,
    category:
      typeof post.category === "object" && post.category !== null
        ? post.category.slug
        : null,
  }));
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
    const post = docs?.[0] ?? null;
    if (!post) return null;
    return {
      ...post,
      cover: resolveCover(post.cover as { url?: string } | null),
    };
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

export interface KnowledgeItem {
  id: number;
  term: string;
  slug: string;
  summary: string | null;
  aliases: string[];
}

export async function getKnowledgeList(): Promise<KnowledgeItem[]> {
  try {
    const res = await fetch(`${payloadUrl}/api/knowledge-index?limit=100&depth=0`);

    if (!res.ok) {
      console.warn(`[payload] getKnowledgeList returned ${res.status}`);
      return [];
    }

    const { docs } = await res.json();
    return docs.map((d: Record<string, unknown>) => {
      const aliasesRaw = (d.aliases as Array<{ alias?: string }> | undefined) ?? [];
      const aliases = aliasesRaw
        .map((a) => (a && typeof a.alias === "string" ? a.alias : ""))
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: d.id as number,
        term: d.term as string,
        slug: d.slug as string,
        summary: (d.summary as string | null) ?? null,
        aliases,
      };
    });
  } catch (err) {
    console.warn(`[payload] Failed to fetch knowledge list: ${err}`);
    return [];
  }
}

/**
 * 构建 term + aliases → slug 的查找表（全部小写）。
 * 供 RichText 内联自动链接与文章底部「关联知识」块共用。
 */
export function buildKnowledgeMap(list: KnowledgeItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const k of list) {
    const termKey = k.term.trim().toLowerCase();
    if (termKey) map[termKey] = k.slug;
    for (const alias of k.aliases) {
      const key = alias.trim().toLowerCase();
      if (key) map[key] = k.slug;
    }
  }
  return map;
}

function lexicalNodeToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (typeof n.text === "string") return n.text;
  if (Array.isArray(n.children)) {
    return (n.children as unknown[]).map(lexicalNodeToText).join("");
  }
  return "";
}

function extractContentText(content: unknown): string {
  if (!content) return "";
  const root = (content as Record<string, unknown>)?.root ?? content;
  return lexicalNodeToText(root);
}

/**
 * 扫描文章正文（Lexical 富文本），返回正文中实际出现过的知识词条。
 * 匹配基于 term 与 aliases（不区分大小写），用于自动生成「关联知识」块，
 * 取代原先手动在 Posts 上勾选 knowledgeIndex 的方式。
 */
export function getMatchedKnowledge(
  content: unknown,
  list: KnowledgeItem[]
): Array<{ term: string; slug: string; summary: string | null }> {
  const text = extractContentText(content).toLowerCase();
  if (!text) return [];

  const seen = new Set<string>();
  const out: Array<{ term: string; slug: string; summary: string | null }> = [];

  for (const k of list) {
    const keys = [k.term, ...k.aliases]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (keys.some((key) => text.includes(key)) && !seen.has(k.slug)) {
      seen.add(k.slug);
      out.push({ term: k.term, slug: k.slug, summary: k.summary });
    }
  }
  return out;
}

// ===========================
// Products
// ===========================

export interface PayloadMedia {
  id: number;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface PayloadProduct {
  id: number;
  title: string;
  slug: string;
  productCode: string | null;
  coverImage: PayloadMedia | null;
  gallery: PayloadMedia[] | null;
  shortDescription: string | null;
  description: unknown;
  category: number | { id: number; title: string; slug: string } | null;
  tags: Array<number | { id: number; title: string; slug: string }> | null;
  price: number | null;
  currency: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function getProducts(): Promise<PayloadProduct[]> {
  try {
    const res = await fetch(`${payloadUrl}/api/products?depth=1&limit=100`);

    if (!res.ok) {
      console.warn(`[payload] Products fetch returned ${res.status}. Returning empty.`);
      return [];
    }

    const { docs } = await res.json();
    return (docs as PayloadProduct[])
      .map((p) => ({
        ...p,
        coverImage: p.coverImage
          ? { ...p.coverImage, url: resolveMediaUrl(p.coverImage.url) ?? "" }
          : null,
        gallery: p.gallery
          ? p.gallery.map((g) => ({ ...g, url: resolveMediaUrl(g.url) ?? "" }))
          : null,
      }))
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch (err) {
    console.warn(`[payload] Failed to fetch products: ${err}. Returning empty.`);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<PayloadProduct | null> {
  try {
    const res = await fetch(
      `${payloadUrl}/api/products?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`
    );

    if (!res.ok) {
      console.warn(`[payload] getProductBySlug returned ${res.status} for "${slug}".`);
      return null;
    }

    const { docs } = await res.json();
    const product = (docs as PayloadProduct[])?.[0] ?? null;
    if (!product) return null;
    return {
      ...product,
      coverImage: product.coverImage
        ? { ...product.coverImage, url: resolveMediaUrl(product.coverImage.url) ?? "" }
        : null,
      gallery: product.gallery
        ? product.gallery.map((g) => ({ ...g, url: resolveMediaUrl(g.url) ?? "" }))
        : null,
    };
  } catch (err) {
    console.warn(`[payload] Failed to fetch product "${slug}": ${err}`);
    return null;
  }
}

export interface PayloadMarketCategory {
  id: number;
  title: string;
  slug: string;
  description: string | null;
}

export async function getMarketCategories(): Promise<PayloadMarketCategory[]> {
  try {
    const res = await fetch(`${payloadUrl}/api/categories?depth=1&limit=100`);

    if (!res.ok) {
      console.warn(`[payload] Categories fetch returned ${res.status}`);
      return [];
    }

    const { docs } = await res.json();

    return (docs as Array<Record<string, unknown>>)
      .filter((c) => {
        const parent = c.parent as { slug?: string } | number | null | undefined;
        if (!parent) return false;
        if (typeof parent === "object") return parent.slug === "market";
        return false;
      })
      .map((c) => ({
        id: c.id as number,
        title: c.title as string,
        slug: c.slug as string,
        description: (c.description as string) ?? null,
      }));
  } catch (err) {
    console.warn(`[payload] Failed to fetch market categories: ${err}`);
    return [];
  }
}

// ===========================
// Between（潜意识层，独立集合，无标题/作者）
// ===========================

export interface BetweenEntry {
  /** 格式化后的时间戳，如 2026.06（取自 publishedAt，回退 updatedAt） */
  createdAt: string;
  /** 正文纯文本，空行分隔段落 */
  body: string;
}

function formatBetweenStamp(date: string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 从 CMS 拉取「参与轮换」的 between 条目（active=true）。
 * 构建时执行（SSG），结果会嵌入 /between 页面，由客户端随机展示其一。
 */
export async function getBetweenEntries(): Promise<BetweenEntry[]> {
  try {
    const res = await fetch(
      `${payloadUrl}/api/between?limit=200&depth=0&where[active][equals]=true`
    );

    if (!res.ok) {
      console.warn(`[payload] Between fetch returned ${res.status}. Returning empty.`);
      return [];
    }

    const { docs } = await res.json();
    return (docs as Array<Record<string, unknown>>)
      .map((d) => ({
        createdAt: formatBetweenStamp(
          (d.publishedAt as string | null) ?? (d.updatedAt as string | null)
        ),
        body: typeof d.body === "string" ? (d.body as string) : "",
      }))
      .filter((e) => e.body.trim().length > 0);
  } catch (err) {
    console.warn(`[payload] Failed to fetch between entries: ${err}. Returning empty.`);
    return [];
  }
}
