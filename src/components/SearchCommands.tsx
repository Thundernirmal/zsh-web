import React, { useState, useEffect } from 'react';
import commandsData from '../data/commands.json';

type Command = {
  name: string;
  command?: string;
  usage?: string;
  description?: string;
  type: string;
  category?: string;
  source?: string;
  availability?: string;
  examples?: string[];
  features?: string[];
  notes?: string[];
  requires?: string[];
  optional?: string[];
  interactive?: boolean;
  plainMode?: boolean;
  richOutput?: boolean;
};

const VALID_FILTERS = new Set(['all', 'alias', 'global_alias', 'function']);

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getBadgeClass(type: string): string {
  if (type === 'alias') return 'badge badge-alias';
  if (type === 'global_alias') return 'badge badge-global';
  if (type === 'function') return 'badge badge-function';
  return 'badge';
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const splitRegex = new RegExp(`(${escapedQuery})`, 'gi');
  const testRegex = new RegExp(`^${escapedQuery}$`, 'i');
  const parts = text.split(splitRegex);

  return parts.map((part, i) =>
    testRegex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  );
}

function renderListSection(title: string, items: string[] | undefined, query: string): React.ReactNode {
  if (!items || items.length === 0) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matchingItems = normalizedQuery.length >= 2
    ? items.filter((item) => item.toLowerCase().includes(normalizedQuery))
    : [];
  const visibleItems = matchingItems.length > 0
    ? Array.from(new Set([...matchingItems, ...items])).slice(0, 4)
    : items.slice(0, 4);
  const remainingCount = items.length - visibleItems.length;

  return (
    <section className="command-card-section">
      <h4 className="command-card-section-title">{title}</h4>
      <ul className="command-card-list">
        {visibleItems.map((item) => (
          <li key={`${title}:${item}`} className="command-card-list-item">
            {highlightText(item, query)}
          </li>
        ))}
      </ul>
      {remainingCount > 0 && (
        <p className="command-card-more">+{remainingCount} more</p>
      )}
    </section>
  );
}

function getSearchableText(command: Command): string {
  return [
    command.name,
    command.command,
    command.usage,
    command.description,
    command.type,
    command.category,
    command.source,
    command.availability,
    ...(command.examples ?? []),
    ...(command.features ?? []),
    ...(command.notes ?? []),
    ...(command.requires ?? []),
    ...(command.optional ?? []),
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
}

export default function SearchCommands() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);
  const commands: Command[] = commandsData;

  useEffect(() => {
    setIsMounted(true);
    const params = new URLSearchParams(window.location.search);
    const nextQuery = params.get('q');
    const nextFilter = params.get('type');

    if (nextQuery) {
      setQuery(nextQuery);
    }

    if (nextFilter && VALID_FILTERS.has(nextFilter)) {
      setFilter(nextFilter);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (filter !== 'all') url.searchParams.set('type', filter);
    else url.searchParams.delete('type');
    window.history.replaceState({}, '', url);
  }, [query, filter, isMounted]);

  const matchesQuery = (cmd: Command) => {
    const q = query.toLowerCase();
    return !query || getSearchableText(cmd).includes(q);
  };

  const filteredCommands = commands.filter(cmd =>
    matchesQuery(cmd) && (filter === 'all' || cmd.type === filter)
  );

  // Counts always reflect current search query
  const counts = {
    all: commands.filter(matchesQuery).length,
    alias: commands.filter(c => matchesQuery(c) && c.type === 'alias').length,
    global_alias: commands.filter(c => matchesQuery(c) && c.type === 'global_alias').length,
    function: commands.filter(c => matchesQuery(c) && c.type === 'function').length,
  };

  const filterButtons = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'alias', label: 'Aliases', count: counts.alias },
    { key: 'global_alias', label: 'Globals', count: counts.global_alias },
    { key: 'function', label: 'Functions', count: counts.function },
  ];

  return (
    <div className="search-view animate-in animate-in-2">
      <div className="search-section">
        <div className="search-wrapper search-wrapper-with-count">
          <span aria-hidden="true" className="search-icon">⌕</span>
          <input
            type="search"
            className="search-field search-field-lg"
            placeholder="Search commands, aliases, options…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
            name="command-search"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="search-meta">
            <span className="search-count" aria-live="polite" aria-atomic="true">
              {filteredCommands.length} result{filteredCommands.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="segmented-control filter-toolbar" role="group" aria-label="Filter commands by type">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            type="button"
            className={`segmented-btn ${filter === btn.key ? 'active' : ''}`}
            data-type={btn.key}
            onClick={() => setFilter(btn.key)}
            aria-pressed={filter === btn.key}
          >
            {btn.label}
            <span className="seg-count">{btn.count}</span>
          </button>
        ))}
      </div>

      <div className="surface-list">
        {filteredCommands.length === 0 ? (
          <div className="surface-list-item search-empty-state">
            No Results for <span className="search-empty-query">&ldquo;{query}&rdquo;</span>
            <span className="search-empty-separator" aria-hidden="true">—</span>
            <button
              type="button"
              className="text-button"
              onClick={() => { setQuery(''); setFilter('all'); }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredCommands.map((cmd, idx) => (
            <div key={cmd.name + cmd.type + idx} className="surface-list-item">
              <div className="command-card-header">
                <h3 className="command-card-name">{highlightText(cmd.name, query)}</h3>
                <div className="command-card-meta">
                  {cmd.category && (
                    <span className="badge badge-category" data-category={cmd.category}>
                      {formatLabel(cmd.category)}
                    </span>
                  )}
                  <span className={getBadgeClass(cmd.type)}>
                    {cmd.type.replace('_', ' ')}
                  </span>
                  {cmd.source && (
                    <span className="command-card-source">{cmd.source}</span>
                  )}
                </div>
              </div>

              {cmd.description && (
                <p className="command-card-desc">
                  {highlightText(cmd.description, query)}
                </p>
              )}

              {cmd.command && (
                <div className="command-card-line">
                  <span className="command-card-label">Command</span>
                  <code className="command-card-code">{highlightText(cmd.command, query)}</code>
                </div>
              )}

              {cmd.usage && cmd.usage !== cmd.command && (
                <div className="command-card-line">
                  <span className="command-card-label">Usage</span>
                  <code className="command-card-code">{highlightText(cmd.usage, query)}</code>
                </div>
              )}

              {cmd.availability && (
                <p className="command-card-note">
                  {highlightText(cmd.availability, query)}
                </p>
              )}

              {(cmd.interactive || cmd.plainMode || cmd.richOutput || (cmd.requires && cmd.requires.length > 0) || (cmd.optional && cmd.optional.length > 0)) && (
                <div className="command-card-tags">
                  {cmd.interactive && <span className="badge badge-subtle">Interactive</span>}
                  {cmd.plainMode && <span className="badge badge-subtle">Plain Mode</span>}
                  {cmd.richOutput && <span className="badge badge-subtle">Rich Output</span>}
                  {(cmd.requires ?? []).map((requirement) => (
                    <span key={`${cmd.name}:${requirement}`} className="badge badge-subtle">
                      Requires {formatLabel(requirement)}
                    </span>
                  ))}
                  {(cmd.optional ?? []).map((dependency) => (
                    <span key={`${cmd.name}:optional:${dependency}`} className="badge badge-subtle">
                      Uses {formatLabel(dependency)} if available
                    </span>
                  ))}
                </div>
              )}

              <div className="command-card-grid">
                {renderListSection('Features', cmd.features, query)}
                {renderListSection('Examples', cmd.examples, query)}
                {renderListSection('Notes', cmd.notes, query)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
