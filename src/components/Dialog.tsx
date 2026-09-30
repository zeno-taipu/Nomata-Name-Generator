import React, { useEffect, useRef } from 'react';

interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  dismissOnOutside?: boolean;
}

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex], [contenteditable="true"]';

/** Mount only while open. Keeps existing layouts while making the rest of the UI inert. */
export const Dialog: React.FC<DialogProps> = ({ onClose, dismissOnOutside = false, children, ...props }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const outsideRef = useRef(dismissOnOutside);
  closeRef.current = onClose;
  outsideRef.current = dismissOnOutside;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(':disabled') &&
          !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
          getComputedStyle(element).display !== 'none' &&
          getComputedStyle(element).visibility !== 'hidden'
      );
    const focusFirst = () => (focusable()[0] ?? root).focus();
    focusFirst();

    // Inert siblings at every ancestor level, not the dialog's own ancestors.
    const background: Array<{ element: Element; inert: string | null; hidden: string | null }> = [];
    let branch: Element = root;
    while (branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling === branch) continue;
        background.push({
          element: sibling,
          inert: sibling.getAttribute('inert'),
          hidden: sibling.getAttribute('aria-hidden'),
        });
        sibling.setAttribute('inert', '');
        sibling.setAttribute('aria-hidden', 'true');
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const isTopDialog = () => !root.closest('[inert]');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          root.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (isTopDialog() && !root.contains(event.target as Node)) focusFirst();
    };
    // Also guard older WebViews without native inert support.
    const preventBackgroundInteraction = (event: Event) => {
      if (isTopDialog() && !root.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'click' && outsideRef.current) closeRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('pointerdown', preventBackgroundInteraction, true);
    document.addEventListener('click', preventBackgroundInteraction, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('pointerdown', preventBackgroundInteraction, true);
      document.removeEventListener('click', preventBackgroundInteraction, true);
      for (const { element, inert, hidden } of background) {
        if (inert === null) element.removeAttribute('inert');
        else element.setAttribute('inert', inert);
        if (hidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', hidden);
      }
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div
      {...props}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onClick={(event) => {
        if (!dismissOnOutside && event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
};
