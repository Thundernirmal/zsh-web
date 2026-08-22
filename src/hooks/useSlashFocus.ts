import { useEffect, type RefObject } from 'react';

export function useSlashFocus(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = document.activeElement;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditable
      ) {
        event.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ref]);
}
