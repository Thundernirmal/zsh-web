import { useEffect, type RefObject } from 'react';

// Command accordion triggers are real buttons; tip rows opt into keyboard
// navigation by rendering an explicit tabindex attribute (roving focus).
const NAVIGATION_SELECTOR =
	'[data-command] button[data-slot="accordion-trigger"], [role="listitem"][tabindex]';

interface UseSlashFocusOptions {
  onClear?: () => void;
  onCloseExpanded?: () => void;
}

export function useSlashFocus(
  ref: RefObject<HTMLInputElement | null>,
  options?: UseSlashFocusOptions,
) {
  const onClear = options?.onClear;
  const onCloseExpanded = options?.onCloseExpanded;

  useEffect(() => {
    const moveListFocus = (event: KeyboardEvent, direction: 1 | -1) => {
      const triggers = Array.from(
        document.querySelectorAll<HTMLElement>(NAVIGATION_SELECTOR),
      );
      if (triggers.length === 0) return;

      const active = document.activeElement;
      const currentIndex = triggers.findIndex((t) => t === active || t.contains(active));
      const nextIndex =
        direction === 1
          ? currentIndex < triggers.length - 1
            ? currentIndex + 1
            : 0
          : currentIndex > 0
            ? currentIndex - 1
            : triggers.length - 1;
      const next = triggers[nextIndex];
      if (!next || next === active) return;

      // Hijack the key only once a valid target is resolved, so untouched
      // arrow keys keep scrolling the page normally.
      event.preventDefault();
      next.focus();
      if (document.activeElement !== next) return;
      next.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    };

    const handler = (event: KeyboardEvent) => {
      const target = document.activeElement;
      const isInputFocused = target === ref.current;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      // '/' or Cmd/Ctrl+K shortcut to focus search
      const isSlash =
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditable;

      const isCmdOrCtrlK =
        (event.metaKey || event.ctrlKey) &&
        (event.key === 'k' || event.key === 'K');

      if (isSlash || isCmdOrCtrlK) {
        event.preventDefault();
        ref.current?.focus();
        if (isCmdOrCtrlK) {
          ref.current?.select();
        }
        return;
      }

      // Escape to clear search or collapse item
      if (event.key === 'Escape') {
        if (isInputFocused) {
          if (ref.current?.value) {
            onClear?.();
          } else {
            ref.current?.blur();
          }
        } else {
          onCloseExpanded?.();
        }
        return;
      }

      // j / k / arrow navigation between list/accordion items when not editing
      if (!isEditable && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === 'j' || event.key === 'ArrowDown') {
          moveListFocus(event, 1);
        } else if (event.key === 'k' || event.key === 'ArrowUp') {
          moveListFocus(event, -1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClear, onCloseExpanded, ref]);
}

