import { useEffect, type RefObject } from 'react';

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
    const handler = (event: KeyboardEvent) => {
      const target = document.activeElement;
      const isInputFocused = target === ref.current;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      // '/' shortcut to focus search
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditable
      ) {
        event.preventDefault();
        ref.current?.focus();
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

      // j / k navigation between list/accordion items when not editing
      if (!isEditable && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key === 'j' || event.key === 'ArrowDown') {
          const triggers = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-command] button[data-slot="trigger"], [role="listitem"]',
            ),
          );
          if (triggers.length === 0) return;
          const currentIndex = triggers.findIndex((t) => t === target || t.contains(target));
          const nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
          event.preventDefault();
          triggers[nextIndex]?.focus();
          triggers[nextIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (event.key === 'k' || event.key === 'ArrowUp') {
          const triggers = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-command] button[data-slot="trigger"], [role="listitem"]',
            ),
          );
          if (triggers.length === 0) return;
          const currentIndex = triggers.findIndex((t) => t === target || t.contains(target));
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
          event.preventDefault();
          triggers[prevIndex]?.focus();
          triggers[prevIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClear, onCloseExpanded, ref]);
}

