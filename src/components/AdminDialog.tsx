import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import { getLastInputModality } from "../usePointerFocusRelease";
import { useVisualViewportKeyboard } from "../useVisualViewportKeyboard";
import { X } from "lucide-react";

const DIALOG_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

type DialogReturnFocusTarget = HTMLElement | (() => HTMLElement | null) | null;

let nextDialogReturnFocusTarget: DialogReturnFocusTarget = null;
const adminDialogStack: symbol[] = [];

type AdminDialogScrollLockSnapshot = {
  bodyLeft: string;
  bodyOverflow: string;
  bodyOverscroll: string;
  bodyPosition: string;
  bodyRight: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
  htmlOverscroll: string;
  htmlScrollBehavior: string;
  scrollY: number;
};

let adminDialogScrollLockCount = 0;
let adminDialogScrollLockSnapshot: AdminDialogScrollLockSnapshot | null = null;
let adminDialogScrollRestoreFrame: number | null = null;
let adminDialogPendingScrollBehavior = "";

function acquireAdminDialogScrollLock() {
  if (adminDialogScrollRestoreFrame !== null) {
    window.cancelAnimationFrame(adminDialogScrollRestoreFrame);
    adminDialogScrollRestoreFrame = null;
    document.documentElement.style.scrollBehavior = adminDialogPendingScrollBehavior;
    adminDialogPendingScrollBehavior = "";
  }

  adminDialogScrollLockCount += 1;
  if (adminDialogScrollLockCount > 1) return;

  const scrollY = window.scrollY;
  adminDialogScrollLockSnapshot = {
    bodyLeft: document.body.style.left,
    bodyOverflow: document.body.style.overflow,
    bodyOverscroll: document.body.style.overscrollBehavior,
    bodyPosition: document.body.style.position,
    bodyRight: document.body.style.right,
    bodyTop: document.body.style.top,
    bodyWidth: document.body.style.width,
    htmlOverflow: document.documentElement.style.overflow,
    htmlOverscroll: document.documentElement.style.overscrollBehavior,
    htmlScrollBehavior: document.documentElement.style.scrollBehavior,
    scrollY
  };

  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehavior = "none";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.left = "0";
  document.body.style.right = "0";
}

function releaseAdminDialogScrollLock() {
  adminDialogScrollLockCount = Math.max(0, adminDialogScrollLockCount - 1);
  if (adminDialogScrollLockCount > 0) return;

  const snapshot = adminDialogScrollLockSnapshot;
  adminDialogScrollLockSnapshot = null;
  if (!snapshot) return;

  document.documentElement.style.overflow = snapshot.htmlOverflow;
  document.documentElement.style.overscrollBehavior = snapshot.htmlOverscroll;
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.overscrollBehavior = snapshot.bodyOverscroll;
  document.body.style.position = snapshot.bodyPosition;
  document.body.style.top = snapshot.bodyTop;
  document.body.style.width = snapshot.bodyWidth;
  document.body.style.left = snapshot.bodyLeft;
  document.body.style.right = snapshot.bodyRight;
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo(0, snapshot.scrollY);

  adminDialogPendingScrollBehavior = snapshot.htmlScrollBehavior;
  adminDialogScrollRestoreFrame = window.requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = adminDialogPendingScrollBehavior;
    adminDialogPendingScrollBehavior = "";
    adminDialogScrollRestoreFrame = null;
  });
}

export function getDialogReturnFocusTarget(
  element: Element | null
): DialogReturnFocusTarget {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const categoryFilter = element.closest<HTMLElement>(".admin-category-filter");

  if (categoryFilter) {
    return () =>
      categoryFilter.querySelector<HTMLButtonElement>(
        ".admin-category-filter-trigger"
      );
  }

  const cardActions = element.closest<HTMLElement>(".admin-tool-card-actions");
  const cardMenuTrigger = cardActions?.querySelector<HTMLButtonElement>(
    ".admin-tool-menu-trigger"
  );

  return cardMenuTrigger ?? element;
}

export function rememberNextDialogReturnFocus(target: DialogReturnFocusTarget) {
  nextDialogReturnFocusTarget = target;
}

function consumeNextDialogReturnFocus() {
  const target = nextDialogReturnFocusTarget;
  nextDialogReturnFocusTarget = null;
  return target;
}

function resolveDialogReturnFocusTarget(target: DialogReturnFocusTarget) {
  return typeof target === "function" ? target() : target;
}

function getDialogFocusableElements(panel: HTMLElement) {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
  );
}

