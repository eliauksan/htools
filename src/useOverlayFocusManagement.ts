import {
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  useLayoutEffect,
  useRef
} from "react";

const OVERLAY_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function getOverlayFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(OVERLAY_FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
  );
}

export function useOverlayFocusManagement({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
  returnFocusRef
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const capturedReturnFocusRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;
    capturedReturnFocusRef.current =
      returnFocusRef.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    if (container) {
      const initialFocus =
        initialFocusRef?.current ?? getOverlayFocusableElements(container)[0];
      (initialFocus ?? container).focus({ preventScroll: true });
    }

    return () => {
      const returnFocus = capturedReturnFocusRef.current;
      if (returnFocus?.isConnected) {
        returnFocus.focus({ preventScroll: true });
      }
    };
  }, [active]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!active) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const focusableElements = getOverlayFocusableElements(container);

    if (focusableElements.length === 0) {
      event.preventDefault();
      container.focus({ preventScroll: true });
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (
      event.shiftKey &&
      (activeElement === firstElement || !container.contains(activeElement))
    ) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === lastElement || !container.contains(activeElement))
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return { handleKeyDown };
}
