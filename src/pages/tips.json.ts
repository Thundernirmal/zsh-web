import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
	const tips = (await getCollection('tips')).map(({ data }) => data);

	return new Response(JSON.stringify(tips), {
		headers: {
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
}
