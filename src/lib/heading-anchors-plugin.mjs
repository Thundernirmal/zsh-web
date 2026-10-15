import GithubSlugger from 'github-slugger';

// Gives guide h2–h4 headings a shareable self-link. User hast plugins run
// before Astro's heading-ID pass, so this plugin assigns IDs with the same
// slugger (Astro keeps an existing ID). The link sits beside the heading in a
// wrapper, not inside it, so the heading's text and accessible name stay
// unchanged; CSS draws the "#".
export function headingAnchorsPlugin() {
  return () => {
    const slugger = new GithubSlugger();
    return {
      name: 'heading-anchors',
      element: {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        visit(node, ctx) {
          const text = ctx.textContent(node);
          const existingId = node.properties?.id;
          const id = typeof existingId === 'string' ? existingId : slugger.slug(text);
          if (typeof existingId !== 'string') ctx.setProperty(node, 'id', id);
          if (!['h2', 'h3', 'h4'].includes(node.tagName)) return;
          ctx.wrapNode(node, {
            type: 'element',
            tagName: 'div',
            properties: { className: ['heading-group'] },
            children: [{
              type: 'element',
              tagName: 'a',
              properties: { href: `#${id}`, className: ['heading-anchor'], ariaLabel: `Link to section: ${text}` },
              children: [],
            }],
          });
        },
      },
    };
  };
}
