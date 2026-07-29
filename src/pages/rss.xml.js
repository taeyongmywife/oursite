import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPosts } from '../lib/payload';

export async function GET(context) {
	const posts = await getPosts();
	const published = posts.filter((p) => p.status === "published");

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: published.map((post) => ({
			title: post.title,
			link: `/blog/${post.slug}/`,
			description: post.excerpt ?? '',
			pubDate: new Date(post.publishedAt ?? post.createdAt),
		})),
	});
}