function getDialogInitialFocus(panel: HTMLElement) {
  const selectors = [
    "[data-dialog-initial-focus]",
    ".dialog-body input:not([disabled]):not([type='hidden'])",
    ".dialog-body textarea:not([disabled])",
    ".dialog-body select:not([disabled])",
    ".dialog-body [contenteditable='true']",
    ".dialog-body .admin-category-filter-trigger:not([disabled])",
    ".dialog-body [aria-pressed]:not([disabled])",
    ".dialog-footer button:not([disabled])",
    ".dialog-header button:not([disabled])"
  ];

  for (const selector of selectors) {
    const element = panel.querySelector<HTMLElement>(selector);

    if (element && element.getClientRects().length > 0) {
      return element;
    }
  }

  return panel;
}

export function Dialog({
  children,
  closeDisabled = false,
  closeLabel,
  closeRequestRef,
  description,
  descriptionId,
  footer,
  panelClassName = "",
  title,
  onClose
}: {
  children?: ReactNode;
  closeDisabled?: boolean;
  closeLabel: string;
  closeRequestRef?: { current: (() => void) | null };
  description?: ReactNode;
  descriptionId?: string;
  footer?: ReactNode;
  panelClassName?: string;
  title: string;
  onClose: () => void;
}) {
  const generatedDescriptionId = useId();
  const resolvedDescriptionId = description
    ? descriptionId ?? generatedDescriptionId
    : undefined;
  const titleId = resolvedDescriptionId
    ? `${resolvedDescriptionId}-title`
    : undefined;
  const panelRef = useRef<HTMLElement | null>(null);
  const dialogIdRef = useRef(Symbol("admin-dialog"));
  const returnFocusTargetRef = useRef<DialogReturnFocusTarget | undefined>(
    undefined
  );
  const restoreFocusOnCloseRef = useRef(true);

  if (returnFocusTargetRef.current === undefined) {
    restoreFocusOnCloseRef.current = getLastInputModality() === "keyboard";
    returnFocusTargetRef.current =
      consumeNextDialogReturnFocus() ??
      getDialogReturnFocusTarget(document.activeElement);
  }

  const drawerDrag = useRef({
    dragging: false,
    pointerId: -1,
    startY: 0,
    lastY: 0
  });
  const backdropClassName = panelClassName
    .split(" ")
    .filter(Boolean)
    .map((className) => `${className}-backdrop`)
    .join(" ");
  const isToolEditorDrawer = panelClassName.split(" ").includes("tool-editor-dialog");
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  function shouldAnimateClose() {
    return (
      isToolEditorDrawer &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 920px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function requestClose(force = false) {
    if (isClosing || (!force && closeDisabled)) return;

    if (!shouldAnimateClose()) {
      onClose();
      return;
    }

    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "";
      panel.style.transform = "";
    }

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, 280);
  }

  useEffect(() => {
    if (closeRequestRef) {
      closeRequestRef.current = () => requestClose(true);
    }

    return () => {
      if (closeRequestRef) closeRequestRef.current = null;
    };
  });

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    const dialogId = dialogIdRef.current;
    adminDialogStack.push(dialogId);
    const panel = panelRef.current;
    if (panel) {
      getDialogInitialFocus(panel).focus({ preventScroll: true });
    }

    return () => {
      const stackIndex = adminDialogStack.lastIndexOf(dialogId);
      if (stackIndex >= 0) {
        adminDialogStack.splice(stackIndex, 1);
      }
      const returnTarget = returnFocusTargetRef.current;
      window.requestAnimationFrame(() => {
        const element = resolveDialogReturnFocusTarget(returnTarget ?? null);
        const visibleDialogs = Array.from(
          document.querySelectorAll<HTMLElement>(".dialog-panel")
        );
        const topDialog = visibleDialogs.at(-1);

        if (adminDialogStack.length > 0 && topDialog) {
          if (
            restoreFocusOnCloseRef.current &&
            element?.isConnected &&
            topDialog.contains(element)
          ) {
            element.focus({ preventScroll: true });
          } else if (!topDialog.contains(document.activeElement)) {
            getDialogInitialFocus(topDialog).focus({ preventScroll: true });
          }
          return;
        }

        if (restoreFocusOnCloseRef.current && element?.isConnected) {
          element.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  useEffect(() => {
    acquireAdminDialogScrollLock();
    return releaseAdminDialogScrollLock;
  }, []);

  useVisualViewportKeyboard({
    active: !isToolEditorDrawer,
    containerRef: panelRef
  });

  function canDragDrawer() {
    return (
      isToolEditorDrawer &&
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches
    );
  }

  function resetDrawerPosition() {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    panel.style.transition = "transform 0.18s cubic-bezier(0.2, 0.82, 0.2, 1)";
    panel.style.transform = "translateY(0)";
    window.setTimeout(() => {
      panel.style.transition = "";
      panel.style.transform = "";
    }, 190);
  }

  function handleDrawerPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!canDragDrawer() || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const target = event.target as HTMLElement;

    if (
      target.closest(
        "button, a, input, textarea, select, [role='button'], [role='menuitem']"
      )
    ) {
      return;
    }

    drawerDrag.current = {
      dragging: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDrawerPointerMove(event: React.PointerEvent<HTMLElement>) {
    const state = drawerDrag.current;

    if (!state.dragging || state.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.max(0, event.clientY - state.startY);
    state.lastY = event.clientY;

    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    event.preventDefault();
    panel.style.transition = "none";
    panel.style.transform = `translateY(${distance}px)`;
  }

  function handleDrawerPointerEnd(event: React.PointerEvent<HTMLElement>) {
    const state = drawerDrag.current;

    if (!state.dragging || state.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.max(0, state.lastY - state.startY);
    drawerDrag.current.dragging = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const panel = panelRef.current;

    if (distance > 88 && panel) {
      requestClose();
      return;
    }

    resetDrawerPosition();
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (adminDialogStack.at(-1) !== dialogIdRef.current) {
      return;
    }

    restoreFocusOnCloseRef.current = true;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;
    const focusableElements = getDialogFocusableElements(panel);

    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus({ preventScroll: true });
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (
      event.shiftKey &&
      (activeElement === firstElement || !panel.contains(activeElement))
    ) {
      event.preventDefault();
      lastElement.focus();
    } else if (
      !event.shiftKey &&
      (activeElement === lastElement || !panel.contains(activeElement))
    ) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <div
      className={`dialog-backdrop ${backdropClassName} ${isClosing ? "is-closing" : ""}`}
      role="presentation"
      inert={isClosing}
      onMouseDown={() => requestClose()}
    >
      <section
        aria-describedby={resolvedDescriptionId}
        aria-label={resolvedDescriptionId ? undefined : title}
        aria-labelledby={titleId}
        ref={panelRef}
        className={`dialog-panel ${footer ? "has-dialog-footer" : "is-dialog-body-only"} ${panelClassName}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          className={`dialog-header ${isToolEditorDrawer ? "is-drawer-draggable" : ""}`}
          onPointerCancel={handleDrawerPointerEnd}
          onPointerDown={handleDrawerPointerDown}
          onPointerMove={handleDrawerPointerMove}
          onPointerUp={handleDrawerPointerEnd}
        >
          <span className="dialog-drawer-grip" aria-hidden="true" />
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" type="button"
            onClick={() => requestClose()}
            aria-label={closeLabel}
          >
            <X size={18} />
          </button>
        </header>
        <DialogCloseContext.Provider value={requestClose}>
          <div
            className={`dialog-body ${description ? "has-dialog-description" : ""}`.trim()}
          >
            {description ? (
              <p className="dialog-description" id={resolvedDescriptionId}>
                {description}
              </p>
            ) : null}
            {children}
          </div>
          {footer ? <footer className="dialog-footer">{footer}</footer> : null}
        </DialogCloseContext.Provider>
      </section>
    </div>
  );
}

export const DialogCloseContext = createContext<(() => void) | null>(null);

export function AdminDialogActions({
  closeLabel,
  disabled = false,
  formId,
  leading,
  onClose,
  onPrimary,
  primaryLabel
}: {
  closeLabel?: string;
  disabled?: boolean;
  formId?: string;
  leading?: ReactNode;
  onClose?: () => void;
  onPrimary?: () => void;
  primaryLabel: string;
}) {
  const dialogRequestClose = useContext(DialogCloseContext);
  const handleClose = dialogRequestClose ?? onClose;

  return (
    <>
      {leading}
      {closeLabel ? (
        <button className="ghost-button" disabled={disabled} type="button" onClick={handleClose}>
          {closeLabel}
        </button>
      ) : null}
      <button className="primary-button" disabled={disabled}
        form={formId}
        type={formId ? "submit" : "button"}
        onClick={onPrimary}
      >
        {primaryLabel}
      </button>
    </>
  );
}

export function AdminConfirmDialog({
  cancelLabel,
  closeLabel,
  confirmLabel,
  description,
  descriptionId,
  disabled = false,
  onCancel,
  onConfirm,
  title
}: {
  cancelLabel: string;
  closeLabel?: string;
  confirmLabel: string;
  description: string;
  descriptionId: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <Dialog
      closeDisabled={disabled}
      closeLabel={closeLabel ?? cancelLabel}
      description={description}
      descriptionId={descriptionId}
      onClose={onCancel}
      panelClassName="tool-editor-dialog admin-action-dialog admin-confirm-dialog"
      title={title}
      footer={
        <AdminDialogActions
          closeLabel={cancelLabel}
          disabled={disabled}
          onClose={onCancel}
          onPrimary={onConfirm}
          primaryLabel={confirmLabel}
        />
      }
    />
  );
}

