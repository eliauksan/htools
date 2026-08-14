import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import {
  isEventInsideElement,
  useOutsideInteractionDismiss
} from "./useOutsideInteractionDismiss";

export const ADMIN_CARD_MENU_OPEN_EVENT = "htools:admin-card-menu-open";

export function useAdminCardActionMenu(menuKey: string) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<"first" | "last" | null>(null);

  useEffect(() => {
    function handleOtherMenu(event: Event) {
      if ((event as CustomEvent<string>).detail !== menuKey) setOpen(false);
    }
    window.addEventListener(ADMIN_CARD_MENU_OPEN_EVENT, handleOtherMenu);
    return () => window.removeEventListener(ADMIN_CARD_MENU_OPEN_EVENT, handleOtherMenu);
  }, [menuKey]);

  useOutsideInteractionDismiss({
    active: open,
    isInside: (event) => isEventInsideElement(event, rootRef.current),
    onDismiss: () => setOpen(false)
  });

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(ADMIN_CARD_MENU_OPEN_EVENT, { detail: menuKey }));
    const items = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    if (focusTargetRef.current && items?.length) {
      items[focusTargetRef.current === "first" ? 0 : items.length - 1].focus();
      focusTargetRef.current = null;
    }
    function closeOnScroll() { setOpen(false); }
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [menuKey, open]);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTargetRef.current = event.key === "ArrowDown" ? "first" : "last";
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
  }

  return { close, handleMenuKeyDown, handleTriggerKeyDown, open, rootRef, setOpen, triggerRef };
}
