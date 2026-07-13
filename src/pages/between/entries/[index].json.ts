import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

function formatCreatedAt(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getPublishedEntries(entries: Awaited<ReturnType<typeof getCollection<"between">>>) {
  return entries.filter((entry) => !entry.data.hidden && (entry.data.weight ?? 1) > 0);
}

export async function getStaticPaths() {
  const entries = getPublishedEntries(await getCollection("between"));

  return entries.map((_, index) => ({
    params: { index: String(index) },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const index = Number.parseInt(params.index ?? "", 10);
  const entries = getPublishedEntries(await getCollection("between"));
  const entry = entries[index];

  if (!entry) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }

  return new Response(
    JSON.stringify({
      createdAt: formatCreatedAt(entry.data.createdAt),
      body: entry.body,
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    },
  );
};
