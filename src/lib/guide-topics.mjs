// One navigation/section map shared by extraction and the custom documentation.
export const guideOverview = {
  slug: 'index', title: 'Shell guide', navigationTitle: 'Overview',
  description: 'Setup, everyday workflows, and the details behind your commands.',
};

export function guideUrl(slug) {
  return slug === 'index' ? '/docs/' : `/docs/${slug}/`;
}

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

export const guidePages = [guideOverview, ...guideTopics.map((topic) => ({ ...topic, navigationTitle: topic.title }))];
