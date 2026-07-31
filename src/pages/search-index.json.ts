import type { APIRoute } from "astro";

const payloadUrl = import.meta.env.PUBLIC_PAYLOAD_URL;

/**
 * 构建时生成的静态搜索索引。
 * 输出全部 published 文章的轻量字段，供前端 SearchBar 做客户端实时过滤。
 * 未来接入真搜索引擎时，本文件可被替换为后端索引 API。
 */
export const GET: APIRoute = async () => {
  let docs: Array<Record<string, any>> = [];

  try {
    const res = await fetch(`${payloadUrl}/api/posts?depth=1&limit=200`);
    if (res.ok) {
      const data = await res.json();
      docs = data.docs ?? [];
    } else {
      console.warn(`[search-index] posts fetch returned ${res.status}`);
    }
  } catch (err) {
    console.warn(`[search-index] failed to fetch posts: ${err}`);
  }

  const index = docs
    .filter((d) => d.status === "published")
    .map((d) => ({
      title: d.title ?? "",
      slug: d.slug ?? "",
      category:
        typeof d.category === "object" && d.category !== null
          ? d.category.slug
          : null,
      summary: d.excerpt ?? "",
      tagBox: (Array.isArray(d.tagBox) ? d.tagBox : [])
        .map((t: any) => (typeof t === "object" && t !== null ? t.slug : ""))
        .filter(Boolean),
      keywords: (Array.isArray(d.keywords) ? d.keywords : [])
        .map((k: any) => (typeof k === "object" && k !== null ? k.keyword || "" : ""))
        .filter(Boolean),
    }));

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "max-age=0, s-maxage=3600",
    },
  });
};
