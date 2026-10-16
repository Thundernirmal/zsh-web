import { getCollection, render } from 'astro:content';

import { commandLinkTargets, resolveCommandLink } from '@/lib/command-links-plugin.mjs';
import { guideNavigationTitle, guidePages, guideUrl } from '@/lib/guide-topics.mjs';
import type { ShellCommand } from '@/lib/shell-docs';

export interface GuideSection {
  href: string;
  title: string;
}

export interface GuideTopicMentions {
  topic: string;
  href: string;
  sections: GuideSection[];
}

let mentions: Promise<Map<string, GuideTopicMentions[]>> | undefined;

/**
 * Guide sections that mention each command, keyed by the command's reference
 * href. Uses the same matching rules as the guide's inline command links.
 */
export function guideMentions(commands: ShellCommand[]) {
  return (mentions ??= collectMentions(commands));
}

async function collectMentions(commands: ShellCommand[]) {
  const targets = commandLinkTargets(commands);
  const result = new Map<string, GuideTopicMentions[]>();
  const entries = await getCollection('docs');

  for (const page of guidePages) {
    const entry = entries.find((candidate) => candidate.id === page.slug);
    if (!entry) continue;
    const { headings } = await render(entry);
    let headingIndex = -1;
    let fenced = false;

    for (const line of (entry.body ?? '').split('\n')) {
      if (/^\s*(?:```|~~~)/.test(line)) {
        fenced = !fenced;
        continue;
      }
      if (fenced) continue;
      if (/^#{1,6}\s/.test(line)) {
        headingIndex += 1;
        continue;
      }
      for (const [, code] of line.matchAll(/`([^`\n]+)`/g)) {
        const target = resolveCommandLink(code, targets);
        if (!target) continue;
        // Attribute the mention to its nearest h2/h3 so the link lands in context.
        let index = headingIndex;
        while (index >= 0 && headings[index].depth > 3) index -= 1;
        const heading = index >= 0 ? headings[index] : undefined;
        const topics = result.get(target) ?? [];
        let topic = topics.find((item) => item.href === guideUrl(page.slug));
        if (!topic) {
          topic = { topic: guideNavigationTitle(page), href: guideUrl(page.slug), sections: [] };
          topics.push(topic);
        }
        const href = heading ? `${topic.href}#${heading.slug}` : topic.href;
        if (heading && !topic.sections.some((section) => section.href === href)) {
          topic.sections.push({ href, title: heading.text });
        }
        result.set(target, topics);
      }
    }

    if (headingIndex + 1 !== headings.length) {
      throw new Error(
        `Guide mentions for ${page.slug} found ${headingIndex + 1} Markdown headings but ${headings.length} rendered headings.`,
      );
    }
  }
  return result;
}
