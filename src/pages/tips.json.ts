import tips from '@/data/tips.json';

export const prerender = true;

export function GET() {
	return new Response(JSON.stringify(tips), {
		headers: {
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			'Content-Type': 'application/json; charset=utf-8',
		},
	});
}
