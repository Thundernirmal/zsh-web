import GithubSlugger from 'github-slugger';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';

import { guideOverview, guideTopics, guideUrl } from '../src/lib/guide-topics.mjs';

function parseMarkdown(markdown) {
  return fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
}

function inlineText(node) {
  if (node.type === 'html') return node.value.replace(/<[^>]*>/g, '');
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? '';
  if (node.type === 'break') return ' ';
  return node.children ? node.children.map(inlineText).join('') : node.value ?? '';
}

function searchText(node) {
  if (node.type === 'definition' || node.type === 'thematicBreak') return '';
  if (['paragraph', 'heading', 'tableCell'].includes(node.type)) return inlineText(node);
  return node.children ? node.children.map(searchText).filter(Boolean).join(' ') : inlineText(node);
}

// One entry per h2/h3 section so results land on the matching passage. Every
// heading advances a page-local slugger in document order, matching the IDs
// the site renders; deeper and nested headings stay within their section.
// Sections with no text of their own (only subsections) are omitted.
export function guideSearchIndex(pages) {
  return pages.flatMap((page) => {
    const url = guideUrl(page.slug);
    const slugger = new GithubSlugger();
    const entries = [{ title: page.title, url, parts: [] }];
    const slugNested = (node) => {
      if (node.type === 'heading') slugger.slug(inlineText(node));
      for (const child of node.children ?? []) slugNested(child);
    };
    for (const node of parseMarkdown(page.body).children) {
      if (node.type === 'heading' && node.depth <= 3) {
        // Titles are matched separately, so the excerpt text starts after the heading.
        const title = inlineText(node);
        entries.push({ title, topic: page.title, url: `${url}#${slugger.slug(title)}`, parts: [] });
        continue;
      }
      slugNested(node);
      entries.at(-1).parts.push(searchText(node));
    }
    return entries
      .map(({ parts, ...entry }) => ({ ...entry, text: parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() }))
      .filter((entry) => entry.text);
  });
}

export function generateGuideDocs(guide) {
  // CommonMark code spans supply exact source ranges. Fenced/indented code
  // stays opaque, so table compatibility escaping cannot mutate examples.
  const spans = [];
  const visit = (node) => {
    if (node.type === 'inlineCode') spans.push({ start: node.position.start.offset, end: node.position.end.offset });
    for (const child of node.children ?? []) visit(child);
  };
  visit(fromMarkdown(guide));
  // Mask code-span pipes without changing offsets before recognizing tables.
  // This also allows pipes in header cells, which would otherwise break GFM's
  // header/delimiter column-count check before we can repair them.
  let probe = guide;
  for (const { start, end } of [...spans].reverse()) probe = probe.slice(0, start) + probe.slice(start, end).replace(/(?<!\\)\|/g, 'x') + probe.slice(end);
  const tableRanges = [];
  const collectTables = (node) => {
    if (node.type === 'table') tableRanges.push([node.position.start.offset, node.position.end.offset]);
    for (const child of node.children ?? []) collectTables(child);
  };
  collectTables(parseMarkdown(probe));
  const edits = spans.filter(({ start, end }) => tableRanges.some(([begin, finish]) => start >= begin && end <= finish))
    .map(({ start, end }) => ({ start, end, text: guide.slice(start, end).replace(/(?<!\\)\|/g, '\\|') }));
  for (const edit of edits.reverse()) guide = guide.slice(0, edit.start) + edit.text + guide.slice(edit.end);
  const tree = parseMarkdown(guide);
  const originalSlugger = new GithubSlugger();
  const headingNodes = [];
  const collectHeadings = (node, root = false) => {
    if (node.type === 'heading') headingNodes.push({ node, root });
    for (const child of node.children ?? []) collectHeadings(child, node.type === 'root');
  };
  collectHeadings(tree);
  const headings = headingNodes.map(({ node, root }) => {
    const text = inlineText(node);
    return { root, level: node.depth, text, offset: node.position.start.offset, oldAnchor: originalSlugger.slug(text) };
  });
  const sections = headings.filter((heading) => heading.root && heading.level === 2);
  if (sections.filter((section) => section.text === 'Contents').length > 1) throw new Error('GUIDE.md contains duplicate Contents sections');
  const assigned = guideTopics.flatMap((topic) => topic.sections);
  for (const title of assigned) {
    if (sections.filter((section) => section.text === title).length !== 1) throw new Error(`GUIDE.md must contain exactly one section: ${title}`);
  }
  for (const section of sections) {
    if (section.text !== 'Contents' && !assigned.includes(section.text)) throw new Error(`Unassigned GUIDE.md section: ${section.text}`);
  }
  if (new Set(assigned).size !== assigned.length) throw new Error('Guide section assigned more than once');

  const anchors = Object.assign(Object.create(null), { contents: '/docs/#explore-the-guide', 'shared-zsh-configuration-guide': '/docs/#_top' });
  const pages = guideTopics.map((topic) => {
    const slugger = new GithubSlugger();
    const chunks = topic.sections.map((title) => {
      const section = sections.find((item) => item.text === title);
      const next = sections[sections.indexOf(section) + 1];
      const end = next?.offset ?? guide.length;
      // Every old heading (including duplicate names) maps to its new page-local slug.
      for (const heading of headings.filter((item) => item.offset >= section.offset && item.offset < end)) {
        anchors[heading.oldAnchor] = `${guideUrl(topic.slug)}#${slugger.slug(heading.text)}`;
      }
      return guide.slice(section.offset, end).trim();
    });
    return { slug: topic.slug, title: topic.title, description: topic.description, body: chunks.join('\n\n') };
  });
  const rewrite = (body) => body.replace(/\]\(#([^)]*)\)/g, (match, anchor) => Object.hasOwn(anchors, anchor) ? `](${anchors[anchor]})` : match);
  const intro = guide.slice(0, sections[0]?.offset ?? guide.length).replace(/^# .+\n/, '').trim();
  const overview = `${intro}\n`;
  return {
    pages: [{ ...guideOverview, body: overview }, ...pages].map((page) => ({ ...page, body: rewrite(page.body) })),
    anchors,
  };
}
