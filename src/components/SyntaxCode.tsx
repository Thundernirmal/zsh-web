import type { ReactNode } from 'react';
import { highlightText } from '@/components/HighlightText';

interface SyntaxCodeProps {
  code: string;
  query?: string;
  className?: string;
}

function renderToken(token: string, isFirst: boolean, query: string): ReactNode {
  const content = query ? highlightText(token, query) : token;

  // Comment
  if (token.startsWith('#')) {
    return (
      <span key={token} className="text-muted-foreground/80 italic">
        {content}
      </span>
    );
  }
  // Flags & Options (-v, --flag, -la)
  if (token.startsWith('-') && token.length > 1) {
    return (
      <span key={token} className="text-category-git">
        {content}
      </span>
    );
  }
  // Placeholders / Parameter templates (<pattern>, [path], <list|use>)
  if (/^[<[][^>\]]+[>\]]$/.test(token)) {
    return (
      <span key={token} className="text-category-utility">
        {content}
      </span>
    );
  }
  // Operators (|, &&, ||, >, >>)
  if (/^(\|{1,2}|&&|>+|\|)$/.test(token)) {
    return (
      <span key={token} className="text-category-pipe font-bold">
        {content}
      </span>
    );
  }
  // Quoted strings
  if (/^["'].*["']$/.test(token)) {
    return (
      <span key={token} className="text-category-search">
        {content}
      </span>
    );
  }
  // Primary command name
  if (isFirst) {
    return (
      <span key={token} className="text-foreground font-semibold">
        {content}
      </span>
    );
  }

  return <span key={token}>{content}</span>;
}

export function SyntaxCode({ code, query = '', className }: SyntaxCodeProps) {
  // If multiline or complex, split by lines and tokens
  const lines = code.split('\n');

  return (
    <code translate="no" className={className}>
      {lines.map((line, lineIndex) => {
        // Split line preserving whitespace tokens
        const tokens = line.split(/(\s+|#.*$)/).filter(Boolean);
        let firstTokenEncountered = false;

        return (
          <span key={lineIndex} className="block last:inline">
            {tokens.map((token) => {
              if (/^\s+$/.test(token)) {
                return token;
              }
              const isFirst = !firstTokenEncountered && !token.startsWith('#');
              if (isFirst) firstTokenEncountered = true;
              return renderToken(token, isFirst, query);
            })}
            {lineIndex < lines.length - 1 && '\n'}
          </span>
        );
      })}
    </code>
  );
}
