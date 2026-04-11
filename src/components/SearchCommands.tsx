import React, { useState, useEffect } from 'react';
import commandsData from '../data/commands.json';

type Command = {
  name: string;
  command?: string;
  description?: string;
  type: string;
  category?: string;
  source?: string;
};

const VALID_FILTERS = new Set(['all', 'alias', 'global_alias', 'function']);

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
    return !query ||
      cmd.name.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q)) ||
      (cmd.command && cmd.command.toLowerCase().includes(q));
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
                  {cmd.source && (
                    <span className="command-card-source">{cmd.source}</span>
                  )}
                  <span className={getBadgeClass(cmd.type)}>
                    {cmd.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {cmd.description && (
                <p className="command-card-desc">
                  {highlightText(cmd.description, query)}
                </p>
              )}

              {cmd.command && (
                <code className="command-card-code">{highlightText(cmd.command, query)}</code>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
