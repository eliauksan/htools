import { RefObject, useEffect } from "react";

const KEYBOARD_OPEN_THRESHOLD = 120;

function isElementVisibleInViewport(
  element: HTMLElement,
  viewportTop: number,
  viewportBottom: number
) {
  const rect = element.getBoundingClientRect();
  return rect.top >= viewportTop && rect.bottom <= viewportBottom;
}

export function useVisualViewportKeyboard({
  active,
  containerRef
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;
    const viewport = window.visualViewport;

    if (!container || !viewport) {
      return;
    }

    const panel = container;
    const visualViewport = viewport;

    let frame = 0;
    let visibilityTimer: number | null = null;
    let baselineViewportBottom = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      viewport.height + viewport.offsetTop
    );
    let baselineViewportWidth = window.innerWidth;

    function ensureFocusedElementVisible() {
      const activeElement = document.activeElement;
      const visualViewportBottom =
        visualViewport.height + visualViewport.offsetTop;

      if (
        !(activeElement instanceof HTMLElement) ||
        !panel.contains(activeElement) ||
        isElementVisibleInViewport(
          activeElement,
          visualViewport.offsetTop,
          visualViewportBottom - 12
        )
      ) {
        return;
      }

      activeElement.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    function updateViewportMetrics() {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const viewportHeight = Math.round(visualViewport.height);
        const visualViewportBottom =
          visualViewport.height + visualViewport.offsetTop;
        const viewportWidthChanged =
          Math.abs(window.innerWidth - baselineViewportWidth) > 120;
        const layoutViewportResized =
          Math.abs(window.innerHeight - visualViewportBottom) < 2;

        if (viewportWidthChanged || layoutViewportResized) {
          baselineViewportBottom = Math.max(
            window.innerHeight,
            document.documentElement.clientHeight,
            visualViewportBottom
          );
          baselineViewportWidth = window.innerWidth;
        }

        const keyboardInset = Math.max(
          0,
          window.innerHeight - visualViewportBottom
        );
        const keyboardOcclusion = Math.max(
          0,
          baselineViewportBottom - visualViewportBottom
        );

        panel.style.setProperty(
          "--overlay-viewport-height",
          `${viewportHeight}px`
        );
        panel.style.setProperty(
          "--overlay-keyboard-inset",
          `${Math.round(keyboardInset)}px`
        );
        panel.toggleAttribute(
          "data-keyboard-open",
          keyboardOcclusion >= KEYBOARD_OPEN_THRESHOLD
        );

        if (visibilityTimer !== null) {
          window.clearTimeout(visibilityTimer);
        }
        visibilityTimer = window.setTimeout(() => {
          visibilityTimer = null;
          ensureFocusedElementVisible();
        }, 120);
      });
    }

    updateViewportMetrics();
    visualViewport.addEventListener("resize", updateViewportMetrics);
    visualViewport.addEventListener("scroll", updateViewportMetrics);
    window.addEventListener("resize", updateViewportMetrics);
    panel.addEventListener("focusin", updateViewportMetrics);

    return () => {
      visualViewport.removeEventListener("resize", updateViewportMetrics);
      visualViewport.removeEventListener("scroll", updateViewportMetrics);
      window.removeEventListener("resize", updateViewportMetrics);
      panel.removeEventListener("focusin", updateViewportMetrics);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (visibilityTimer !== null) {
        window.clearTimeout(visibilityTimer);
      }
      panel.style.removeProperty("--overlay-viewport-height");
      panel.style.removeProperty("--overlay-keyboard-inset");
      panel.removeAttribute("data-keyboard-open");
    };
  }, [active, containerRef]);
}
