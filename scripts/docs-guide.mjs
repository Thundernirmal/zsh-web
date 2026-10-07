import GithubSlugger from 'github-slugger';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';

// One navigation/section map shared by extraction and the custom documentation.
export const guideTopics = [
  { slug: 'installation', title: 'Installation and requirements', description: 'Set up your shell and check the tools it needs.', sections: ['Setup and scope', 'Dependencies'] },
  { slug: 'shell-basics', title: 'Shell basics', description: 'History, completion, aliases, and everyday shortcuts.', sections: ['Shell options and history', 'Completion', 'Aliases'] },
  { slug: 'finders', title: 'Navigation and finders', description: 'Move between directories and make the most of fzf.', sections: ['Zoxide and fzf'] },
  { slug: 'commands', title: 'Command discovery and helpers', description: 'Find commands and learn the helpers behind them.', sections: ['Command discovery', 'Function reference'] },
  { slug: 'packages', title: 'Package workflows', description: 'Check, search, upgrade, and clean with upkg.', sections: ['Package manager: upkg'] },
  { slug: 'nix', title: 'Nix profiles and pickers', description: 'Manage profiles, select packages, and compare outputs.', sections: ['Nix profile manager: npkg'] },
  { slug: 'credentials', title: 'Credentials', description: 'Store and load shell credentials with cgm.', sections: ['Credential manager: cgm'] },
  { slug: 'themes', title: 'Themes and terminal output', description: 'Choose colors, glyphs, and finder layouts.', sections: ['Terminal output modes'] },
  { slug: 'safety', title: 'Gotchas and safety', description: 'Understand the boundaries before changing shell state.', sections: ['Gotchas and safety boundaries'] },
  { slug: 'maintenance', title: 'Maintenance and verification', description: 'Explore the modules and verify changes to the config.', sections: ['Module layout', 'Maintenance and verification'] },
];

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

export function guideSearchIndex(pages) {
  return pages.map((page) => ({
    title: page.title,
    url: page.slug === 'index' ? '/docs/' : `/docs/${page.slug}/`,
    text: searchText(parseMarkdown(page.body)).replace(/\s+/g, ' ').trim(),
  }));
}

export function generateGuideDocs(guide) {
  // CommonMark code spans supply exact source ranges. Fenced/indented code
  // stays opaque, so table compatibility escaping cannot mutate examples.
  const edits = [];
  const visit = (node) => {
    if (node.type === 'inlineCode') {
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      const line = guide.slice(guide.lastIndexOf('\n', start - 1) + 1, start);
      if (/^\s*\|/.test(line)) edits.push({ start, end, text: guide.slice(start, end).replace(/(?<!\\)\|/g, '\\|') });
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(fromMarkdown(guide));
  for (const edit of edits.reverse()) guide = guide.slice(0, edit.start) + edit.text + guide.slice(edit.end);
  const tree = parseMarkdown(guide);
  const originalSlugger = new GithubSlugger();
  const headings = tree.children.filter((node) => node.type === 'heading').map((node) => {
    const text = inlineText(node);
    return { level: node.depth, text, offset: node.position.start.offset, oldAnchor: originalSlugger.slug(text) };
  });
  const sections = headings.filter((heading) => heading.level === 2);
  if (sections.filter((section) => section.text === 'Contents').length > 1) throw new Error('GUIDE.md contains duplicate Contents sections');
  const assigned = guideTopics.flatMap((topic) => topic.sections);
  for (const title of assigned) {
    if (sections.filter((section) => section.text === title).length !== 1) throw new Error(`GUIDE.md must contain exactly one section: ${title}`);
  }
  for (const section of sections) {
    if (section.text !== 'Contents' && !assigned.includes(section.text)) throw new Error(`Unassigned GUIDE.md section: ${section.text}`);
  }
  if (new Set(assigned).size !== assigned.length) throw new Error('Guide section assigned more than once');

  const anchors = { contents: '/docs/#explore-the-guide', 'shared-zsh-configuration-guide': '/docs/#_top' };
  const pages = guideTopics.map((topic) => {
    const slugger = new GithubSlugger();
    const chunks = topic.sections.map((title) => {
      const section = sections.find((item) => item.text === title);
      const next = sections[sections.indexOf(section) + 1];
      const end = next?.offset ?? guide.length;
      // Every old heading (including duplicate names) maps to its new page-local slug.
      for (const heading of headings.filter((item) => item.offset >= section.offset && item.offset < end)) {
        anchors[heading.oldAnchor] = `/docs/${topic.slug}/#${slugger.slug(heading.text)}`;
      }
      return guide.slice(section.offset, end).trim();
    });
    return { slug: topic.slug, title: topic.title, body: chunks.join('\n\n') };
  });
  const rewrite = (body) => body.replace(/\]\(#([^)]*)\)/g, (match, anchor) => anchors[anchor] ? `](${anchors[anchor]})` : match);
  const intro = guide.slice(0, sections[0]?.offset ?? guide.length).replace(/^# .+\n/, '').trim();
  const overview = `${intro}\n`;
  return {
    pages: [{ slug: 'index', title: 'Shell guide', body: overview }, ...pages].map((page) => ({ ...page, body: rewrite(page.body) })),
    anchors,
  };
}
