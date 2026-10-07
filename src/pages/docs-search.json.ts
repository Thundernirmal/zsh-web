import type { APIRoute } from 'astro';
import index from '@/data/docs-search.json';

export const GET: APIRoute = () => new Response(JSON.stringify(index), {
  // Static hosting cache policy is defined once in public/_headers.
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
