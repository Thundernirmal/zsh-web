// Links inline guide code that names a registered shell command to that
// command's static reference page. Runs as a Sätteri hast plugin at render
// time, so generated guide Markdown stays untouched.

// Aliases that shadow ordinary tools or read as punctuation would link prose
// that means the system command, not this configuration's alias.
const ambiguousAliases = new Set(['-', '..', '...', '....', 'cat', 'diff', 'grep', 'ls']);
const skippedAncestor = /^(?:a|pre|h[1-6])$/;

export function commandLinkTargets(commands) {
  const targets = new Map();
  for (const command of commands) {
    const href = `/commands/${command.id.replace(/^command-/, '')}/`;
    if (command.type === 'function') targets.set(command.name, href);
    else if (command.type === 'alias' && !ambiguousAliases.has(command.name)) targets.set(command.name, href);
    // Actions are subcommands such as `cgm check`; match their two-word prefix.
    else if (command.type === 'action' && command.command) {
      targets.set(command.command.split(/\s+/).slice(0, 2).join(' '), href);
    }
  }
  return targets;
}

export function resolveCommandLink(text, targets) {
  const words = text.trim().split(/\s+/);
  return targets.get(words.slice(0, 2).join(' ')) ?? targets.get(words[0]);
}

/** @param {{ commands: Array<{ id: string; name: string; type: string; command?: string }> }} options */
export function commandLinksPlugin({ commands }) {
  const targets = commandLinkTargets(commands);
  return {
    name: 'command-links',
    element: {
      filter: ['h2', 'code'],
      visit(node, ctx) {
        // Link the first mention of each command per h2 section to avoid link noise.
        if (node.tagName === 'h2' || !ctx.data.commandLinks) ctx.data.commandLinks = new Set();
        if (node.tagName === 'h2') return;
        for (let parent = ctx.parent(node); parent; parent = ctx.parent(parent)) {
          if (parent.type === 'element' && skippedAncestor.test(parent.tagName)) return;
        }
        const href = resolveCommandLink(ctx.textContent(node), targets);
        if (!href || ctx.data.commandLinks.has(href)) return;
        ctx.data.commandLinks.add(href);
        ctx.wrapNode(node, { type: 'element', tagName: 'a', properties: { href, translate: 'no' }, children: [] });
      },
    },
  };
}
