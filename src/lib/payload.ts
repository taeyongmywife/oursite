// Payload CMS API data layer for BubbleCrisp frontend

const PAYLOAD_URL = import.meta.env.PUBLIC_PAYLOAD_URL || 'http://localhost:3000';

// --- Types ---

export interface KnowledgeEntry {
  id: number;
  term: string;
  slug: string;
  summary?: string | null;
  content?: LexicalContent | null;
  icon?: number | MediaDoc | null;
  category?: number | CategoryDoc | null;
  tags?: number | TagDoc[] | null;
  aliases?: { alias?: string | null; id?: string | null }[] | null;
  relatedTerms?: number | KnowledgeEntry[] | null;
  relatedCollections?: number | CollectionDoc[] | null;
  featured?: boolean | null;
  published?: boolean | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  updatedAt: string;
  createdAt: string;
}

interface MediaDoc {
  id: number;
  alt: string;
  url?: string | null;
  filename?: string | null;
}

interface CategoryDoc {
  id: number;
  title: string;
  slug: string;
}

interface TagDoc {
  id: number;
  title: string;
  slug: string;
}

interface CollectionDoc {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
}

interface LexicalContent {
  root: LexicalNode;
  [key: string]: unknown;
}

interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  direction?: ('ltr' | 'rtl') | null;
  tag?: string;
  listType?: string;
  url?: string;
  target?: string;
  rel?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

// --- Lexical to HTML converter ---

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

function wrapFormat(text: string, format: number): string {
  if (format === 0 || format === undefined) return text;
  let result = text;
  // Apply inner-to-outer: code → strikethrough → underline → italic → bold
  if (format & FORMAT_CODE) result = `<code>${result}</code>`;
  if (format & FORMAT_STRIKETHROUGH) result = `<s>${result}</s>`;
  if (format & FORMAT_UNDERLINE) result = `<u>${result}</u>`;
  if (format & FORMAT_ITALIC) result = `<em>${result}</em>`;
  if (format & FORMAT_BOLD) result = `<strong>${result}</strong>`;
  return result;
}

function nodeToHtml(node: LexicalNode): string {
  switch (node.type) {
    case 'root':
      return (node.children ?? []).map(nodeToHtml).join('');

    case 'paragraph': {
      const inner = (node.children ?? []).map(nodeToHtml).join('');
      return `<p>${inner}</p>`;
    }

    case 'heading': {
      const tag = node.tag ?? 'h2';
      const inner = (node.children ?? []).map(nodeToHtml).join('');
      return `<${tag}>${inner}</${tag}>`;
    }

    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul';
      const inner = (node.children ?? []).map(nodeToHtml).join('');
      return `<${tag}>${inner}</${tag}>`;
    }

    case 'listitem': {
      const inner = (node.children ?? []).map(nodeToHtml).join('');
      return `<li>${inner}</li>`;
    }

    case 'link': {
      const inner = (node.children ?? []).map(nodeToHtml).join('');
      const href = node.url ?? '#';
      const attrs: string[] = [`href="${href}"`];
      if (node.target) attrs.push(`target="${node.target}"`);
      if (node.rel) attrs.push(`rel="${node.rel}"`);
      return `<a ${attrs.join(' ')}>${inner}</a>`;
    }

    case 'text':
      return wrapFormat(node.text ?? '', node.format ?? 0);

    case 'linebreak':
      return '<br>';

    case 'horizontalrule':
      return '<hr>';

    case 'upload': {
      const fields = (node.fields ?? {}) as Record<string, string>;
      if (fields.url) {
        const alt = fields.alt ?? '';
        return `<img src="${fields.url}" alt="${alt}" />`;
      }
      return '';
    }

    default:
      // Unknown node type — recurse into children if any
      if (node.children && node.children.length > 0) {
        return node.children.map(nodeToHtml).join('');
      }
      return '';
  }
}

export function lexicalToHtml(content: LexicalContent): string {
  if (!content?.root) return '';
  return nodeToHtml(content.root);
}

// --- API functions ---

async function payloadFetch<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${PAYLOAD_URL}${endpoint}`);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

interface PayloadListResponse<T> {
  docs: T[];
  total: number;
  limit: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export async function getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | null> {
  const data = await payloadFetch<PayloadListResponse<KnowledgeEntry>>(
    `/api/knowledge-index?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`
  );
  if (!data?.docs?.length) return null;
  return data.docs[0];
}

export async function getKnowledgeList(): Promise<KnowledgeEntry[]> {
  const data = await payloadFetch<PayloadListResponse<KnowledgeEntry>>(
    `/api/knowledge-index?depth=1&where[published][equals]=true&limit=100&sort=term`
  );
  return data?.docs ?? [];
}

export async function getKnowledgeSlugs(): Promise<string[]> {
  const entries = await getKnowledgeList();
  return entries.map((e) => e.slug);
}

export async function getKnowledgeBySlugs(slugs: string[]): Promise<KnowledgeEntry[]> {
  if (slugs.length === 0) return [];
  const results: KnowledgeEntry[] = [];
  for (const slug of slugs) {
    const entry = await getKnowledgeBySlug(slug);
    if (entry) results.push(entry);
  }
  return results;
}
