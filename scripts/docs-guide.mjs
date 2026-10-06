import GithubSlugger from 'github-slugger';

// One navigation/section map shared by extraction, Starlight, and budget checks.
export const guideTopics = [
  { slug: 'installation', title: 'Installation and requirements', sections: ['Setup and scope', 'Dependencies'] },
  { slug: 'shell-basics', title: 'Shell basics', sections: ['Shell options and history', 'Completion', 'Aliases'] },
  { slug: 'finders', title: 'Navigation and finders', sections: ['Zoxide and fzf'] },
  { slug: 'commands', title: 'Command discovery and helpers', sections: ['Command discovery', 'Function reference'] },
  { slug: 'packages', title: 'Package workflows', sections: ['Package manager: upkg'] },
  { slug: 'nix', title: 'Nix profiles and pickers', sections: ['Nix profile manager: npkg'] },
  { slug: 'credentials', title: 'Credentials', sections: ['Credential manager: cgm'] },
  { slug: 'themes', title: 'Themes and terminal output', sections: ['Terminal output modes'] },
  { slug: 'safety', title: 'Gotchas and safety', sections: ['Gotchas and safety boundaries'] },
  { slug: 'maintenance', title: 'Maintenance and verification', sections: ['Module layout', 'Maintenance and verification'] },
];

function headingText(text) {
  return text.replace(/[`*_]/g, '').replace(/<[^>]*>/g, '');
}

export function generateGuideDocs(guide) {
  // Preserve table cells containing literal shell pipes.
  guide = guide.replace(/^\|.*$/gm, (row) => row.replace(/`[^`\n]+`/g, (code) => code.replace(/(?<!\\)\|/g, '\\|')));
  const sections = [];
  let fence;
  let position = 0;
  const headings = [];
  const originalSlugger = new GithubSlugger();
  for (const line of guide.split('\n')) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    if (delimiter) {
      if (!fence) fence = delimiter[1];
      else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) fence = undefined;
    } else if (!fence) {
      const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (heading) {
        const text = headingText(heading[2]);
        const item = { level: heading[1].length, text, offset: position, oldAnchor: originalSlugger.slug(text) };
        headings.push(item);
        if (item.level === 2) sections.push(item);
      }
    }
    position += line.length + 1;
  }
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
  const overview = `${intro}\n\n## Explore the guide\n\n${pages.map((page) => `- [${page.title}](/docs/${page.slug}/)`).join('\n')}\n\n## Command reference\n\n[Browse searchable commands](/commands/) or [explore shell tips](/tips/).\n`;
  return {
    pages: [{ slug: 'index', title: 'Shared Zsh Configuration Guide', body: overview }, ...pages].map((page) => ({ ...page, body: rewrite(page.body) })),
    anchors,
  };
}
