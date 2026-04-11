import React, { useState, useEffect, useCallback, useRef } from 'react';

type Tip = { text: string; category: string };

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  navigation: { label: 'Navigation',       icon: '⌕' },
  git:        { label: 'Git',              icon: '⎇' },
  search:     { label: 'Search & Process', icon: '⌖' },
  utility:    { label: 'Utility',          icon: '⚙' },
  pipe:       { label: 'Pipe Aliases',     icon: '|' },
  globbing:   { label: 'Globbing',         icon: '*' },
  history:    { label: 'History',          icon: '↺' },
  fzf:        { label: 'FZF & Zoxide',     icon: '⚡' },
  nix:        { label: 'Nix',              icon: '❄' },
  shell:      { label: 'Shell Behavior',   icon: '$' },
  network:    { label: 'Network',          icon: '⌁' },
  process:    { label: 'Process',          icon: '◎' },
};

const CATEGORY_ORDER = ['navigation', 'git', 'search', 'utility', 'pipe', 'globbing', 'history', 'fzf', 'nix', 'shell', 'network', 'process'];

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const splitRegex = new RegExp(`(${escaped})`, 'gi');
  const testRegex = new RegExp(`^${escaped}$`, 'i');

  return text.split(splitRegex).map((part, i) =>
    testRegex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
  );
}

export default function TipsExplorer({ tips }: { tips: Tip[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isMounted, setIsMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const params = new URLSearchParams(window.location.search);
    const nextQuery = params.get('q');
    const nextFilter = params.get('cat');

    if (nextQuery) {
      setQuery(nextQuery);
    }

    if (nextFilter && CATEGORY_ORDER.includes(nextFilter)) {
      setFilter(nextFilter);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (filter !== 'all') url.searchParams.set('cat', filter);
    else url.searchParams.delete('cat');
    window.history.replaceState({}, '', url);
  }, [query, filter, isMounted]);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditableTarget =
        activeElement instanceof HTMLElement &&
        (activeElement.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName));

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isEditableTarget) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const matchesQuery = useCallback((tip: Tip) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return tip.text.toLowerCase().includes(q) || tip.category.toLowerCase().includes(q);
  }, [query]);

  const filteredTips = tips.filter(tip => 
    matchesQuery(tip) && (filter === 'all' || tip.category === filter)
  );

  const counts = {
    all: tips.filter(matchesQuery).length,
    ...CATEGORY_ORDER.reduce((acc, cat) => {
      acc[cat] = tips.filter(t => t.category === cat && matchesQuery(t)).length;
      return acc;
    }, {} as Record<string, number>),
  };

  const filterButtons = [
    { key: 'all', label: 'All', icon: '≡', count: counts.all },
    ...CATEGORY_ORDER.filter(cat => tips.some(t => t.category === cat)).map(cat => ({
      key: cat,
      label: CATEGORY_META[cat]?.label || cat,
      icon: CATEGORY_META[cat]?.icon || '',
      count: counts[cat as keyof typeof counts],
    }))
  ];

  return (
    <div className="search-view animate-in animate-in-2">
      <div className="search-section">
        <div className="search-wrapper search-wrapper-lg">
          <span aria-hidden="true" className="search-icon">⌕</span>
          <input
            ref={searchRef}
            type="search"
            className="search-field search-field-lg"
            placeholder="Search through tips, categories, and workflows…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tips"
            name="tips-search"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="search-count" aria-live="polite" aria-atomic="true">
            {filteredTips.length} tip{filteredTips.length !== 1 ? 's' : ''}
          </span>
          <kbd aria-hidden="true" className="search-kbd">/</kbd>
        </div>
      </div>

      <div className="segmented-control filter-toolbar" role="group" aria-label="Filter tips by category">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            type="button"
            className={`segmented-btn ${filter === btn.key ? 'active' : ''}`}
            data-category={btn.key !== 'all' ? btn.key : undefined}
            onClick={() => setFilter(btn.key)}
            aria-pressed={filter === btn.key}
            disabled={btn.count === 0}
            style={{ opacity: btn.count === 0 ? 0.4 : 1 }}
          >
            <span aria-hidden="true" style={{ marginRight: '0.2rem', opacity: 0.7 }}>{btn.icon}</span>
            {btn.label}
            <span className="seg-count">{btn.count}</span>
          </button>
        ))}
      </div>

      <div className="surface-list">
        {filteredTips.length === 0 ? (
          <div className="surface-list-item search-empty-state">
            No Tips found for <span className="search-empty-query">&ldquo;{query}&rdquo;</span>
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
          filteredTips.map((tip, idx) => (
            <div key={idx} className="surface-list-item">
              <div className="command-card-header" style={{ alignItems: 'flex-start' }}>
                <p className="command-card-name" style={{ flex: 1, whiteSpace: 'normal', lineHeight: 1.5, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: 0, fontWeight: 500 }}>
                  <span aria-hidden="true" style={{ color: 'var(--accent-color)', marginRight: '0.5rem', fontFamily: 'var(--font-mono)' }}>→</span>
                  {highlightText(tip.text, query)}
                </p>
                <div className="command-card-meta" style={{ marginTop: '0.2rem' }}>
                  <span className="badge badge-category" data-category={tip.category}>
                    {CATEGORY_META[tip.category]?.label || tip.category}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

